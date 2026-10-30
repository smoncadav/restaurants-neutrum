import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PaymentOnboarding } from '@/components/forms/PaymentOnboarding'
import { RestaurantSettingsForm } from '@/components/forms/RestaurantSettingsForm'
import { Badge } from '@/components/ui/badge'

interface Props {
  searchParams: Promise<{ stripe?: string; mp?: string; onboarding?: string }>
}

export default async function SettingsPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) redirect('/register')

  const params = await searchParams
  const stripeStatus = params.stripe
  const mpStatus = params.mp
  const isOnboarding = params.onboarding === 'true'

  const isPaymentConnected =
    restaurant.payment_provider === 'stripe'
      ? !!restaurant.stripe_account_id
      : !!restaurant.mp_user_id

  return (
    <div className="p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Configuración</h1>
        {isOnboarding && (
          <div className="mt-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 font-medium">Bienvenido a Neutrum!</p>
            <p className="text-blue-700 text-sm mt-1">
              Para empezar a recibir pagos, conecta tu cuenta de pagos.
            </p>
          </div>
        )}
      </div>

      {/* Estado del pago */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Cuenta de pagos
            <Badge variant={isPaymentConnected ? 'default' : 'outline'}>
              {isPaymentConnected ? 'Conectada' : 'Pendiente'}
            </Badge>
          </CardTitle>
          <CardDescription>
            Conecta tu cuenta de{' '}
            {restaurant.payment_provider === 'stripe' ? 'Stripe Express' : 'MercadoPago Marketplace'}{' '}
            para recibir pagos de tus clientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stripeStatus === 'success' && (
            <p className="text-green-600 text-sm mb-4">Stripe conectado exitosamente.</p>
          )}
          {stripeStatus === 'error' && (
            <p className="text-red-600 text-sm mb-4">Error al conectar Stripe. Intenta de nuevo.</p>
          )}
          {mpStatus === 'success' && (
            <p className="text-green-600 text-sm mb-4">MercadoPago conectado exitosamente.</p>
          )}
          {mpStatus === 'error' && (
            <p className="text-red-600 text-sm mb-4">Error al conectar MercadoPago. Intenta de nuevo.</p>
          )}

          <PaymentOnboarding
            restaurantId={restaurant.id}
            provider={restaurant.payment_provider}
            isConnected={isPaymentConnected}
          />
        </CardContent>
      </Card>

      {/* Info del restaurante */}
      <Card>
        <CardHeader>
          <CardTitle>Información del restaurante</CardTitle>
          <CardDescription>Actualiza los datos y cobertura geográfica</CardDescription>
        </CardHeader>
        <CardContent>
          <RestaurantSettingsForm restaurant={restaurant} />
        </CardContent>
      </Card>
    </div>
  )
}
