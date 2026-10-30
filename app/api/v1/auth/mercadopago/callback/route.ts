import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// GET /api/v1/auth/mercadopago/callback
// Recibe el código OAuth de MercadoPago y guarda el access token del restaurante
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const restaurantId = searchParams.get('state')  // restaurantId pasado en el state

  if (!code || !restaurantId) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?mp=error`
    )
  }

  try {
    // Intercambiar código por access token
    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.MERCADOPAGO_CLIENT_ID,
        client_secret: process.env.MERCADOPAGO_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/v1/auth/mercadopago/callback`,
      }),
    })

    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.message ?? 'Failed to get MP access token')
    }

    // Guardar mp_user_id en la BD (el token se guarda en Vault/env fuera de la BD)
    const supabase = await createServiceClient()
    await supabase
      .from('restaurants')
      .update({ mp_user_id: String(tokenData.user_id) })
      .eq('id', restaurantId)

    // IMPORTANTE: en producción, guardar tokenData.access_token en Supabase Vault
    // o en una tabla cifrada, NO en restaurants directamente.
    // Ejemplo: await vault.store(`MP_TOKEN_${tokenData.user_id}`, tokenData.access_token)

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?mp=success`
    )
  } catch (err) {
    console.error('[MP OAuth callback]', err)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings?mp=error`
    )
  }
}
