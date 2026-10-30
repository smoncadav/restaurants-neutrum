import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/supabase/api-auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiError } from '@/types/api'

type Params = { params: Promise<{ id: string }> }

// GET /api/v1/restaurants/:id
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await validateApiKey(request)
  if (!auth.valid) return auth.response

  const { id } = await params
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .eq('status', 'active')
    .single()

  if (error || !data) {
    return NextResponse.json<ApiError>({ error: 'Restaurant not found' }, { status: 404 })
  }

  // Excluir campos sensibles de pago
  const { stripe_account_id, mp_user_id, ...safe } = data
  void stripe_account_id
  void mp_user_id

  return NextResponse.json(safe)
}

// PATCH /api/v1/restaurants/:id
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await validateApiKey(request)
  if (!auth.valid) return auth.response

  const { id } = await params

  try {
    const body = await request.json()
    const supabase = await createServiceClient()

    const { data, error } = await supabase
      .from('restaurants')
      .update(body)
      .eq('id', id)
      .select()
      .single()

    if (error || !data) {
      return NextResponse.json<ApiError>({ error: error?.message ?? 'Not found' }, { status: 404 })
    }

    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json<ApiError>(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    )
  }
}

// DELETE /api/v1/restaurants/:id
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await validateApiKey(request)
  if (!auth.valid) return auth.response

  const { id } = await params
  const supabase = await createServiceClient()

  const { error } = await supabase.from('restaurants').delete().eq('id', id)

  if (error) {
    return NextResponse.json<ApiError>({ error: error.message }, { status: 400 })
  }

  return new NextResponse(null, { status: 204 })
}
