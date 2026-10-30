import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/supabase/api-auth'
import { createServiceClient } from '@/lib/supabase/server'
import { getPaymentProvider } from '@/lib/payments'
import { z } from 'zod'
import type { ApiError, OrderResponse } from '@/types/api'

const CreateOrderSchema = z.object({
  restaurant_id: z.string().uuid(),
  menu_id: z.string().uuid(),
  external_customer_ref: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  delivery_address: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    state: z.string().min(1),
    country: z.string().min(1),
    zip_code: z.string().optional(),
    notes: z.string().optional(),
  }),
})

// POST /api/v1/orders
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request)
  if (!auth.valid) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiError>({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CreateOrderSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const input = parsed.data
  const supabase = await createServiceClient()

  // Obtener restaurante y menú
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', input.restaurant_id)
    .eq('status', 'active')
    .single()

  if (!restaurant) {
    return NextResponse.json<ApiError>({ error: 'Restaurant not found or inactive' }, { status: 404 })
  }

  const { data: menu } = await supabase
    .from('menus')
    .select('price, currency:restaurants(currency)')
    .eq('id', input.menu_id)
    .eq('restaurant_id', input.restaurant_id)
    .single()

  if (!menu) {
    return NextResponse.json<ApiError>({ error: 'Menu not found' }, { status: 404 })
  }

  try {
    const provider = await getPaymentProvider(restaurant)

    const result = await provider.createOrder({
      restaurantId: input.restaurant_id,
      menuId: input.menu_id,
      externalCustomerRef: input.external_customer_ref,
      quantity: input.quantity,
      unitPrice: Math.round(menu.price * 100), // convertir a centavos
      currency: restaurant.currency,
      deliveryAddress: input.delivery_address,
    })

    const response: OrderResponse = {
      id: result.orderId,
      external_customer_ref: input.external_customer_ref,
      restaurant_id: input.restaurant_id,
      menu_id: input.menu_id,
      quantity: input.quantity,
      total_amount: menu.price * input.quantity,
      currency: restaurant.currency,
      status: 'pending',
      payment_provider: restaurant.payment_provider,
      client_secret: result.clientSecret,
      redirect_url: result.redirectUrl,
      created_at: new Date().toISOString(),
    }

    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    return NextResponse.json<ApiError>(
      { error: err instanceof Error ? err.message : 'Payment error' },
      { status: 500 }
    )
  }
}
