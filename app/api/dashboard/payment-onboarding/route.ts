import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getPaymentProvider } from '@/lib/payments'

// POST /api/dashboard/payment-onboarding
// Genera la URL de onboarding para Stripe Express o MercadoPago OAuth
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { restaurantId } = await request.json()

  // Verificar que el restaurante pertenece al usuario
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', restaurantId)
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
  }

  try {
    const provider = await getPaymentProvider(restaurant)
    const result = await provider.onboardRestaurant(restaurantId)
    return NextResponse.json({ url: result.url })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Onboarding error' },
      { status: 500 }
    )
  }
}
