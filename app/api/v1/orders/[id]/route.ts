import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '@/lib/supabase/api-auth'
import { createServiceClient } from '@/lib/supabase/server'
import type { ApiError } from '@/types/api'

type Params = { params: Promise<{ id: string }> }

// GET /api/v1/orders/:id
export async function GET(request: NextRequest, { params }: Params) {
  const auth = await validateApiKey(request)
  if (!auth.valid) return auth.response

  const { id } = await params
  const supabase = await createServiceClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json<ApiError>({ error: 'Order not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
