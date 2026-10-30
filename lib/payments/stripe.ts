import Stripe from 'stripe'
import type { PaymentProvider } from './index'
import type {
  CreateOrderParams,
  CreateSubParams,
  OnboardingUrl,
  PaymentResult,
  SubResult,
  WebhookEvent,
} from '@/types/payments'
import { getActiveCommission, calculateCommission } from './index'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-10-28.endive',
})

// Intervales de Stripe para suscripciones
const FREQUENCY_MAP: Record<string, { interval: Stripe.PriceCreateParams.Recurring.Interval; interval_count: number }> = {
  weekly:   { interval: 'week',  interval_count: 1 },
  biweekly: { interval: 'week',  interval_count: 2 },
  monthly:  { interval: 'month', interval_count: 1 },
}

export class StripeProvider implements PaymentProvider {
  async createOrder(params: CreateOrderParams): Promise<PaymentResult> {
    const supabase = await this.getServiceClient()

    // Obtener stripe_account_id del restaurante
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('stripe_account_id, currency')
      .eq('id', params.restaurantId)
      .single()

    if (!restaurant?.stripe_account_id) {
      throw new Error('Restaurant has no Stripe account connected')
    }

    const commission = await getActiveCommission()
    const totalAmount = params.unitPrice * params.quantity
    const commissionAmount = calculateCommission(totalAmount, commission)

    // Stripe trabaja en centavos (menor unidad de la moneda)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,          // ya debe venir en centavos
      currency: params.currency.toLowerCase(),
      application_fee_amount: commissionAmount,
      transfer_data: {
        destination: restaurant.stripe_account_id,
      },
      metadata: {
        restaurant_id: params.restaurantId,
        menu_id: params.menuId,
        external_customer_ref: params.externalCustomerRef,
        ...params.metadata,
      },
    })

    // Crear orden en BD
    const { data: order } = await supabase
      .from('orders')
      .insert({
        external_customer_ref: params.externalCustomerRef,
        restaurant_id: params.restaurantId,
        menu_id: params.menuId,
        quantity: params.quantity,
        unit_price: params.unitPrice,
        total_amount: totalAmount,
        commission_amount: commissionAmount,
        currency: params.currency,
        status: 'pending',
        payment_provider: 'stripe',
        stripe_payment_intent_id: paymentIntent.id,
        delivery_address: params.deliveryAddress as never,
      })
      .select('id')
      .single()

    return {
      provider: 'stripe',
      orderId: order!.id,
      providerPaymentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret ?? undefined,
      status: 'requires_action',
      commissionAmount,
    }
  }

  async createSubscription(params: CreateSubParams): Promise<SubResult> {
    const supabase = await this.getServiceClient()

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('stripe_account_id')
      .eq('id', params.restaurantId)
      .single()

    if (!restaurant?.stripe_account_id) {
      throw new Error('Restaurant has no Stripe account connected')
    }

    const commission = await getActiveCommission()
    const commissionAmount = calculateCommission(params.unitPrice, commission)

    const freqConfig = FREQUENCY_MAP[params.frequency]

    // Crear producto + precio efímeros en la cuenta conectada
    const price = await stripe.prices.create(
      {
        unit_amount: params.unitPrice,
        currency: params.currency.toLowerCase(),
        recurring: freqConfig,
        product_data: { name: `Subscription menu ${params.menuId}` },
      },
      { stripeAccount: restaurant.stripe_account_id }
    )

    // Crear suscripción con application_fee_percent
    const subscription = await stripe.subscriptions.create(
      {
        customer: params.externalCustomerRef, // en Stripe, usar customer ID externo
        items: [{ price: price.id }],
        application_fee_percent: commission.type === 'percentage' ? commission.value : undefined,
        metadata: {
          menu_id: params.menuId,
          external_customer_ref: params.externalCustomerRef,
          ...params.metadata,
        },
      },
      { stripeAccount: restaurant.stripe_account_id }
    )

    const { data: sub } = await supabase
      .from('subscriptions')
      .insert({
        external_customer_ref: params.externalCustomerRef,
        menu_id: params.menuId,
        frequency: params.frequency,
        status: 'active',
        payment_provider: 'stripe',
        stripe_subscription_id: subscription.id,
      })
      .select('id')
      .single()

    return {
      provider: 'stripe',
      subscriptionId: sub!.id,
      providerSubscriptionId: subscription.id,
      status: 'active',
    }
  }

  async handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent> {
    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(
        payload as string | Buffer,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch {
      throw new Error('Invalid Stripe webhook signature')
    }

    const supabase = await this.getServiceClient()

    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        await supabase
          .from('orders')
          .update({ status: 'confirmed' })
          .eq('stripe_payment_intent_id', pi.id)

        return {
          type: 'payment.succeeded',
          provider: 'stripe',
          providerEventId: event.id,
          providerPaymentId: pi.id,
        }
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        await supabase
          .from('orders')
          .update({ status: 'cancelled' })
          .eq('stripe_payment_intent_id', pi.id)

        return {
          type: 'payment.failed',
          provider: 'stripe',
          providerEventId: event.id,
          providerPaymentId: pi.id,
        }
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled' })
          .eq('stripe_subscription_id', sub.id)

        return {
          type: 'subscription.cancelled',
          provider: 'stripe',
          providerEventId: event.id,
          providerSubscriptionId: sub.id,
        }
      }

      default:
        return {
          type: 'payment.succeeded', // fallback — no procesamos
          provider: 'stripe',
          providerEventId: event.id,
        }
    }
  }

  async onboardRestaurant(restaurantId: string): Promise<OnboardingUrl> {
    const supabase = await this.getServiceClient()

    // Reutilizar account existente si ya fue creado
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('stripe_account_id')
      .eq('id', restaurantId)
      .single()

    let accountId = restaurant?.stripe_account_id

    if (!accountId) {
      const account = await stripe.accounts.create({
        metadata: { restaurant_id: restaurantId },
      })
      accountId = account.id

      await supabase
        .from('restaurants')
        .update({ stripe_account_id: accountId })
        .eq('id', restaurantId)
    }

    // Account Session para Embedded Components (Stripe maneja KYC y compliance)
    const session = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: { enabled: true },
      },
    })

    // Retornamos el client_secret — el frontend lo usa con @stripe/connect-js
    return { url: session.client_secret, provider: 'stripe' }
  }

  /** Crea una Account Session con account_management habilitado */
  async createManagementSession(restaurantId: string): Promise<string> {
    const supabase = await this.getServiceClient()

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('stripe_account_id')
      .eq('id', restaurantId)
      .single()

    if (!restaurant?.stripe_account_id) {
      throw new Error('Restaurant has no Stripe account connected')
    }

    const session = await stripe.accountSessions.create({
      account: restaurant.stripe_account_id,
      components: {
        account_management: { enabled: true },
      },
    })

    return session.client_secret
  }

  private async getServiceClient() {
    const { createServiceClient } = await import('@/lib/supabase/server')
    return createServiceClient()
  }
}
