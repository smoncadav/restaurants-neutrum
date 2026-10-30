import type { Restaurant } from '@/types/database'
import type {
  CreateOrderParams,
  CreateSubParams,
  OnboardingUrl,
  PaymentResult,
  SubResult,
  WebhookEvent,
} from '@/types/payments'

// ----------------------------------------------------------------
// Interfaz de abstracción de pagos
// ----------------------------------------------------------------

export interface PaymentProvider {
  /** Crea una orden de pago (compra única) */
  createOrder(params: CreateOrderParams): Promise<PaymentResult>

  /** Crea una suscripción recurrente */
  createSubscription(params: CreateSubParams): Promise<SubResult>

  /** Procesa un webhook entrante del provider */
  handleWebhook(payload: unknown, signature: string): Promise<WebhookEvent>

  /** Genera URL de onboarding para que el restaurante conecte su cuenta */
  onboardRestaurant(restaurantId: string): Promise<OnboardingUrl>
}

// ----------------------------------------------------------------
// Factory: elige el provider según el restaurante
// ----------------------------------------------------------------

export async function getPaymentProvider(
  restaurant: Restaurant
): Promise<PaymentProvider> {
  if (restaurant.payment_provider === 'stripe') {
    const { StripeProvider } = await import('./stripe')
    return new StripeProvider()
  }

  if (restaurant.payment_provider === 'mercadopago') {
    const { MercadoPagoProvider } = await import('./mercadopago')
    return new MercadoPagoProvider()
  }

  throw new Error(`Unknown payment provider: ${restaurant.payment_provider}`)
}

// ----------------------------------------------------------------
// Helper: obtener la comisión activa desde la BD
// ----------------------------------------------------------------

export async function getActiveCommission(): Promise<{
  type: 'percentage' | 'flat'
  value: number
}> {
  const { createServiceClient } = await import('@/lib/supabase/server')
  const supabase = await createServiceClient()

  const { data } = await supabase
    .from('commission_config')
    .select('type, value')
    .order('effective_from', { ascending: false })
    .limit(1)
    .single()

  return data ?? { type: 'percentage', value: 10 }
}

/** Calcula el monto de comisión dado un total */
export function calculateCommission(
  totalAmount: number,
  config: { type: 'percentage' | 'flat'; value: number }
): number {
  if (config.type === 'percentage') {
    return Math.round((totalAmount * config.value) / 100)
  }
  return config.value
}
