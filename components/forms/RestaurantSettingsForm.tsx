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
import { Textarea } from '@/components/ui/textarea'
import type { Restaurant } from '@/types/database'

const SettingsSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  radius_km: z.number().min(1).max(100).optional(),
})

type SettingsValues = z.infer<typeof SettingsSchema>

export function RestaurantSettingsForm({ restaurant }: { restaurant: Restaurant }) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const form = useForm<SettingsValues>({
    resolver: zodResolver(SettingsSchema),
    defaultValues: {
      name: restaurant.name,
      description: restaurant.description ?? '',
      radius_km: restaurant.radius_km ?? 10,
    },
  })

  async function onSubmit(values: SettingsValues) {
    setSaving(true)
    const supabase = createClient()

    await supabase
      .from('restaurants')
      .update({
        name: values.name,
        description: values.description ?? null,
        radius_km: values.radius_km ?? 10,
      })
      .eq('id', restaurant.id)

    setSaving(false)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nombre del restaurante</Label>
        <Input id="name" {...form.register('name')} />
        {form.formState.errors.name && (
          <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea id="description" rows={3} {...form.register('description')} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="radius_km">Radio de cobertura (km)</Label>
        <Input
          id="radius_km"
          type="number"
          min={1}
          max={100}
          {...form.register('radius_km', { valueAsNumber: true })}
        />
        <p className="text-xs text-gray-500">
          Los clientes dentro de este radio podrán ver tu restaurante
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </Button>
        {saved && <span className="text-green-600 text-sm">Guardado</span>}
      </div>
    </form>
  )
}
