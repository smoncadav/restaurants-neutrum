import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'

export default async function NutritionLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const role = user?.app_metadata?.role
  if (!user || (role !== 'nutritionist' && role !== 'platform_admin')) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-white border-r flex flex-col p-4">
        <div className="mb-6">
          <h1 className="font-bold text-lg">Editor Nutricional</h1>
          <p className="text-xs text-gray-500 mt-1">{user.email}</p>
        </div>
        <Link href="/nutrition/menus">
          <Button variant="ghost" className="w-full justify-start">Menus</Button>
        </Link>
      </aside>
      <main className="flex-1 bg-gray-50 overflow-auto">{children}</main>
    </div>
  )
}
