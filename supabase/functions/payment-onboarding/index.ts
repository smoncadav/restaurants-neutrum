import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getUserFromHeader, adminClient } from '../_shared/supabase.ts'
import { getPaymentProvider } from '../_shared/payments/index.ts'

// POST /functions/v1/payment-onboarding
// Stripe: returns client_secret for Embedded Components
// MercadoPago: returns url for OAuth redirect
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const user = await getUserFromHeader(req.headers.get('Authorization'))
  if (!user) return errorResponse('Unauthorized', 401)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return errorResponse('Invalid JSON', 400) }

  const { restaurantId } = body
  if (!restaurantId) return errorResponse('Missing restaurantId', 422)

  // Verify restaurant belongs to user (use user-scoped query)
  const supabase = adminClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) return errorResponse('Restaurant not found', 404)

  try {
    const provider = await getPaymentProvider(restaurant)
    const result = await provider.onboardRestaurant(restaurantId as string)

    if (restaurant.payment_provider === 'stripe') {
      return jsonResponse({ clientSecret: result.url })
    }

    return jsonResponse({ url: result.url })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Onboarding error', 500)
  }
})
