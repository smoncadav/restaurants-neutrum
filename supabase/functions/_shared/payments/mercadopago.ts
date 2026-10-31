import { MercadoPagoConfig, Payment, Preference, PreApproval } from 'npm:mercadopago@3'
import { adminClient } from '../supabase.ts'
import type { PaymentProvider, CreateOrderParams, CreateSubParams, PaymentResult, SubResult, WebhookEvent } from './index.ts'
import { getActiveCommission, calculateCommission } from './index.ts'

const MP_CLIENT_ID = Deno.env.get('MERCADOPAGO_CLIENT_ID')!
const MP_ACCESS_TOKEN = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN')!
const APP_URL = Deno.env.get('NEXT_PUBLIC_APP_URL')!

const FREQUENCY_MAP: Record<string, { frequency: number; frequency_type: 'days' | 'months' }> = {
  weekly:   { frequency: 7,  frequency_type: 'days' },
  biweekly: { frequency: 14, frequency_type: 'days' },
  monthly:  { frequency: 1,  frequency_type: 'months' },
}

async function getRestaurantMpToken(restaurantId: string): Promise<string> {
  const supabase = adminClient()
  const { data } = await supabase.from('restaurants').select('mp_user_id').eq('id', restaurantId).single()
  if (!data?.mp_user_id) throw new Error('Restaurant has no MercadoPago account connected')
  const token = Deno.env.get(`MP_TOKEN_${data.mp_user_id}`)
  if (!token) throw new Error(`MercadoPago token not found for restaurant ${restaurantId}`)
  return token
}

export class MercadoPagoProvider implements PaymentProvider {
  async createOrder(params: CreateOrderParams): Promise<PaymentResult> {
    const supabase = adminClient()
    await getRestaurantMpToken(params.restaurantId) // verify connected

    const commission = await getActiveCommission()
    const totalAmount = params.unitPrice * params.quantity
    const commissionAmount = calculateCommission(totalAmount, commission)

    const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN })
    const preferenceClient = new Preference(mp)

    const preference = await preferenceClient.create({
      body: {
        items: [{ id: params.menuId, title: 'Meal Kit Order', quantity: params.quantity, unit_price: params.unitPrice / 100, currency_id: params.currency }],
        marketplace_fee: commissionAmount / 100,
        back_urls: {
          success: `${APP_URL}/checkout/success`,
          failure: `${APP_URL}/checkout/failure`,
          pending: `${APP_URL}/checkout/pending`,
        },
        auto_return: 'approved',
        metadata: { restaurant_id: params.restaurantId, menu_id: params.menuId, external_customer_ref: params.externalCustomerRef },
      },
    })

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
        payment_provider: 'mercadopago',
        mp_preference_id: preference.id,
        delivery_address: params.deliveryAddress,
      })
      .select('id')
      .single()

    return {
      provider: 'mercadopago',
      orderId: order!.id,
      providerPaymentId: preference.id!,
      redirectUrl: preference.init_point ?? undefined,
      status: 'requires_action',
      commissionAmount,
    }
  }

  async createSubscription(params: CreateSubParams): Promise<SubResult> {
    const supabase = adminClient()
    const restaurantToken = await getRestaurantMpToken(params.restaurantId)
    const freqConfig = FREQUENCY_MAP[params.frequency]

    const mp = new MercadoPagoConfig({ accessToken: restaurantToken })
    const preApprovalClient = new PreApproval(mp)

    const preapproval = await preApprovalClient.create({
      body: {
        reason: 'Meal Kit Subscription',
        auto_recurring: {
          frequency: freqConfig.frequency,
          frequency_type: freqConfig.frequency_type,
          transaction_amount: params.unitPrice / 100,
          currency_id: params.currency,
        },
        back_url: `${APP_URL}/checkout/subscription`,
        status: 'pending',
      },
    })

    const { data: sub } = await supabase
      .from('subscriptions')
      .insert({
        external_customer_ref: params.externalCustomerRef,
        menu_id: params.menuId,
        frequency: params.frequency,
        status: 'active',
        payment_provider: 'mercadopago',
        mp_preapproval_id: preapproval.id,
      })
      .select('id')
      .single()

    return {
      provider: 'mercadopago',
      subscriptionId: sub!.id,
      providerSubscriptionId: preapproval.id!,
      checkoutUrl: preapproval.init_point ?? undefined,
      status: 'pending_approval',
    }
  }

  async handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent> {
    if (!signature) throw new Error('Missing MercadoPago signature')
    const supabase = adminClient()
    const body = payload as { type?: string; data?: { id?: string } }
    const eventType = body?.type
    const paymentId = body?.data?.id

    if (eventType === 'payment' && paymentId) {
      const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN })
      const paymentClient = new Payment(mp)
      const payment = await paymentClient.get({ id: paymentId })

      if (payment.status === 'approved') {
        await supabase.from('orders').update({ status: 'confirmed', mp_payment_id: String(paymentId) })
          .eq('mp_preference_id', payment.order?.id ? String(payment.order.id) : '')
        return { type: 'payment.succeeded', provider: 'mercadopago', providerEventId: String(paymentId), providerPaymentId: String(paymentId) }
      }

      if (payment.status === 'rejected' || payment.status === 'cancelled') {
        await supabase.from('orders').update({ status: 'cancelled' })
          .eq('mp_preference_id', payment.order?.id ? String(payment.order.id) : '')
        return { type: 'payment.failed', provider: 'mercadopago', providerEventId: String(paymentId), providerPaymentId: String(paymentId) }
      }
    }

    if (eventType === 'subscription_preapproval' && paymentId) {
      const mp = new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN })
      const preApprovalClient = new PreApproval(mp)
      const preapproval = await preApprovalClient.get({ id: String(paymentId) })
      if (preapproval.status === 'authorized') {
        await supabase.from('subscriptions').update({ status: 'active' }).eq('mp_preapproval_id', String(paymentId))
        return { type: 'subscription.activated', provider: 'mercadopago', providerEventId: String(paymentId), providerSubscriptionId: String(paymentId) }
      }
    }

    return { type: 'payment.succeeded', provider: 'mercadopago', providerEventId: String(paymentId ?? 'unknown') }
  }

  async onboardRestaurant(restaurantId: string): Promise<{ url: string; provider: string }> {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: MP_CLIENT_ID,
      redirect_uri: `${APP_URL}/functions/v1/mp-oauth-callback`,
      state: restaurantId,
    })
    return { url: `https://auth.mercadopago.com/authorization?${params.toString()}`, provider: 'mercadopago' }
  }
}
