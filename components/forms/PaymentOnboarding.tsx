'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface Props {
  restaurantId: string
  provider: 'stripe' | 'mercadopago'
  isConnected: boolean
}

export function PaymentOnboarding({ restaurantId, provider, isConnected }: Props) {
  const [loading, setLoading] = useState(false)

  async function startOnboarding() {
    setLoading(true)

    const response = await fetch('/api/dashboard/payment-onboarding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId }),
    })

    const data = await response.json()

    if (data.url) {
      window.location.href = data.url
    } else {
      alert('Error al iniciar el proceso de pago')
      setLoading(false)
    }
  }

  if (isConnected) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-green-600 text-sm">
          Cuenta de {provider === 'stripe' ? 'Stripe Express' : 'MercadoPago'} conectada
        </span>
        <Button variant="outline" size="sm" onClick={startOnboarding} disabled={loading}>
          Reconectar
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        {provider === 'stripe'
          ? 'Conecta tu cuenta Stripe Express para recibir pagos directo en tu banco.'
          : 'Autoriza tu cuenta de MercadoPago para recibir pagos desde la plataforma.'}
      </p>
      <Button onClick={startOnboarding} disabled={loading}>
        {loading
          ? 'Redirigiendo...'
          : provider === 'stripe'
          ? 'Conectar con Stripe'
          : 'Conectar con MercadoPago'}
      </Button>
    </div>
  )
}
