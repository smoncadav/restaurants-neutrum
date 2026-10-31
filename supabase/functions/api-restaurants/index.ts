import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { validateApiKey } from '../_shared/api-auth.ts'
import { searchRestaurantsByLocation } from '../_shared/geo.ts'
import { adminClient } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const auth = await validateApiKey(req)
  if (!auth.valid) return auth.response

  const url = new URL(req.url)

  // GET — search by location
  if (req.method === 'GET') {
    const lat = parseFloat(url.searchParams.get('lat') ?? '')
    const lng = parseFloat(url.searchParams.get('lng') ?? '')

    if (isNaN(lat) || isNaN(lng)) {
      return errorResponse('lat and lng query params are required', 400)
    }

    try {
      const result = await searchRestaurantsByLocation({
        lat, lng,
        radius_km: url.searchParams.get('radius_km') ? parseFloat(url.searchParams.get('radius_km')!) : undefined,
        health_goal: url.searchParams.get('health_goal') ?? undefined,
        page: url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!) : undefined,
        limit: url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!) : undefined,
      })
      return jsonResponse(result)
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : 'Internal error', 500)
    }
  }

  // POST — create restaurant
  if (req.method === 'POST') {
    try {
      const body = await req.json()
      const supabase = adminClient()
      const { data, error } = await supabase.from('restaurants').insert(body).select().single()
      if (error) return errorResponse(error.message, 400)
      return jsonResponse(data, 201)
    } catch (err) {
      return errorResponse(err instanceof Error ? err.message : 'Internal error', 500)
    }
  }

  return errorResponse('Method not allowed', 405)
})
