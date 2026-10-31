import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { validateApiKey } from '../_shared/api-auth.ts'
import { adminClient } from '../_shared/supabase.ts'

// Expects: /functions/v1/api-restaurant-menus?restaurant_id=<uuid>&purchase_type=&health_goal=
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()
  if (req.method !== 'GET') return errorResponse('Method not allowed', 405)

  const auth = await validateApiKey(req)
  if (!auth.valid) return auth.response

  const url = new URL(req.url)
  const restaurantId = url.searchParams.get('restaurant_id')
  if (!restaurantId) return errorResponse('Missing restaurant_id param', 400)

  const purchaseType = url.searchParams.get('purchase_type')
  const healthGoal = url.searchParams.get('health_goal')

  const supabase = adminClient()

  let query = supabase
    .from('menus')
    .select(`id, restaurant_id, name, description, price, images, status, purchase_type, serves_people, prep_time_minutes, created_at, menu_health_goals (goal)`)
    .eq('restaurant_id', restaurantId)
    .eq('status', 'active')

  if (purchaseType) {
    query = query.or(`purchase_type.eq.${purchaseType},purchase_type.eq.both`)
  }

  const { data, error } = await query
  if (error) return errorResponse(error.message, 500)

  let menus = (data ?? []).map((m: Record<string, unknown>) => ({
    ...m,
    health_goals: ((m.menu_health_goals as { goal: string }[]) ?? []).map((g) => g.goal),
    menu_health_goals: undefined,
  }))

  if (healthGoal) {
    menus = menus.filter((m) => (m.health_goals as string[]).includes(healthGoal))
  }

  return jsonResponse({ menus })
})
