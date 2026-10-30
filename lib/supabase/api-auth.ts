import { createHash } from 'crypto'
import { createServiceClient } from './server'
import { NextRequest, NextResponse } from 'next/server'
import type { ApiError } from '@/types/api'

/** Valida el header X-Api-Key contra la tabla api_keys */
export async function validateApiKey(
  request: NextRequest
): Promise<{ valid: true } | { valid: false; response: NextResponse<ApiError> }> {
  const apiKey = request.headers.get('X-Api-Key')

  if (!apiKey) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Missing X-Api-Key header' },
        { status: 401 }
      ),
    }
  }

  const keyHash = createHash('sha256').update(apiKey).digest('hex')
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, active')
    .eq('key_hash', keyHash)
    .single()

  if (error || !data || !data.active) {
    return {
      valid: false,
      response: NextResponse.json(
        { error: 'Invalid or inactive API key' },
        { status: 401 }
      ),
    }
  }

  return { valid: true }
}
