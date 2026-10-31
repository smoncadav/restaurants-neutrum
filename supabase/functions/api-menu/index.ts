import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { validateApiKey } from '../_shared/api-auth.ts'
import { adminClient } from '../_shared/supabase.ts'

// Expects: /functions/v1/api-menu?id=<uuid>
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()
  if (req.method !== 'GET') return errorResponse('Method not allowed', 405)

  const auth = await validateApiKey(req)
  if (!auth.valid) return auth.response

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return errorResponse('Missing id param', 400)

  const supabase = adminClient()
  const { data, error } = await supabase
    .from('menus')
    .select(`id, restaurant_id, name, description, price, images, status, purchase_type, serves_people, prep_time_minutes, created_at, menu_health_goals (goal), menu_nutrition (calories_per_serving, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, allergens)`)
    .eq('id', id)
    .single()

  if (error || !data) return errorResponse('Menu not found', 404)

  const result = {
    ...data,
    health_goals: ((data.menu_health_goals as { goal: string }[]) ?? []).map((g) => g.goal),
    nutrition: Array.isArray(data.menu_nutrition) ? (data.menu_nutrition[0] ?? null) : data.menu_nutrition,
    menu_health_goals: undefined,
    menu_nutrition: undefined,
  }

  return jsonResponse(result)
})
