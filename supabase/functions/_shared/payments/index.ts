import { adminClient } from '../supabase.ts'

export interface CreateOrderParams {
  restaurantId: string
  menuId: string
  externalCustomerRef: string
  quantity: number
  unitPrice: number
  currency: string
  deliveryAddress: Record<string, unknown>
  metadata?: Record<string, string>
}

export interface CreateSubParams {
  restaurantId: string
  menuId: string
  externalCustomerRef: string
  unitPrice: number
  currency: string
  frequency: 'weekly' | 'biweekly' | 'monthly'
  metadata?: Record<string, string>
}

export interface PaymentResult {
  provider: string
  orderId: string
  providerPaymentId: string
  clientSecret?: string
  redirectUrl?: string
  status: string
  commissionAmount: number
}

export interface SubResult {
  provider: string
  subscriptionId: string
  providerSubscriptionId: string
  checkoutUrl?: string
  status: string
}

export interface WebhookEvent {
  type: string
  provider: string
  providerEventId: string
  providerPaymentId?: string
  providerSubscriptionId?: string
}

export interface PaymentProvider {
  createOrder(params: CreateOrderParams): Promise<PaymentResult>
  createSubscription(params: CreateSubParams): Promise<SubResult>
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent>
  onboardRestaurant(restaurantId: string): Promise<{ url: string; provider: string }>
}

export async function getActiveCommission(): Promise<{ type: 'percentage' | 'flat'; value: number }> {
  const supabase = adminClient()
  const { data } = await supabase
    .from('commission_config')
    .select('type, value')
    .order('effective_from', { ascending: false })
    .limit(1)
    .single()

  return (data as { type: 'percentage' | 'flat'; value: number } | null) ?? { type: 'percentage', value: 10 }
}

export function calculateCommission(
  totalAmount: number,
  config: { type: 'percentage' | 'flat'; value: number }
): number {
  if (config.type === 'percentage') {
    return Math.round((totalAmount * config.value) / 100)
  }
  return config.value
}

export async function getPaymentProvider(restaurantProvider: string): Promise<PaymentProvider> {
  if (restaurantProvider === 'stripe') {
    const { StripeProvider } = await import('./stripe.ts')
    return new StripeProvider()
  }
  if (restaurantProvider === 'mercadopago') {
    const { MercadoPagoProvider } = await import('./mercadopago.ts')
    return new MercadoPagoProvider()
  }
  throw new Error(`Unknown payment provider: ${restaurantProvider}`)
}
