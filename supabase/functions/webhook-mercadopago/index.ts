import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { MercadoPagoProvider } from '../_shared/payments/mercadopago.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const signature = req.headers.get('x-signature') ?? ''

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return errorResponse('Invalid JSON', 400)
  }

  try {
    const provider = new MercadoPagoProvider()
    const event = await provider.handleWebhook(body, signature)
    console.log('[MercadoPago webhook]', event.type, event.providerEventId)
    return jsonResponse({ received: true, type: event.type })
  } catch (err) {
    console.error('[MercadoPago webhook error]', err)
    return errorResponse(err instanceof Error ? err.message : 'Webhook error', 400)
  }
})
