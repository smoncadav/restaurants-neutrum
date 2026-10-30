import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/supabase/api-auth'
import { createServiceClient } from '@/lib/supabase/server'
import { getPaymentProvider } from '@/lib/payments'
import { z } from 'zod'
import type { ApiError, SubscriptionResponse } from '@/types/api'

const CreateSubSchema = z.object({
  menu_id: z.string().uuid(),
  external_customer_ref: z.string().min(1),
  frequency: z.enum(['weekly', 'biweekly', 'monthly']),
})

// POST /api/v1/subscriptions
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request)
  if (!auth.valid) return auth.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiError>({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CreateSubSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const input = parsed.data
  const supabase = await createServiceClient()

  // Obtener el menú y el restaurante asociado
  const { data: menu } = await supabase
    .from('menus')
    .select('price, restaurant_id, purchase_type')
    .eq('id', input.menu_id)
    .in('purchase_type', ['subscription', 'both'])
    .single()

  if (!menu) {
    return NextResponse.json<ApiError>(
      { error: 'Menu not found or does not support subscriptions' },
      { status: 404 }
    )
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', menu.restaurant_id)
    .eq('status', 'active')
    .single()

  if (!restaurant) {
    return NextResponse.json<ApiError>({ error: 'Restaurant not found or inactive' }, { status: 404 })
  }

  try {
    const provider = await getPaymentProvider(restaurant)

    const result = await provider.createSubscription({
      restaurantId: restaurant.id,
      menuId: input.menu_id,
      externalCustomerRef: input.external_customer_ref,
      unitPrice: Math.round(menu.price * 100),
      currency: restaurant.currency,
      frequency: input.frequency,
    })

    const response: SubscriptionResponse = {
      id: result.subscriptionId,
      external_customer_ref: input.external_customer_ref,
      menu_id: input.menu_id,
      frequency: input.frequency,
      status: result.status === 'active' ? 'active' : 'active',
      payment_provider: restaurant.payment_provider,
      checkout_url: result.checkoutUrl,
      next_delivery_date: null,
      created_at: new Date().toISOString(),
    }

    return NextResponse.json(response, { status: 201 })
  } catch (err) {
    return NextResponse.json<ApiError>(
      { error: err instanceof Error ? err.message : 'Subscription error' },
      { status: 500 }
    )
  }
}
