'use client'

import { useState } from 'react'
import { loadConnectAndInitialize } from '@stripe/connect-js'
import {
  ConnectAccountOnboarding,
  ConnectComponentsProvider,
} from '@stripe/react-connect-js'
import { Button } from '@/components/ui/button'

interface Props {
  restaurantId: string
  provider: 'stripe' | 'mercadopago'
  isConnected: boolean
}

export function PaymentOnboarding({ restaurantId, provider, isConnected }: Props) {
  const [stripeInstance, setStripeInstance] = useState<ReturnType<typeof loadConnectAndInitialize> | null>(null)
  const [loading, setLoading] = useState(false)
  const [onboardingComplete, setOnboardingComplete] = useState(isConnected)

  async function startStripeOnboarding() {
    setLoading(true)

    const response = await fetch('/api/dashboard/payment-onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId }),
    })

    const data = await response.json()
    setLoading(false)

    if (!data.clientSecret) {
      alert('Error al iniciar el onboarding de Stripe')
      return
    }

    // Inicializar Stripe Connect con el client_secret del Account Session
    const instance = loadConnectAndInitialize({
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
      fetchClientSecret: async () => data.clientSecret,
      appearance: {
        overlays: 'dialog',
        variables: {
          colorPrimary: '#18181b',
        },
      },
    })

    setStripeInstance(instance)
  }

  async function startMpOnboarding() {
    setLoading(true)

    const response = await fetch('/api/dashboard/payment-onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId }),
    })

    const data = await response.json()
    setLoading(false)

    if (data.url) {
      window.location.href = data.url
    } else {
      alert('Error al iniciar MercadoPago')
    }
  }

  // ── Stripe Embedded Component ──────────────────────────────────
  if (provider === 'stripe') {
    if (onboardingComplete && !stripeInstance) {
      return (
        <div className="flex items-center gap-3">
          <span className="text-green-600 text-sm">Cuenta Stripe conectada</span>
          <Button variant="outline" size="sm" onClick={startStripeOnboarding} disabled={loading}>
            Actualizar datos
          </Button>
        </div>
      )
    }

    if (stripeInstance) {
      return (
        <ConnectComponentsProvider connectInstance={stripeInstance}>
          <ConnectAccountOnboarding
            onExit={() => {
              setStripeInstance(null)
              setOnboardingComplete(true)
            }}
          />
        </ConnectComponentsProvider>
      )
    }

    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Conecta tu cuenta bancaria para recibir pagos. Stripe se encarga de la
          verificación de identidad y cumplimiento local.
        </p>
        <Button onClick={startStripeOnboarding} disabled={loading}>
          {loading ? 'Cargando...' : 'Configurar cuenta de pagos'}
        </Button>
      </div>
    )
  }

  // ── MercadoPago OAuth redirect ─────────────────────────────────
  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-green-600 text-sm">Cuenta MercadoPago conectada</span>
        <Button variant="outline" size="sm" onClick={startMpOnboarding} disabled={loading}>
          Reconectar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        Autoriza tu cuenta de MercadoPago para recibir pagos desde la plataforma.
      </p>
      <Button onClick={startMpOnboarding} disabled={loading}>
        {loading ? 'Redirigiendo...' : 'Conectar con MercadoPago'}
      </Button>
    </div>
  )
}
