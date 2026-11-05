'use client'

import { useState } from 'react'
import { ArrowUpRight, CheckCircle2, CircleDashed, Database, Download, Search } from 'lucide-react'
import Link from 'next/link'
import { PageIntro } from '@/components/site'
import { useSitePreferences } from '@/components/site-preferences'
import type { Destination } from '@/lib/site-data'

export function PublicDataCenter({ destinations }: { destinations: Destination[] }) {
  const { t, content } = useSitePreferences()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Semua')
  const filtered = destinations.filter((destination) =>
    (filter === 'Semua' || destination.category === filter) &&
    destination.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  )
  const filters = ['Semua', ...Array.from(new Set(destinations.map((destination) => destination.category))).sort()]

  function downloadSummary() {
    const header = [t('Nama destinasi'), 'Slug', t('Kategori'), t('Sumber data'), t('Status data'), t('Pembaruan')]
    const values = filtered.map((destination) => [
      destination.name, destination.slug, content(destination.category),
      content(destination.dataSource), content(destination.dataStatus), destination.updatedYear,
    ])
    const csv = [header, ...values].map((line) => line.map((value) => `"${String(value || '').replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'data-destinasi-bontomarannu.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const verifiedCount = destinations.filter((destination) => destination.coordinates?.verificationStatus === 'verified').length
  const needsReview = destinations.length - verifiedCount
  const datasets = [
    { title: t('Destinasi wisata'), count: t('{count} entri', { count: destinations.length }), label: t('Master destinasi') },
    { title: t('Aset visual & data'), count: t('Dokumentasi pengelola'), label: t('Inventaris media') },
    { title: t('Koordinat GPS'), count: t('{count} terverifikasi', { count: verifiedCount }), label: t('Pemetaan lokasi') },
    { title: t('Fasilitas & layanan'), count: t('Perlu inventaris'), label: t('Audit lapangan') },
  ]

  return (
    <main className="page-shell data-center">
      <PageIntro eyebrow="Pusat data pariwisata" title={t('Data yang membantu perjalanan.')} text="Ringkasan data destinasi dan kesiapan informasi Bontomarannu. Gunakan dashboard ini sebagai titik awal sebelum kunjungan dan survei lapangan." />
      <section className="data-summary" aria-label={t('Ringkasan data')}>
        <div><span className="summary-label">{t('Destinasi terpublikasi')}</span><strong>{String(destinations.length).padStart(2, '0')}</strong><small>{t('entri dari database')}</small></div>
        <div><span className="summary-label">{t('Koordinat terverifikasi')}</span><strong>{String(verifiedCount).padStart(2, '0')}</strong><small>{t('titik GPS valid')}</small></div>
        <div><span className="summary-label">{t('Perlu verifikasi GPS')}</span><strong>{String(needsReview).padStart(2, '0')}</strong><small>{t('belum terverifikasi')}</small></div>
        <div><span className="summary-label">{t('Kategori terdata')}</span><strong>{String(new Set(destinations.map((item) => item.category)).size).padStart(2, '0')}</strong><small>{t('kategori destinasi')}</small></div>
      </section>
      <section className="data-section">
        <div className="section-heading">
          <div><p className="eyebrow">{t('Katalog data')}</p><h2>{t('Destinasi & status informasi')}</h2></div>
          <button type="button" className="download-button" onClick={downloadSummary}><Download size={15} /> {t('Unduh CSV')}</button>
        </div>
        <div className="data-toolbar">
          <div className="search-box light"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('Cari destinasi...')} aria-label={t('Cari data destinasi')} /></div>
          <div className="filters light-filters">
            {filters.map((item) => <button type="button" key={item} aria-pressed={filter === item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{content(item)}</button>)}
          </div>
        </div>
        <div className="data-table-wrap">
          <table className="data-table">
            <thead><tr><th>{t('Destinasi')}</th><th>{t('Kategori')}</th><th>{t('Sumber')}</th><th>{t('Status')}</th><th>{t('Pembaruan')}</th></tr></thead>
            <tbody>
              {filtered.map((destination) => (
                <tr key={destination.slug}>
                  <td><Link href={`/destinasi/${destination.slug}`} className="table-link">{destination.name}<ArrowUpRight size={14} /></Link></td>
                  <td>{content(destination.category)}</td>
                  <td>{content(destination.dataSource)}</td>
                  <td><span className={destination.dataStatus.toLowerCase().includes('terverifikasi') ? 'status-pill ready' : 'status-pill'}>{destination.dataStatus.toLowerCase().includes('verifikasi') ? <CircleDashed size={13} /> : <CheckCircle2 size={13} />} {content(destination.dataStatus)}</span></td>
                  <td>{destination.updatedYear}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="empty-state" role="status">{t('Data tidak ditemukan.')}</p>}
        </div>
      </section>
      <section className="data-section">
        <div className="section-heading"><div><p className="eyebrow">{t('Modul inventaris')}</p><h2>{t('Bangun data bersama.')}</h2></div><Database className="section-icon" size={34} /></div>
        <div className="dataset-grid">
          {datasets.map((dataset) => <article className="dataset-card" key={dataset.title}><p>{dataset.label}</p><h3>{dataset.title}</h3><span>{dataset.count}</span><span className="dataset-detail">{t('Data bersumber dari database pengelola.')}</span></article>)}
        </div>
      </section>
      <div className="data-note"><strong>{t('Catatan metodologi')}</strong><span>{t('Status menunjukkan tingkat kesiapan informasi publik, bukan penilaian kualitas destinasi. Seluruh data perlu dikonfirmasi bersama pemerintah desa, pengelola, dan masyarakat.')}</span></div>
    </main>
  )
}
