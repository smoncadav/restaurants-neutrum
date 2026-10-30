import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/supabase/api-auth'
import { searchRestaurantsByLocation } from '@/lib/geo/coverage'
import { createServiceClient } from '@/lib/supabase/server'
import type { HealthGoal } from '@/types/database'
import type { ApiError } from '@/types/api'

// GET /api/v1/restaurants?lat=&lng=&radius_km=&health_goal=&page=&limit=
export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request)
  if (!auth.valid) return auth.response

  const { searchParams } = new URL(request.url)

  const lat = parseFloat(searchParams.get('lat') ?? '')
  const lng = parseFloat(searchParams.get('lng') ?? '')

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json<ApiError>(
      { error: 'lat and lng query params are required' },
      { status: 400 }
    )
  }

  try {
    const result = await searchRestaurantsByLocation({
      lat,
      lng,
      radius_km: searchParams.get('radius_km') ? parseFloat(searchParams.get('radius_km')!) : undefined,
      health_goal: (searchParams.get('health_goal') as HealthGoal) ?? undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
    })

    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json<ApiError>(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// POST /api/v1/restaurants — solo admin puede crear desde la API pública (o desde dashboard)
export async function POST(request: NextRequest) {
  const auth = await validateApiKey(request)
  if (!auth.valid) return auth.response

  try {
    const body = await request.json()
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('restaurants')
      .insert(body)
      .select()
      .single()

    if (error) {
      return NextResponse.json<ApiError>({ error: error.message }, { status: 400 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (err) {
    return NextResponse.json<ApiError>(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}
