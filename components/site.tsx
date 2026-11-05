'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react'
import { ArrowUpRight, Compass, Globe2, Menu, Moon, Search, Sun, X } from 'lucide-react'
import { navItems, type Destination } from '@/lib/site-data'
import { DestinationImage } from '@/components/destination-image'
import { useSitePreferences } from '@/components/site-preferences'
import type { Message } from '@/lib/i18n'

const institutions = [
  { image: '/images/branding/universitas-muhammadiyah-makassar.webp', label: 'Universitas Muhammadiyah Makassar' },
  { image: '/images/branding/ukm-bahasa.webp', label: 'UKM BAHASA' },
  { image: '/images/branding/aksara-berdampak.webp', label: 'Aksara Berdampak' },
] satisfies { image: string; label: Message }[]

function DisplayControls() {
  const { language, theme, setLanguage, setTheme, t } = useSitePreferences()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  return (
    <div className="display-controls">
      <div className="language-switch" role="group" aria-label={t('Bahasa tampilan')}>
        <Globe2 size={15} aria-hidden="true" />
        {(['id', 'en'] as const).map((item) => (
          <button
            type="button"
            key={item}
            lang={item}
            aria-label={item === 'id' ? 'Bahasa Indonesia' : 'English'}
            aria-pressed={language === item}
            disabled={pending}
            onClick={() => {
              if (language === item) return
              setLanguage(item)
              startTransition(() => router.refresh())
            }}
          >
            {item.toUpperCase()}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="theme-switch"
        aria-label={t(theme === 'dark' ? 'Aktifkan mode siang' : 'Aktifkan mode malam')}
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
        <span>{t(theme === 'dark' ? 'Malam' : 'Siang')}</span>
      </button>
    </div>
  )
}

export function Header() {
  const [open, setOpen] = useState(false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()
  const { t, content } = useSitePreferences()

  useEffect(() => {
    if (!open) return
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        menuButton.current?.focus()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [open])

  return (
    <header className="site-header">
      <div className="institution-bar">
        <div className="institution-inner">
          <div className="institution-signature">
            <span>{t('Dikelola oleh')}</span>
            <strong>{t('UKM BAHASA')} <span>{t('Universitas Muhammadiyah Makassar')}</span></strong>
          </div>
          <Watermark compact />
        </div>
      </div>
      <div className="nav-wrap">
        <Link href="/" className="brand" onClick={() => setOpen(false)}>
          <span className="brand-mark">B</span>
          <span>Bontomarannu<small>{t('Desa Wisata · Selayar')}</small></span>
        </Link>
        <nav id="site-navigation" aria-label={t('Navigasi utama')} className={open ? 'main-nav open' : 'main-nav'}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={pathname === item.href ? 'active' : undefined}
              aria-current={pathname === item.href ? 'page' : undefined}
              onClick={() => setOpen(false)}
            >
              {content(item.label)}
            </Link>
          ))}
          <Link href="/reservasi" className="nav-cta" onClick={() => setOpen(false)}>
            {t('Reservasi kunjungan')} <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </nav>
        <DisplayControls />
        <button
          ref={menuButton}
          type="button"
          className="menu-toggle"
          aria-label={t(open ? 'Tutup menu' : 'Buka menu')}
          aria-expanded={open}
          aria-controls="site-navigation"
          onClick={() => setOpen(!open)}
        >
          {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </button>
      </div>
    </header>
  )
}

export function Watermark({ compact = false }: { compact?: boolean }) {
  const { t } = useSitePreferences()
  return (
    <aside className={compact ? 'institution-logos compact' : 'institution-logos'} aria-label={t('Kampus, lembaga, dan tim pendukung')}>
      {institutions.map((institution) => (
        <div className="institution-logo" key={institution.image}>
          <span className="institution-logo-image">
            <img src={institution.image} alt={t(institution.label)} width={64} height={64} />
          </span>
          {!compact && <span>{t(institution.label)}</span>}
        </div>
      ))}
    </aside>
  )
}

export function Footer() {
  const { t } = useSitePreferences()
  return (
    <footer className="footer">
      <div className="footer-grid">
        <div>
          <div className="brand footer-brand">
            <span className="brand-mark">B</span>
            <span>Bontomarannu<small>{t('Desa Wisata · Selayar')}</small></span>
          </div>
          <p>{t('Temukan alam, telusuri sejarah,')}<br />{t('kenali Bontomarannu.')}</p>
        </div>
        <div>
          <h2 className="footer-label">{t('Jelajahi')}</h2>
          <Link href="/destinasi">{t('Destinasi')}</Link>
          <Link href="/sejarah-budaya">{t('Sejarah & Budaya')}</Link>
          <Link href="/agrowisata">{t('Agrowisata')}</Link>
          <Link href="/peta">{t('Peta Jelajah')}</Link>
        </div>
        <div>
          <h2 className="footer-label">{t('Informasi')}</h2>
          <Link href="/panduan-berkunjung">{t('Panduan berkunjung')}</Link>
          <Link href="/galeri">{t('Galeri')}</Link>
          <Link href="/kontak">{t('Kontak')}</Link>
          <Link href="/reservasi">{t('Reservasi wisata')}</Link>
          <Link href="/login">{t('Area pengelola')}</Link>
        </div>
      </div>
      <div className="footer-stewardship">
        <div>
          <p className="footer-label">{t('Kolaborasi untuk desa')}</p>
          <strong>{t('Dikelola oleh')} {t('UKM BAHASA')}</strong>
          <p>{t('Universitas Muhammadiyah Makassar')}</p>
        </div>
        <Watermark />
      </div>
      <div className="footer-bottom">
        <span>© 2026 {t('Desa Wisata Bontomarannu')}</span>
        <span>{t('Data disusun dengan verifikasi bertahap')}</span>
      </div>
    </footer>
  )
}

export function DestinationCard({ destination, featured = false }: { destination: Destination; featured?: boolean }) {
  const { t, content } = useSitePreferences()
  return (
    <Link
      href={`/destinasi/${destination.slug}`}
      className={featured ? 'destination-card featured' : 'destination-card'}
      data-category={destination.category}
    >
      <div className="card-image">
        <DestinationImage src={destination.image} alt={destination.name} />
        <span className="image-tag">{content(destination.category)}</span>
      </div>
      <div className="card-copy">
        <p className="eyebrow">{content(destination.eyebrow)}</p>
        <h3>{destination.name}</h3>
        <p>{content(destination.description)}</p>
        <span className="text-link">{t('Lihat destinasi')} <ArrowUpRight size={17} aria-hidden="true" /></span>
      </div>
    </Link>
  )
}

export function DestinationDirectory({ destinations }: { destinations: Destination[] }) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Semua')
  const { t, content } = useSitePreferences()
  const categories = ['Semua', ...Array.from(new Set(destinations.map((destination) => destination.category))).sort()]
  const filtered = destinations.filter((destination) =>
    (filter === 'Semua' || destination.category === filter) &&
    destination.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  )
  return (
    <>
      <div className="directory-tools">
        <div className="search-box">
          <Search size={18} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Cari destinasi...')} aria-label={t('Cari destinasi')} />
        </div>
        <div className="filters">
          {categories.map((category) => (
            <button type="button" key={category} aria-pressed={filter === category} className={filter === category ? 'active' : ''} onClick={() => setFilter(category)}>
              {content(category)}
            </button>
          ))}
        </div>
      </div>
      <div className="destination-grid">{filtered.map((destination) => <DestinationCard key={destination.slug} destination={destination} />)}</div>
      {filtered.length === 0 && <p className="empty-state" role="status">{t('Destinasi belum ditemukan. Coba kata kunci lain.')}</p>}
    </>
  )
}

const pageTones: Record<string, string> = {
  '/destinasi': 'forest',
  '/profil': 'forest',
  '/sejarah-budaya': 'clay',
  '/agrowisata': 'sand',
  '/peta': 'ocean',
  '/pusat-data': 'ocean',
  '/kontak': 'ocean',
  '/reservasi': 'sand',
}

export function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: ReactNode; text: string }) {
  const pathname = usePathname()
  const { t, content } = useSitePreferences()
  return (
    <section className="page-intro" data-tone={pageTones[pathname] || 'forest'}>
      <div className="page-intro-inner">
        <div>
          <p className="eyebrow">{content(eyebrow)}</p>
          <h1>{typeof title === 'string' ? content(title) : title}</h1>
          <p className="intro-text">{content(text)}</p>
        </div>
        <div className="page-intro-art" aria-hidden="true">
          <span className="contour contour-one" />
          <span className="contour contour-two" />
          <span className="contour contour-three" />
          <Compass size={72} strokeWidth={1} />
          <span>BONTOMARANNU<br />SELAYAR</span>
          <small>{t('Alam. Cerita. Kehidupan.')}</small>
        </div>
      </div>
    </section>
  )
}

export function Notice({ children }: { children: ReactNode }) {
  const { content } = useSitePreferences()
  return <div className="notice"><span className="notice-dot" aria-hidden="true" /><span>{typeof children === 'string' ? content(children) : children}</span></div>
}
