import type { PaymentProvider } from './database'

// ----------------------------------------------------------------
// Parámetros compartidos
// ----------------------------------------------------------------

export interface DeliveryAddress {
  street: string
  city: string
  state: string
  country: string
  zip_code?: string
  notes?: string
}

export interface CreateOrderParams {
  restaurantId: string
  menuId: string
  externalCustomerRef: string
  quantity: number
  unitPrice: number          // en la menor unidad (centavos) para Stripe; entero para MP
  currency: string
  deliveryAddress: DeliveryAddress
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

// ----------------------------------------------------------------
// Resultados
// ----------------------------------------------------------------

export interface PaymentResult {
  provider: PaymentProvider
  orderId: string             // ID interno (nuestra BD)
  providerPaymentId: string   // stripe PaymentIntent id / mp payment id
  clientSecret?: string       // Stripe: para confirmar en el cliente
  redirectUrl?: string        // MercadoPago: URL de checkout
  status: 'pending' | 'requires_action' | 'succeeded' | 'failed'
  commissionAmount: number
}

export interface SubResult {
  provider: PaymentProvider
  subscriptionId: string       // ID interno
  providerSubscriptionId: string
  checkoutUrl?: string          // MP Preapproval init_point
  status: 'active' | 'pending_approval'
}

export interface OnboardingUrl {
  url: string
  provider: PaymentProvider
}

// ----------------------------------------------------------------
// Webhooks
// ----------------------------------------------------------------

export type WebhookEventType =
  | 'payment.succeeded'
  | 'payment.failed'
  | 'subscription.activated'
  | 'subscription.cancelled'
  | 'subscription.paused'
  | 'refund.created'

export interface WebhookEvent {
  type: WebhookEventType
  provider: PaymentProvider
  providerEventId: string
  providerPaymentId?: string
  providerSubscriptionId?: string
  metadata?: Record<string, unknown>
}
