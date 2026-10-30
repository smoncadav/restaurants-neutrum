'use client'

import { useState } from 'react'
import { loadConnectAndInitialize } from '@stripe/connect-js'
import {
  ConnectAccountOnboarding,
  ConnectAccountManagement,
  ConnectComponentsProvider,
} from '@stripe/react-connect-js'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Props {
  restaurantId: string
  provider: 'stripe' | 'mercadopago'
  isConnected: boolean
}

type StripeView = 'idle' | 'onboarding' | 'management'

const STRIPE_APPEARANCE = {
  overlays: 'dialog' as const,
  variables: { colorPrimary: '#18181b' },
}

export function PaymentOnboarding({ restaurantId, provider, isConnected }: Props) {
  const [loading, setLoading] = useState(false)
  const [connected, setConnected] = useState(isConnected)
  const [view, setView] = useState<StripeView>('idle')
  const [stripeInstance, setStripeInstance] = useState<ReturnType<typeof loadConnectAndInitialize> | null>(null)

  // ── Helpers ────────────────────────────────────────────────────

  async function initStripeInstance(endpoint: string) {
    setLoading(true)
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId }),
    })
    const data = await res.json()
    setLoading(false)

    if (!data.clientSecret) {
      alert('Error al conectar con Stripe')
      return null
    }

    return loadConnectAndInitialize({
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
      fetchClientSecret: async () => data.clientSecret,
      appearance: STRIPE_APPEARANCE,
    })
  }

  async function openOnboarding() {
    const instance = await initStripeInstance('/api/dashboard/payment-onboarding')
    if (!instance) return
    setStripeInstance(instance)
    setView('onboarding')
  }

  async function openManagement() {
    const instance = await initStripeInstance('/api/dashboard/stripe-account-session')
    if (!instance) return
    setStripeInstance(instance)
    setView('management')
  }

  function closeStripe() {
    setStripeInstance(null)
    setView('idle')
  }

  // ── MercadoPago ────────────────────────────────────────────────

  async function startMpOnboarding() {
    setLoading(true)
    const res = await fetch('/api/dashboard/payment-onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId }),
    })
    const data = await res.json()
    setLoading(false)
    if (data.url) window.location.href = data.url
    else alert('Error al iniciar MercadoPago')
  }

  // ── MercadoPago UI ─────────────────────────────────────────────

  if (provider === 'mercadopago') {
    return (
      <div className="space-y-3">
        {connected && (
          <p className="text-sm text-green-600">Cuenta MercadoPago conectada.</p>
        )}
        <p className="text-sm text-gray-600">
          {connected
            ? 'Para gestionar tu cuenta ve directamente a mercadopago.com.'
            : 'Autoriza tu cuenta de MercadoPago para recibir pagos.'}
        </p>
        <Button onClick={startMpOnboarding} disabled={loading} variant={connected ? 'outline' : 'default'}>
          {loading ? 'Redirigiendo...' : connected ? 'Reconectar MercadoPago' : 'Conectar con MercadoPago'}
        </Button>
      </div>
    )
  }

  // ── Stripe: Embedded Component activo ─────────────────────────

  if (stripeInstance) {
    return (
      <ConnectComponentsProvider connectInstance={stripeInstance}>
        {view === 'onboarding' && (
          <ConnectAccountOnboarding
            onExit={() => {
              setConnected(true)
              closeStripe()
            }}
          />
        )}
        {view === 'management' && (
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={closeStripe}>
              ← Cerrar
            </Button>
            <ConnectAccountManagement />
          </div>
        )}
      </ConnectComponentsProvider>
    )
  }

  // ── Stripe: sin conectar ───────────────────────────────────────

  if (!connected) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          Conecta tu cuenta bancaria para recibir pagos. Stripe se encarga de la
          verificación de identidad y cumplimiento local.
        </p>
        <Button onClick={openOnboarding} disabled={loading}>
          {loading ? 'Cargando...' : 'Configurar cuenta de pagos'}
        </Button>
      </div>
    )
  }

  // ── Stripe: conectado — onboarding + management en tabs ───────

  return (
    <Tabs defaultValue="management">
      <TabsList className="mb-4">
        <TabsTrigger value="management">Gestionar cuenta</TabsTrigger>
        <TabsTrigger value="onboarding">Actualizar datos bancarios</TabsTrigger>
      </TabsList>

      <TabsContent value="management">
        <p className="text-sm text-gray-600 mb-3">
          Consulta tus payouts, saldo, y configura tu cuenta bancaria.
        </p>
        <Button onClick={openManagement} disabled={loading}>
          {loading ? 'Cargando...' : 'Abrir gestión de cuenta'}
        </Button>
      </TabsContent>

      <TabsContent value="onboarding">
        <p className="text-sm text-gray-600 mb-3">
          Actualiza tu información de verificación de identidad o documentos.
        </p>
        <Button variant="outline" onClick={openOnboarding} disabled={loading}>
          {loading ? 'Cargando...' : 'Actualizar datos'}
        </Button>
      </TabsContent>
    </Tabs>
  )
}
