import type { ReactNode } from 'react'
import { AdminShell } from '@/components/admin/admin-shell'
import { requireStaffProfile } from '@/lib/auth/permissions'

export const metadata = {
  title: 'Dashboard Pengelola | Bontomarannu',
  robots: { index: false, follow: false },
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireStaffProfile()
  return <AdminShell profile={profile}>{children}</AdminShell>
}
