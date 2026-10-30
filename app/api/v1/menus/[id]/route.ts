import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/supabase/api-auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiError } from '@/types/api'

type Params = { params: Promise<{ id: string }> }

// GET /api/v1/menus/:id — incluye nutrición completa
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await validateApiKey(request)
  if (!auth.valid) return auth.response

  const { id } = await params
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('menus')
    .select(`
      id, restaurant_id, name, description, price, images,
      status, purchase_type, serves_people, prep_time_minutes, created_at,
      menu_health_goals (goal),
      menu_nutrition (
        calories_per_serving, protein_g, carbs_g, fat_g,
        fiber_g, sugar_g, sodium_mg, allergens
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json<ApiError>({ error: 'Menu not found' }, { status: 404 })
  }

  const result = {
    ...data,
    health_goals: (data.menu_health_goals as { goal: string }[]).map((g) => g.goal),
    nutrition: Array.isArray(data.menu_nutrition)
      ? (data.menu_nutrition[0] ?? null)
      : data.menu_nutrition,
    menu_health_goals: undefined,
    menu_nutrition: undefined,
  }

  return NextResponse.json(result)
}
