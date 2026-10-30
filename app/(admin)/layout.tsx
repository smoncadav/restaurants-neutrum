import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.app_metadata?.role !== 'platform_admin') {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r flex flex-col">
        <div className="p-6">
          <h1 className="font-bold text-lg">Admin Panel</h1>
          <p className="text-xs text-gray-500 mt-1">{user.email}</p>
        </div>

        <Separator />

        <nav className="flex-1 p-4 space-y-1">
          <Link href="/admin/restaurants">
            <Button variant="ghost" className="w-full justify-start">Restaurantes</Button>
          </Link>
          <Link href="/admin/commission">
            <Button variant="ghost" className="w-full justify-start">Comisión</Button>
          </Link>
          <Link href="/admin/reports">
            <Button variant="ghost" className="w-full justify-start">Reportes</Button>
          </Link>
        </nav>
      </aside>

      <main className="flex-1 bg-gray-50 overflow-auto">{children}</main>
    </div>
  )
}
