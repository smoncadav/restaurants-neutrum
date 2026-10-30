import { NextRequest, NextResponse } from 'next/server'
import { StripeProvider } from '@/lib/payments/stripe'

// Stripe necesita el body raw (sin parsear) para verificar la firma
export const config = { api: { bodyParser: false } }

// POST /api/v1/webhooks/stripe
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const body = await request.text()

  try {
    const provider = new StripeProvider()
    const event = await provider.handleWebhook(body, signature)

    console.log('[Stripe webhook]', event.type, event.providerEventId)

    return NextResponse.json({ received: true, type: event.type })
  } catch (err) {
    console.error('[Stripe webhook error]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook error' },
      { status: 400 }
    )
  }
}
