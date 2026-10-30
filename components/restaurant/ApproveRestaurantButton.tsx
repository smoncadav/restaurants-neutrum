'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface Props {
  restaurantId: string
  currentStatus: string
}

export function ApproveRestaurantButton({ restaurantId, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function updateStatus(newStatus: 'active' | 'suspended') {
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from('restaurants')
      .update({ status: newStatus })
      .eq('id', restaurantId)
    setLoading(false)
    router.refresh()
  }

  if (currentStatus === 'pending') {
    return (
      <div className="flex gap-2">
        <Button size="sm" onClick={() => updateStatus('active')} disabled={loading}>
          Aprobar
        </Button>
        <Button size="sm" variant="destructive" onClick={() => updateStatus('suspended')} disabled={loading}>
          Rechazar
        </Button>
      </div>
    )
  }

  if (currentStatus === 'active') {
    return (
      <Button size="sm" variant="outline" onClick={() => updateStatus('suspended')} disabled={loading}>
        Suspender
      </Button>
    )
  }

  return (
    <Button size="sm" onClick={() => updateStatus('active')} disabled={loading}>
      Reactivar
    </Button>
  )
}
