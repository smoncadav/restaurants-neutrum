import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NutritionEditor } from '@/components/forms/NutritionEditor'

export default async function NutritionMenusPage() {
  const supabase = await createClient()

  // Nutricionista ve todos los menús activos/borradores de todos los restaurantes
  const { data: menus } = await supabase
    .from('menus')
    .select(`
      id, name, status, restaurant_id,
      restaurants (name),
      menu_nutrition (
        calories_per_serving, protein_g, carbs_g, fat_g,
        fiber_g, sugar_g, sodium_mg, allergens
      ),
      menu_health_goals (goal)
    `)
    .in('status', ['active', 'draft'])
    .order('created_at', { ascending: false })

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Editor Nutricional</h1>
        <p className="text-gray-600 mt-1">Edita la información nutricional y objetivos de salud</p>
      </div>

      <div className="space-y-6">
        {(menus ?? []).map((menu) => {
          const restaurant = menu.restaurants as { name: string } | null
          const nutrition = Array.isArray(menu.menu_nutrition)
            ? menu.menu_nutrition[0]
            : menu.menu_nutrition
          const healthGoals = (menu.menu_health_goals as { goal: string }[]).map((g) => g.goal)

          return (
            <Card key={menu.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{menu.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">{restaurant?.name}</span>
                    <Badge variant={menu.status === 'active' ? 'default' : 'outline'}>
                      {menu.status}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <NutritionEditor
                  menuId={menu.id}
                  initialNutrition={nutrition ?? null}
                  initialHealthGoals={healthGoals}
                />
              </CardContent>
            </Card>
          )
        })}

        {!menus?.length && (
          <p className="text-center py-16 text-gray-500">No hay menús para editar</p>
        )}
      </div>
    </div>
  )
}
