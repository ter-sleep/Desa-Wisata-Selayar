'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, MapPin, Images, MapPinned, CalendarDays, Mail, Settings, Database } from 'lucide-react'

const items = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/destinasi', label: 'Data destinasi', icon: MapPin, exact: false },
  { href: '/admin/pusat-data', label: 'Pusat Data', icon: Database, exact: false },
  { href: '/admin/galeri', label: 'Galeri dan foto', icon: Images, exact: false },
  { href: '/admin/peta', label: 'Koordinat GPS', icon: MapPinned, exact: false },
  { href: '/admin/reservasi', label: 'Reservasi wisata', icon: CalendarDays, exact: false },
  { href: '/admin/pesan', label: 'Pesan pengunjung', icon: Mail, exact: false },
  { href: '/admin/pengaturan', label: 'Pengaturan publik', icon: Settings, exact: false },
]

export function AdminNavigation() {
  const pathname = usePathname()

  return (
    <>
      <p className="admin-nav-label">MENU UTAMA</p>
      {items.map((item) => {
        const Icon = item.icon
        const active = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link key={item.href} href={item.href} className={`admin-nav-link${active ? ' active' : ''}`} aria-current={active ? 'page' : undefined}>
            <Icon size={18} /> {item.label}
          </Link>
        )
      })}
    </>
  )
}
