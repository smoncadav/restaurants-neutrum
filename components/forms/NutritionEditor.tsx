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
import { Badge } from '@/components/ui/badge'
import type { MenuNutrition, HealthGoal } from '@/types/database'

const ALL_GOALS: HealthGoal[] = [
  'weight_loss', 'muscle_gain', 'maintenance', 'energy',
  'detox', 'heart_health', 'diabetes_friendly', 'vegan',
  'vegetarian', 'gluten_free', 'keto', 'paleo',
]

const NutritionSchema = z.object({
  calories_per_serving: z.number().min(0).optional().nullable(),
  protein_g: z.number().min(0).optional().nullable(),
  carbs_g: z.number().min(0).optional().nullable(),
  fat_g: z.number().min(0).optional().nullable(),
  fiber_g: z.number().min(0).optional().nullable(),
  sugar_g: z.number().min(0).optional().nullable(),
  sodium_mg: z.number().min(0).optional().nullable(),
})

type NutritionValues = z.infer<typeof NutritionSchema>

interface Props {
  menuId: string
  initialNutrition: Omit<MenuNutrition, 'menu_id'> | null
  initialHealthGoals: string[]
}

export function NutritionEditor({ menuId, initialNutrition, initialHealthGoals }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [selectedGoals, setSelectedGoals] = useState<Set<string>>(new Set(initialHealthGoals))

  const form = useForm<NutritionValues>({
    resolver: zodResolver(NutritionSchema),
    defaultValues: {
      calories_per_serving: initialNutrition?.calories_per_serving ?? null,
      protein_g: initialNutrition?.protein_g ?? null,
      carbs_g: initialNutrition?.carbs_g ?? null,
      fat_g: initialNutrition?.fat_g ?? null,
      fiber_g: initialNutrition?.fiber_g ?? null,
      sugar_g: initialNutrition?.sugar_g ?? null,
      sodium_mg: initialNutrition?.sodium_mg ?? null,
    },
  })

  function toggleGoal(goal: HealthGoal) {
    setSelectedGoals((prev) => {
      const next = new Set(prev)
      if (next.has(goal)) next.delete(goal)
      else next.add(goal)
      return next
    })
  }

  async function onSubmit(values: NutritionValues) {
    setSaving(true)
    const supabase = createClient()

    // Upsert nutrition
    await supabase.from('menu_nutrition').upsert({
      menu_id: menuId,
      ...values,
    })

    // Sincronizar health goals
    await supabase.from('menu_health_goals').delete().eq('menu_id', menuId)
    if (selectedGoals.size > 0) {
      await supabase.from('menu_health_goals').insert(
        Array.from(selectedGoals).map((goal) => ({ menu_id: menuId, goal: goal as HealthGoal }))
      )
    }

    setSaving(false)
    setSaved(true)
    router.refresh()
    setTimeout(() => setSaved(false), 3000)
  }

  const FIELDS: Array<{ key: keyof NutritionValues; label: string; unit: string }> = [
    { key: 'calories_per_serving', label: 'Calorías por porción', unit: 'kcal' },
    { key: 'protein_g', label: 'Proteínas', unit: 'g' },
    { key: 'carbs_g', label: 'Carbohidratos', unit: 'g' },
    { key: 'fat_g', label: 'Grasas', unit: 'g' },
    { key: 'fiber_g', label: 'Fibra', unit: 'g' },
    { key: 'sugar_g', label: 'Azúcar', unit: 'g' },
    { key: 'sodium_mg', label: 'Sodio', unit: 'mg' },
  ]

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      {/* Macros */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {FIELDS.map(({ key, label, unit }) => (
          <div key={key} className="space-y-1">
            <Label className="text-xs text-gray-600">{label}</Label>
            <div className="flex items-center">
              <Input
                type="number"
                step="0.1"
                min="0"
                className="rounded-r-none text-sm"
                {...form.register(key, { valueAsNumber: true })}
              />
              <span className="px-2 py-2 bg-gray-100 border border-l-0 rounded-r text-xs text-gray-500">
                {unit}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Health goals */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Objetivos de salud</Label>
        <div className="flex flex-wrap gap-2">
          {ALL_GOALS.map((goal) => (
            <button
              key={goal}
              type="button"
              onClick={() => toggleGoal(goal)}
            >
              <Badge
                variant={selectedGoals.has(goal) ? 'default' : 'outline'}
                className="cursor-pointer"
              >
                {goal}
              </Badge>
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? 'Guardando...' : 'Guardar'}
        </Button>
        {saved && <span className="text-green-600 text-sm">Guardado</span>}
      </div>
    </form>
  )
}
