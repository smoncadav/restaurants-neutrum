import { createServiceClient } from '@/lib/supabase/server'
import type { RestaurantListItem } from '@/types/api'
import type { HealthGoal } from '@/types/database'

export interface SearchParams {
  lat: number
  lng: number
  radius_km?: number
  health_goal?: HealthGoal
  page?: number
  limit?: number
}

export interface SearchResult {
  restaurants: RestaurantListItem[]
  meta: { page: number; limit: number }
}

/**
 * Busca restaurantes activos dentro de un radio geográfico usando PostGIS.
 * Llama a la función SQL search_restaurants_by_location.
 */
export async function searchRestaurantsByLocation(
  params: SearchParams
): Promise<SearchResult> {
  const {
    lat,
    lng,
    radius_km = 10,
    health_goal,
    page = 1,
    limit = 20,
  } = params

  const offset = (page - 1) * limit
  const supabase = await createServiceClient()

  const { data, error } = await supabase.rpc('search_restaurants_by_location', {
    lat,
    lng,
    radius_km,
    health_goal: health_goal ?? null,
    p_limit: limit,
    p_offset: offset,
  })

  if (error) throw new Error(error.message)

  return {
    restaurants: (data ?? []) as RestaurantListItem[],
    meta: { page, limit },
  }
}

/** Verifica si un punto está dentro de la cobertura de un restaurante */
export async function isWithinCoverage(
  restaurantId: string,
  lat: number,
  lng: number
): Promise<boolean> {
  const supabase = await createServiceClient()

  const { data } = await supabase
    .from('restaurants')
    .select('location, radius_km')
    .eq('id', restaurantId)
    .single()

  if (!data?.location || !data.radius_km) return false

  // Consulta PostGIS: ST_DWithin devuelve true si el punto está dentro del radio
  const { data: result } = await supabase.rpc('search_restaurants_by_location', {
    lat,
    lng,
    radius_km: data.radius_km,
    health_goal: null,
    p_limit: 1,
    p_offset: 0,
  })

  return (result ?? []).some((r: { id: string }) => r.id === restaurantId)
}
