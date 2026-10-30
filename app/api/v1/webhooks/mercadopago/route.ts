import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoProvider } from '@/lib/payments/mercadopago'

// POST /api/v1/webhooks/mercadopago — IPN de MercadoPago
export async function POST(request: NextRequest) {
  // MercadoPago envía la firma en el header x-signature
  const signature = request.headers.get('x-signature') ?? ''

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  try {
    const provider = new MercadoPagoProvider()
    const event = await provider.handleWebhook(body, signature)

    console.log('[MercadoPago webhook]', event.type, event.providerEventId)

    return NextResponse.json({ received: true, type: event.type })
  } catch (err) {
    console.error('[MercadoPago webhook error]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook error' },
      { status: 400 }
    )
  }
}
