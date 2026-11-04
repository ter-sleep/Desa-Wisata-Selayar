import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeft, LogOut, ShieldCheck } from 'lucide-react'
import { AdminNavigation } from '@/components/admin/admin-navigation'
import { signOut } from '@/app/login/actions'
import type { CurrentProfile } from '@/lib/auth/permissions'

const roleLabels: Record<CurrentProfile['role'], string> = {
  super_admin: 'Super Admin',
  admin: 'Administrator',
  editor: 'Editor',
  visitor: 'Pengunjung',
}

export function AdminShell({ profile, children }: { profile: CurrentProfile; children: ReactNode }) {
  return (
    <div className="admin-layout">
      <aside className="admin-sidebar">
        <Link href="/" className="admin-brand">
          <span className="brand-mark">B</span>
          <span>DEWIS<small>Panel Pengelola</small></span>
        </Link>

        <AdminNavigation />

        <div className="admin-sidebar-bottom">
          <Link href="/" className="admin-nav-link"><ArrowLeft size={18} /> Lihat website</Link>
          <form action={signOut}>
            <button type="submit" className="admin-nav-link admin-logout"><LogOut size={18} /> Keluar</button>
          </form>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="admin-topbar-eyebrow">DESA WISATA BONTOMARANNU</p>
            <strong>Panel Pengelola</strong>
          </div>
          <div className="admin-user">
            <span className="admin-user-icon"><ShieldCheck size={18} /></span>
            <span><strong>{profile.full_name || 'Pengelola'}</strong><small>{roleLabels[profile.role]}</small></span>
          </div>
        </header>
        <main className="admin-content">{children}</main>
      </div>
    </div>
  )
}
