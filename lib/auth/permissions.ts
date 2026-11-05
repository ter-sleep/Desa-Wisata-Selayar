import 'server-only'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'

export const STAFF_ROLES = ['super_admin', 'admin', 'editor'] as const
export type StaffRole = (typeof STAFF_ROLES)[number]
export type AppRole = StaffRole | 'visitor'

export type CurrentProfile = {
  id: string
  full_name: string | null
  role: AppRole
  is_active: boolean
  avatar_url: string | null
}

export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  if (!isSupabaseConfigured()) return null

  const supabase = await createClient()
  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims()
  const userId = claimsData?.claims?.sub

  if (claimsError || typeof userId !== 'string' || !userId) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, role, is_active, avatar_url')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error('Gagal membaca profil pengelola.', { code: error.code })
    return null
  }
  if (!data) return null
  return data as CurrentProfile
}

export async function requireStaffProfile(): Promise<CurrentProfile> {
  if (!isSupabaseConfigured()) redirect('/login?error=setup')

  const profile = await getCurrentProfile()
  if (!profile || !profile.is_active || !STAFF_ROLES.includes(profile.role as StaffRole)) {
    redirect('/login?error=unauthorized')
  }

  return profile
}
