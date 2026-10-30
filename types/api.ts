import type { HealthGoal, OrderStatus, PaymentProvider } from './database'
import type { DeliveryAddress } from './payments'

// ----------------------------------------------------------------
// Requests — API pública (plataforma externa)
// ----------------------------------------------------------------

export interface SearchRestaurantsQuery {
  lat: number
  lng: number
  radius_km?: number
  health_goal?: HealthGoal
  page?: number
  limit?: number
}

export interface CreateOrderRequest {
  restaurant_id: string
  menu_id: string
  external_customer_ref: string
  quantity: number
  delivery_address: DeliveryAddress
}

export interface CreateSubscriptionRequest {
  menu_id: string
  external_customer_ref: string
  frequency: 'weekly' | 'biweekly' | 'monthly'
}

export interface UpdateSubscriptionRequest {
  action: 'pause' | 'cancel' | 'resume'
}

// ----------------------------------------------------------------
// Responses
// ----------------------------------------------------------------

export interface ApiError {
  error: string
  code?: string
  details?: unknown
}

export interface PaginationMeta {
  page: number
  limit: number
  total?: number
}

export interface RestaurantListItem {
  id: string
  name: string
  description: string | null
  logo_url: string | null
  country_code: string
  currency: string
  distance_km: number
}

export interface RestaurantDetail extends RestaurantListItem {
  status: string
  payment_provider: PaymentProvider
  radius_km: number | null
  created_at: string
}

export interface MenuListItem {
  id: string
  restaurant_id: string
  name: string
  description: string | null
  price: number
  images: string[]
  status: string
  purchase_type: string
  serves_people: number | null
  prep_time_minutes: number | null
  health_goals: HealthGoal[]
}

export interface MenuDetail extends MenuListItem {
  nutrition: {
    calories_per_serving: number | null
    protein_g: number | null
    carbs_g: number | null
    fat_g: number | null
    fiber_g: number | null
    sugar_g: number | null
    sodium_mg: number | null
    allergens: string[]
  } | null
}

export interface OrderResponse {
  id: string
  external_customer_ref: string
  restaurant_id: string
  menu_id: string
  quantity: number
  total_amount: number
  currency: string
  status: OrderStatus
  payment_provider: PaymentProvider
  // Stripe
  client_secret?: string
  // MercadoPago
  redirect_url?: string
  created_at: string
}

export interface SubscriptionResponse {
  id: string
  external_customer_ref: string
  menu_id: string
  frequency: string
  status: string
  payment_provider: PaymentProvider
  checkout_url?: string
  next_delivery_date: string | null
  created_at: string
}
