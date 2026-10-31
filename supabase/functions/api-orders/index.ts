import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { validateApiKey } from '../_shared/api-auth.ts'
import { adminClient } from '../_shared/supabase.ts'
import { getPaymentProvider } from '../_shared/payments/index.ts'

// POST /functions/v1/api-orders — create order
// GET  /functions/v1/api-orders?id=<uuid> — get order
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const auth = await validateApiKey(req)
  if (!auth.valid) return auth.response

  const supabase = adminClient()
  const url = new URL(req.url)

  // GET order by id
  if (req.method === 'GET') {
    const id = url.searchParams.get('id')
    if (!id) return errorResponse('Missing id param', 400)
    const { data, error } = await supabase.from('orders').select('*').eq('id', id).single()
    if (error || !data) return errorResponse('Order not found', 404)
    return jsonResponse(data)
  }

  // POST create order
  if (req.method === 'POST') {
    let body: Record<string, unknown>
    try { body = await req.json() } catch { return errorResponse('Invalid JSON body', 400) }

    const { restaurant_id, menu_id, external_customer_ref, quantity = 1, delivery_address } = body

    if (!restaurant_id || !menu_id || !external_customer_ref || !delivery_address) {
      return errorResponse('Missing required fields', 422)
    }

    const { data: restaurant } = await supabase.from('restaurants').select('*').eq('id', restaurant_id).eq('status', 'active').single()
    if (!restaurant) return errorResponse('Restaurant not found or inactive', 404)

    const { data: menu } = await supabase.from('menus').select('price').eq('id', menu_id).eq('restaurant_id', restaurant_id).single()
    if (!menu) return errorResponse('Menu not found', 404)

    try {
      const provider = await getPaymentProvider(restaurant.payment_provider)
      const result = await provider.createOrder({
        restaurantId: restaurant_id as string,
        menuId: menu_id as string,
        externalCustomerRef: external_customer_ref as string,
        quantity: quantity as number,
        unitPrice: Math.round((menu as { price: number }).price * 100),
        currency: restaurant.currency,
        deliveryAddress: delivery_address as Record<string, unknown>,
      })

      return jsonResponse({
        id: result.orderId,
        external_customer_ref,
        restaurant_id,
        menu_id,
        quantity,
        total_amount: (menu as { price: number }).price * (quantity as number),
        currency: restaurant.currency,
        status: 'pending',
        payment_provider: restaurant.payment_provider,
        client_secret: result.clientSecret,
        redirect_url: result.redirectUrl,
        created_at: new Date().toISOString(),
      }, 201)
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : 'Payment error', 500)
    }
  }

  return errorResponse('Method not allowed', 405)
})
