'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CommissionConfig } from '@/types/database'

const CommissionSchema = z.object({
  type: z.enum(['percentage', 'flat']),
  value: z.number().min(0).max(100),
})

type CommissionValues = z.infer<typeof CommissionSchema>

export function CommissionForm({ current }: { current: CommissionConfig | null }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)

  const form = useForm<CommissionValues>({
    resolver: zodResolver(CommissionSchema),
    defaultValues: {
      type: current?.type ?? 'percentage',
      value: current?.value ?? 10,
    },
  })

  async function onSubmit(values: CommissionValues) {
    setSaving(true)
    const supabase = createClient()

    await supabase.from('commission_config').insert({
      type: values.type,
      value: values.value,
      effective_from: new Date().toISOString(),
    })

    setSaving(false)
    router.refresh()
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label>Tipo</Label>
        <Select
          defaultValue={form.getValues('type')}
          onValueChange={(v) => form.setValue('type', v as 'percentage' | 'flat')}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="percentage">Porcentaje (%)</SelectItem>
            <SelectItem value="flat">Monto fijo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="value">Valor</Label>
        <Input
          id="value"
          type="number"
          step="0.5"
          min="0"
          max="100"
          {...form.register('value', { valueAsNumber: true })}
        />
        {form.formState.errors.value && (
          <p className="text-sm text-red-500">{form.formState.errors.value.message}</p>
        )}
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? 'Guardando...' : 'Aplicar nueva comisión'}
      </Button>
    </form>
  )
}
