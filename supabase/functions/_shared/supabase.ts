import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

/** Admin client — bypasses RLS. Use only inside Edge Functions. */
export function adminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}

/** User-scoped client — respects RLS using the caller's JWT. */
export function userClient(authHeader: string) {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  })
}

/** Extracts and verifies the Bearer JWT from an Authorization header. */
export async function getUserFromHeader(authHeader: string | null) {
  if (!authHeader) return null
  const client = userClient(authHeader)
  const { data: { user } } = await client.auth.getUser()
  return user
}
