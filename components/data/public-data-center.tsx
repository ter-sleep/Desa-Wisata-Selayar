'use client'

import { useMemo, useState } from 'react'
import { ArrowUpRight, CheckCircle2, CircleDashed, Database, Download, Search } from 'lucide-react'
import Link from 'next/link'
import { PageIntro } from '@/components/site'
import type { Destination } from '@/lib/site-data'

export function PublicDataCenter({ destinations }: { destinations: Destination[] }) {
  const rows = destinations.map((destination) => ({
    slug: destination.slug,
    name: destination.name,
    type: destination.category,
    source: destination.dataSource,
    status: destination.dataStatus,
    updated: destination.updatedYear,
  }))
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('Semua')
  const filtered = useMemo(() => rows.filter((row) => (filter === 'Semua' || row.type === filter) && row.name.toLowerCase().includes(query.toLowerCase())), [rows, query, filter])
  const filters = ['Semua', ...Array.from(new Set(rows.map((row) => row.type))).sort()]

  function downloadSummary() {
    const header = ['Nama destinasi', 'Slug', 'Kategori', 'Sumber data', 'Status data', 'Pembaruan']
    const values = filtered.map((row) => [row.name, row.slug, row.type, row.source, row.status, row.updated])
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

  return <main className="page-shell data-center"><PageIntro eyebrow="Pusat data pariwisata" title="Data yang membantu perjalanan." text="Ringkasan data destinasi dan kesiapan informasi Bontomarannu. Gunakan dashboard ini sebagai titik awal sebelum kunjungan dan survei lapangan." />
    <section className="data-summary" aria-label="Ringkasan data"><div><span className="summary-label">Destinasi terpublikasi</span><strong>{String(destinations.length).padStart(2, '0')}</strong><small>entri dari database</small></div><div><span className="summary-label">Koordinat terverifikasi</span><strong>{String(verifiedCount).padStart(2, '0')}</strong><small>titik GPS valid</small></div><div><span className="summary-label">Perlu verifikasi GPS</span><strong>{String(needsReview).padStart(2, '0')}</strong><small>belum terverifikasi</small></div><div><span className="summary-label">Kategori terdata</span><strong>{String(new Set(destinations.map((item) => item.category)).size).padStart(2, '0')}</strong><small>kategori destinasi</small></div></section>
    <section className="data-section"><div className="section-heading"><div><p className="eyebrow">Katalog data</p><h2>Destinasi & status informasi</h2></div><button className="download-button" onClick={downloadSummary}><Download size={15}/> Unduh CSV</button></div>
      <div className="data-toolbar"><div className="search-box light"><Search size={17}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari destinasi..." aria-label="Cari data destinasi" /></div><div className="filters light-filters">{filters.map(item => <button key={item} className={filter === item ? 'active' : ''} onClick={() => setFilter(item)}>{item}</button>)}</div></div>
      <div className="data-table-wrap"><table className="data-table"><thead><tr><th>Destinasi</th><th>Kategori</th><th>Sumber</th><th>Status</th><th>Pembaruan</th></tr></thead><tbody>{filtered.map(row => <tr key={row.slug}><td><Link href={`/destinasi/${row.slug}`} className="table-link">{row.name}<ArrowUpRight size={14}/></Link></td><td>{row.type}</td><td>{row.source}</td><td><span className={row.status.toLowerCase().includes('terverifikasi') ? 'status-pill ready' : 'status-pill'}>{row.status.toLowerCase().includes('verifikasi') ? <CircleDashed size={13}/> : <CheckCircle2 size={13}/>} {row.status}</span></td><td>{row.updated}</td></tr>)}</tbody></table>{filtered.length === 0 && <p className="empty-state">Data tidak ditemukan.</p>}</div></section>
    <section className="data-section"><div className="section-heading"><div><p className="eyebrow">Modul inventaris</p><h2>Bangun data bersama.</h2></div><Database className="section-icon" size={34}/></div><div className="dataset-grid">{[['Destinasi wisata', `${destinations.length} entri`, 'Master destinasi'], ['Aset visual & data', 'Dikembangkan tahap 4', 'Inventaris media'], ['Koordinat GPS', `${verifiedCount} terverifikasi`, 'Pemetaan lokasi'], ['Fasilitas & layanan', 'Perlu inventaris', 'Audit lapangan']].map(([title, count, label]) => <article className="dataset-card" key={title}><p>{label}</p><h3>{title}</h3><span>{count}</span><div className="progress-line"><i /></div><span className="dataset-detail">Data bersumber dari database pengelola.</span></article>)}</div></section>
    <div className="data-note"><strong>Catatan metodologi</strong><span>Status menunjukkan tingkat kesiapan informasi publik, bukan penilaian kualitas destinasi. Seluruh data perlu dikonfirmasi bersama pemerintah desa, pengelola, dan masyarakat.</span></div>
    <style jsx global>{` .data-center{background:var(--cream)}.data-summary{max-width:1176px;margin:0 auto 90px;display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid var(--line);border-bottom:1px solid var(--line)}.data-summary>div{padding:25px 24px;border-right:1px solid var(--line)}.data-summary>div:last-child{border-right:0}.summary-label{display:block;color:var(--muted);font-size:10px;letter-spacing:.12em;text-transform:uppercase}.data-summary strong{display:block;color:var(--forest);font:500 50px/1 'Playfair Display',serif;margin:12px 0 3px}.data-summary small{color:var(--muted);font-size:11px}.data-section{max-width:1176px;margin:0 auto 90px}.section-heading{display:flex;justify-content:space-between;align-items:end;margin-bottom:28px}.section-heading h2{font:500 clamp(34px,4vw,52px)/1 'Playfair Display',serif;letter-spacing:-.06em;margin:12px 0 0}.download-button{display:flex;align-items:center;gap:8px;border:1px solid var(--forest);background:transparent;color:var(--forest);padding:12px 15px;font-size:11px;cursor:pointer}.data-toolbar{display:flex;justify-content:space-between;gap:20px;align-items:center;margin-bottom:18px}.search-box.light{border-color:var(--line);background:var(--paper);color:var(--muted)}.light-filters{flex-wrap:wrap}.light-filters button{color:var(--muted);border-color:var(--line)}.light-filters button.active{background:var(--forest);color:#fff;border-color:var(--forest)}.data-table-wrap{overflow-x:auto;background:var(--paper);border:1px solid var(--line)}.data-table{border-collapse:collapse;width:100%;min-width:820px;font-size:12px}.data-table th{text-align:left;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.1em;font-weight:600;background:#efeee8}.data-table th,.data-table td{padding:17px 18px;border-bottom:1px solid var(--line)}.data-table tr:last-child td{border-bottom:0}.table-link{display:flex;align-items:center;gap:5px;color:var(--forest);font-weight:600}.status-pill{display:inline-flex;align-items:center;gap:5px;color:#90724f}.status-pill.ready{color:#4b7456}.dataset-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.dataset-card{background:#e9e8df;padding:22px;min-height:210px}.dataset-card p{margin:0;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.12em}.dataset-card h3{font:500 26px/1.05 'Playfair Display',serif;margin:30px 0 10px;color:var(--forest)}.dataset-card span{font-size:12px;color:var(--muted)}.progress-line{height:3px;background:#d3d4cc;margin:25px 0}.progress-line i{display:block;width:42%;height:100%;background:var(--sand)}.section-icon{color:var(--forest);opacity:.45}.data-note{max-width:1176px;margin:0 auto 60px;padding:18px 0;border-top:1px solid var(--line);display:flex;gap:30px;color:var(--muted);font-size:12px;line-height:1.6}.data-note strong{color:var(--forest);min-width:150px}@media(max-width:760px){.data-summary{grid-template-columns:repeat(2,1fr);margin-bottom:55px}.data-summary>div{border-bottom:1px solid var(--line)}.data-summary>div:nth-child(2){border-right:0}.data-section{margin-bottom:55px}.section-heading{align-items:start;gap:20px;flex-direction:column}.data-toolbar{align-items:stretch;flex-direction:column}.dataset-grid{grid-template-columns:1fr 1fr}.data-note{display:block}.data-note strong{display:block;margin-bottom:10px}}`}</style>
  </main>
}
