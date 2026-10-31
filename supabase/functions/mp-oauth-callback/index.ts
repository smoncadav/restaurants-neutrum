import { adminClient } from '../_shared/supabase.ts'

const APP_URL = Deno.env.get('NEXT_PUBLIC_APP_URL') ?? ''

Deno.serve(async (req) => {
  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 })
  }

  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const restaurantId = url.searchParams.get('state')

  if (!code || !restaurantId) {
    return Response.redirect(`${APP_URL}/dashboard/settings?mp=error`)
  }

  try {
    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: Deno.env.get('MERCADOPAGO_CLIENT_ID'),
        client_secret: Deno.env.get('MERCADOPAGO_CLIENT_SECRET'),
        grant_type: 'authorization_code',
        code,
        redirect_uri: `https://smxpskjulpgllkfnlepd.supabase.co/functions/v1/mp-oauth-callback`,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.message ?? 'Failed to get MP access token')
    }

    const supabase = adminClient()
    await supabase
      .from('restaurants')
      .update({ mp_user_id: String(tokenData.user_id) })
      .eq('id', restaurantId)

    return Response.redirect(`${APP_URL}/dashboard/settings?mp=success`)
  } catch (err) {
    console.error('[MP OAuth callback]', err)
    return Response.redirect(`${APP_URL}/dashboard/settings?mp=error`)
  }
})
