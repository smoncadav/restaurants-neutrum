import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { adminClient } from '../_shared/supabase.ts'

const STRIPE_COUNTRIES = new Set(['MX', 'CL', 'BR', 'PE', 'UY'])
const CURRENCY_MAP: Record<string, string> = {
  MX: 'MXN', CO: 'COP', AR: 'ARS', CL: 'CLP', BR: 'BRL', PE: 'PEN', UY: 'UYU',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()

  try {
    const { email, password, restaurant_name, country_code } = await req.json()

    if (!email || !password || !restaurant_name || !country_code) {
      return errorResponse('Missing required fields', 422)
    }

    const supabase = adminClient()

    // 1. Create user with role in app_metadata (requires service role)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      app_metadata: { role: 'restaurant_owner' },
      email_confirm: true,
    })

    if (authError || !authData.user) {
      return errorResponse(authError?.message ?? 'Error creating user', 400)
    }

    // 2. Insert restaurant (service role bypasses RLS)
    const currency = CURRENCY_MAP[country_code] ?? 'USD'
    const paymentProvider = STRIPE_COUNTRIES.has(country_code) ? 'stripe' : 'mercadopago'

    const { error: restaurantError } = await supabase.from('restaurants').insert({
      owner_id: authData.user.id,
      name: restaurant_name,
      country_code,
      currency,
      payment_provider: paymentProvider,
      status: 'pending',
    })

    if (restaurantError) {
      // Rollback: delete the user if restaurant creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return errorResponse(restaurantError.message, 400)
    }

    // 3. Sign in to get a session for the new user
    const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })

    if (signInError || !sessionData.session) {
      return errorResponse('Account created. Please sign in.', 201)
    }

    return jsonResponse({
      user: authData.user,
      session: sessionData.session,
      payment_provider: paymentProvider,
    }, 201)
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : 'Internal error', 500)
  }
})
