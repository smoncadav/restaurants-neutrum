import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/supabase/api-auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiError } from '@/types/api'

type Params = { params: Promise<{ id: string }> }

// GET /api/v1/restaurants/:id/menus?purchase_type=&health_goal=
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await validateApiKey(request)
  if (!auth.valid) return auth.response

  const { id: restaurantId } = await params
  const { searchParams } = new URL(request.url)
  const purchaseType = searchParams.get('purchase_type')
  const healthGoal = searchParams.get('health_goal')

  const supabase = await createServiceClient()

  let query = supabase
    .from('menus')
    .select(`
      id, restaurant_id, name, description, price, images,
      status, purchase_type, serves_people, prep_time_minutes, created_at,
      menu_health_goals (goal)
    `)
    .eq('restaurant_id', restaurantId)
    .eq('status', 'active')

  if (purchaseType) {
    query = query.or(`purchase_type.eq.${purchaseType},purchase_type.eq.both`)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json<ApiError>({ error: error.message }, { status: 500 })
  }

  // Filtrar por health_goal si se especificó
  let menus = (data ?? []).map((m) => ({
    ...m,
    health_goals: (m.menu_health_goals as { goal: string }[]).map((g) => g.goal),
    menu_health_goals: undefined,
  }))

  if (healthGoal) {
    menus = menus.filter((m) => m.health_goals.includes(healthGoal))
  }

  return NextResponse.json({ menus })
}
