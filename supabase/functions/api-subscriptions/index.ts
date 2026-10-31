import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { validateApiKey } from '../_shared/api-auth.ts'
import { adminClient } from '../_shared/supabase.ts'
import { getPaymentProvider } from '../_shared/payments/index.ts'

// POST /functions/v1/api-subscriptions — create subscription
// GET  /functions/v1/api-subscriptions?id=<uuid> — get subscription
// PATCH /functions/v1/api-subscriptions?id=<uuid> — pause/cancel/resume
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const auth = await validateApiKey(req)
  if (!auth.valid) return auth.response

  const supabase = adminClient()
  const id = new URL(req.url).searchParams.get('id')

  if (req.method === 'GET') {
    if (!id) return errorResponse('Missing id param', 400)
    const { data, error } = await supabase.from('subscriptions').select('*').eq('id', id).single()
    if (error || !data) return errorResponse('Subscription not found', 404)
    return jsonResponse(data)
  }

  if (req.method === 'PATCH') {
    if (!id) return errorResponse('Missing id param', 400)
    let body: Record<string, unknown>
    try { body = await req.json() } catch { return errorResponse('Invalid JSON', 400) }

    const statusMap: Record<string, string> = { pause: 'paused', cancel: 'cancelled', resume: 'active' }
    const newStatus = statusMap[body.action as string]
    if (!newStatus) return errorResponse('action must be pause, cancel, or resume', 422)

    const { data, error } = await supabase.from('subscriptions').update({ status: newStatus }).eq('id', id).select().single()
    if (error || !data) return errorResponse(error?.message ?? 'Not found', 404)
    return jsonResponse(data)
  }

  if (req.method === 'POST') {
    let body: Record<string, unknown>
    try { body = await req.json() } catch { return errorResponse('Invalid JSON body', 400) }

    const { menu_id, external_customer_ref, frequency } = body
    if (!menu_id || !external_customer_ref || !frequency) return errorResponse('Missing required fields', 422)

    const { data: menu } = await supabase.from('menus').select('price, restaurant_id, purchase_type').eq('id', menu_id).single()
    if (!menu || !['subscription', 'both'].includes((menu as { purchase_type: string }).purchase_type)) {
      return errorResponse('Menu not found or does not support subscriptions', 404)
    }

    const { data: restaurant } = await supabase.from('restaurants').select('*').eq('id', (menu as { restaurant_id: string }).restaurant_id).eq('status', 'active').single()
    if (!restaurant) return errorResponse('Restaurant not found or inactive', 404)

    try {
      const provider = await getPaymentProvider(restaurant.payment_provider)
      const result = await provider.createSubscription({
        restaurantId: restaurant.id,
        menuId: menu_id as string,
        externalCustomerRef: external_customer_ref as string,
        unitPrice: Math.round((menu as { price: number }).price * 100),
        currency: restaurant.currency,
        frequency: frequency as 'weekly' | 'biweekly' | 'monthly',
      })

      return jsonResponse({
        id: result.subscriptionId,
        external_customer_ref,
        menu_id,
        frequency,
        status: 'active',
        payment_provider: restaurant.payment_provider,
        checkout_url: result.checkoutUrl,
        next_delivery_date: null,
        created_at: new Date().toISOString(),
      }, 201)
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : 'Subscription error', 500)
    }
  }

  return errorResponse('Method not allowed', 405)
})
