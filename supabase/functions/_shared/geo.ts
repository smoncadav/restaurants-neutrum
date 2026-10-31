import { adminClient } from './supabase.ts'

export interface SearchParams {
  lat: number
  lng: number
  radius_km?: number
  health_goal?: string
  page?: number
  limit?: number
}

export async function searchRestaurantsByLocation(params: SearchParams) {
  const { lat, lng, radius_km = 10, health_goal, page = 1, limit = 20 } = params
  const offset = (page - 1) * limit
  const supabase = adminClient()

  const { data, error } = await supabase.rpc('search_restaurants_by_location', {
    lat,
    lng,
    radius_km,
    health_goal: health_goal ?? null,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) throw new Error(error.message)
  return { restaurants: data ?? [], meta: { page, limit } }
}
