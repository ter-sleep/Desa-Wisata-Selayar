'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import { STAFF_ROLES, type StaffRole } from '@/lib/auth/permissions'

function getText(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value : ''
}

export async function signIn(formData: FormData) {
  if (!isSupabaseConfigured()) redirect('/login?error=setup')

  const email = getText(formData, 'email').trim().toLowerCase()
  const password = getText(formData, 'password')

  if (!email || !password) redirect('/login?error=invalid-input')

  const supabase = await createClient()
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })

  if (signInError) redirect('/login?error=invalid-credentials')

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || typeof userId !== 'string' || !userId) {
    await supabase.auth.signOut()
    redirect('/login?error=unauthorized')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', userId)
    .maybeSingle()

  const role = profile?.role as StaffRole | undefined
  if (profileError || !profile || !profile.is_active || !role || !STAFF_ROLES.includes(role)) {
    await supabase.auth.signOut()
    redirect('/login?error=unauthorized')
  }

  redirect('/admin')
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    await supabase.auth.signOut()
  }
  redirect('/login?status=signed-out')
}
