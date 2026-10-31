import { adminClient } from './supabase.ts'
import { errorResponse } from './cors.ts'

/** Validates X-Api-Key header against the api_keys table. */
export async function validateApiKey(
  req: Request
): Promise<{ valid: true } | { valid: false; response: Response }> {
  const apiKey = req.headers.get('x-api-key')

  if (!apiKey) {
    return { valid: false, response: errorResponse('Missing X-Api-Key header', 401) }
  }

  // SHA-256 hash in Deno
  const encoder = new TextEncoder()
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(apiKey))
  const keyHash = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

  const supabase = adminClient()
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, active')
    .eq('key_hash', keyHash)
    .single()

  if (error || !data || !data.active) {
    return { valid: false, response: errorResponse('Invalid or inactive API key', 401) }
  }

  return { valid: true }
}
