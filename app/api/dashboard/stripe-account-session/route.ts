import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { StripeProvider } from '@/lib/payments/stripe'

// POST /api/dashboard/stripe-account-session
// Crea una Account Session con account_management para el componente embebido
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { restaurantId } = await request.json()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, owner_id, payment_provider')
    .eq('id', restaurantId)
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) {
    return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 })
  }

  if (restaurant.payment_provider !== 'stripe') {
    return NextResponse.json({ error: 'Restaurant uses MercadoPago' }, { status: 400 })
  }

  try {
    const provider = new StripeProvider()
    const clientSecret = await provider.createManagementSession(restaurantId)
    return NextResponse.json({ clientSecret })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Session error' },
      { status: 500 }
    )
  }
}
