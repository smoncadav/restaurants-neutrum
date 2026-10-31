import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { getUserFromHeader, adminClient } from '../_shared/supabase.ts'
import { StripeProvider } from '../_shared/payments/stripe.ts'

// POST /functions/v1/stripe-account-session
// Creates an Account Session for ConnectAccountManagement embedded component
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const user = await getUserFromHeader(req.headers.get('Authorization'))
  if (!user) return errorResponse('Unauthorized', 401)

  let body: Record<string, unknown>
  try { body = await req.json() } catch { return errorResponse('Invalid JSON', 400) }

  const { restaurantId } = body
  if (!restaurantId) return errorResponse('Missing restaurantId', 422)

  const supabase = adminClient()
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, owner_id, payment_provider')
    .eq('id', restaurantId)
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) return errorResponse('Restaurant not found', 404)
  if (restaurant.payment_provider !== 'stripe') return errorResponse('Restaurant uses MercadoPago', 400)

  try {
    const provider = new StripeProvider()
    const clientSecret = await provider.createManagementSession(restaurantId as string)
    return jsonResponse({ clientSecret })
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Session error', 500)
  }
})
