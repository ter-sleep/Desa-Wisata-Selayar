import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { requireSupabasePublicEnv } from './env'

export async function createClient() {
  const { url, publishableKey } = requireSupabasePublicEnv()
  const cookieStore = await cookies()

  return createServerClient<Database>(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Components tidak dapat menulis cookie.
          // Proxy menangani refresh sesi pada request yang cocok.
        }
      },
    },
  })
}
