import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { getSupabasePublicEnv } from './env'

export async function updateSession(request: NextRequest) {
  const env = getSupabasePublicEnv()
  if (!env) return NextResponse.next({ request })

  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(env.url, env.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })

        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  // getClaims memverifikasi token dan memungkinkan SDK memperbarui sesi.
  // Otorisasi halaman tetap diperiksa ulang di server, bukan hanya di Proxy.
  await supabase.auth.getClaims()
  return response
}
