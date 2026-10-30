import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MenuCard } from '@/components/restaurant/MenuCard'

export default async function MenusPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .single()

  if (!restaurant) redirect('/register')

  const { data: menus } = await supabase
    .from('menus')
    .select(`
      id, name, description, price, images, status, purchase_type,
      serves_people, prep_time_minutes, created_at,
      menu_health_goals (goal)
    `)
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })

  const activeCount = menus?.filter((m) => m.status === 'active').length ?? 0
  const draftCount = menus?.filter((m) => m.status === 'draft').length ?? 0

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Meal Kits</h1>
          <p className="text-gray-600 mt-1">Gestiona tu catálogo de meal kits</p>
        </div>
        <Link href="/dashboard/menus/new">
          <Button>+ Nuevo Meal Kit</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold">{menus?.length ?? 0}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-green-600">{activeCount}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Borradores</CardTitle>
          </CardHeader>
          <CardContent>
            <span className="text-3xl font-bold text-yellow-600">{draftCount}</span>
          </CardContent>
        </Card>
      </div>

      {/* Menu grid */}
      {!menus?.length ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg">Aún no tienes meal kits</p>
          <p className="mt-2">Crea tu primer meal kit para empezar a vender</p>
          <Link href="/dashboard/menus/new">
            <Button className="mt-4">Crear primer Meal Kit</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menus.map((menu) => (
            <MenuCard
              key={menu.id}
              menu={{
                ...menu,
                health_goals: (menu.menu_health_goals as { goal: string }[]).map((g) => g.goal),
              }}
              showActions
            />
          ))}
        </div>
      )}
    </div>
  )
}
