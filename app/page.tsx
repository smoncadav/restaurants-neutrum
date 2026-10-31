import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const role = user.app_metadata?.role

  if (role === 'platform_admin') redirect('/admin/restaurants')
  if (role === 'nutritionist') redirect('/nutrition/menus')

  redirect('/dashboard/menus')
}
