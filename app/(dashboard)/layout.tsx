import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, status')
    .eq('owner_id', user.id)
    .single()

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-6">
          <h1 className="font-bold text-lg">{restaurant?.name ?? 'Mi Restaurante'}</h1>
          {restaurant?.status === 'pending' && (
            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded mt-1 inline-block">
              Pendiente de aprobación
            </span>
          )}
          {restaurant?.status === 'active' && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded mt-1 inline-block">
              Activo
            </span>
          )}
        </div>

        <Separator />

        <nav className="flex-1 p-4 space-y-1">
          <Link href="/dashboard/menus">
            <Button variant="ghost" className="w-full justify-start">
              Meal Kits
            </Button>
          </Link>
          <Link href="/dashboard/orders">
            <Button variant="ghost" className="w-full justify-start">
              Pedidos
            </Button>
          </Link>
          <Link href="/dashboard/settings">
            <Button variant="ghost" className="w-full justify-start">
              Configuración
            </Button>
          </Link>
        </nav>

        <div className="p-4">
          <form action="/api/auth/signout" method="post">
            <Button type="submit" variant="outline" className="w-full">
              Cerrar sesión
            </Button>
          </form>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-gray-50 overflow-auto">
        {children}
      </main>
    </div>
  )
}
