import { corsResponse, jsonResponse, errorResponse } from '../_shared/cors.ts'
import { StripeProvider } from '../_shared/payments/stripe.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return corsResponse()
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const signature = req.headers.get('stripe-signature')
  if (!signature) return errorResponse('Missing stripe-signature header', 400)

  const body = await req.text()

  try {
    const provider = new StripeProvider()
    const event = await provider.handleWebhook(body, signature)
    console.log('[Stripe webhook]', event.type, event.providerEventId)
    return jsonResponse({ received: true, type: event.type })
  } catch (err) {
    console.error('[Stripe webhook error]', err)
    return errorResponse(err instanceof Error ? err.message : 'Webhook error', 400)
  }
})
