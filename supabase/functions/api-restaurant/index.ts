import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { validateApiKey } from '../_shared/api-auth.ts'
import { adminClient } from '../_shared/supabase.ts'

// Expects: /functions/v1/api-restaurant?id=<uuid>
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  const auth = await validateApiKey(req)
  if (!auth.valid) return auth.response

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return errorResponse('Missing id param', 400)

  const supabase = adminClient()

  if (req.method === 'GET') {
    const { data, error } = await supabase.from('restaurants').select('*').eq('id', id).eq('status', 'active').single()
    if (error || !data) return errorResponse('Restaurant not found', 404)
    const { stripe_account_id, mp_user_id, ...safe } = data
    void stripe_account_id; void mp_user_id
    return jsonResponse(safe)
  }

  if (req.method === 'PATCH') {
    const body = await req.json()
    const { data, error } = await supabase.from('restaurants').update(body).eq('id', id).select().single()
    if (error || !data) return errorResponse(error?.message ?? 'Not found', 404)
    return jsonResponse(data)
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('restaurants').delete().eq('id', id)
    if (error) return errorResponse(error.message, 400)
    return new Response(null, { status: 204 })
  }

  return errorResponse('Method not allowed', 405)
})
