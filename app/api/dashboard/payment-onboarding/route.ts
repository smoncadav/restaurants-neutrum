import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/dashboard/payment-onboarding — proxies to Edge Function
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  const res = await supabase.functions.invoke('payment-onboarding', {
    body,
    headers: { Authorization: `Bearer ${session.access_token}` },
  })

  if (res.error) {
    return NextResponse.json({ error: res.error.message }, { status: 500 })
  }

  return NextResponse.json(res.data)
}
