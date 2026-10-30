import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  // Rutas protegidas por rol
  const isDashboard = pathname.startsWith('/dashboard')
  const isAdmin = pathname.startsWith('/admin')
  const isNutrition = pathname.startsWith('/nutrition')
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register')

  if (!user && (isDashboard || isAdmin || isNutrition)) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard/menus'
    return NextResponse.redirect(url)
  }

  if (user) {
    const role = user.app_metadata?.role as string | undefined

    if (isAdmin && role !== 'platform_admin') {
      return NextResponse.redirect(new URL('/dashboard/menus', request.url))
    }

    if (isNutrition && role !== 'nutritionist' && role !== 'platform_admin') {
      return NextResponse.redirect(new URL('/dashboard/menus', request.url))
    }

    if (isDashboard && role !== 'restaurant_owner' && role !== 'platform_admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}
