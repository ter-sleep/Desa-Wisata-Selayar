import { redirect } from 'next/navigation'
import { getCurrentProfile, STAFF_ROLES, type StaffRole } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

// Pusat Data kini hanya untuk pengelola. Alamat lama diarahkan ke panel admin
// (jika sudah login sebagai staf) atau ke halaman login.
export default async function DataCenterPage() {
  const profile = await getCurrentProfile()
  const isStaff = Boolean(profile?.is_active && STAFF_ROLES.includes(profile.role as StaffRole))
  redirect(isStaff ? '/admin/pusat-data' : '/login')
}
