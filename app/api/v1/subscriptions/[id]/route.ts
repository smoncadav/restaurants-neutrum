import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/supabase/api-auth'
import { createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { ApiError } from '@/types/api'

type Params = { params: Promise<{ id: string }> }

const UpdateSubSchema = z.object({
  action: z.enum(['pause', 'cancel', 'resume']),
})

// GET /api/v1/subscriptions/:id
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await validateApiKey(request)
  if (!auth.valid) return auth.response

  const { id } = await params
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json<ApiError>({ error: 'Subscription not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

// PATCH /api/v1/subscriptions/:id — pausar / cancelar / reactivar
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await validateApiKey(request)
  if (!auth.valid) return auth.response

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiError>({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = UpdateSubSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiError>(
      { error: 'Validation error', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const statusMap: Record<string, 'active' | 'paused' | 'cancelled'> = {
    pause: 'paused',
    cancel: 'cancelled',
    resume: 'active',
  }

  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('subscriptions')
    .update({ status: statusMap[parsed.data.action] })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    return NextResponse.json<ApiError>({ error: error?.message ?? 'Not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
