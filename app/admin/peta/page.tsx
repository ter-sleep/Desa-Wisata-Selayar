import Link from 'next/link'
import { ArrowUpRight, CheckCircle2, Clock3, MapPinned, MapPinOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { hasVerifiedCoordinates } from '@/lib/gps-rules'
import type { Database } from '@/types/database'

export const dynamic = 'force-dynamic'

type DestinationRow = Database['public']['Tables']['destinations']['Row']

type SearchParams = Promise<{ status?: string; error?: string }>

const statusLabels: Record<DestinationRow['verification_status'], string> = {
  pending: 'Menunggu verifikasi',
  verified: 'Terverifikasi',
  rejected: 'Ditolak',
}

export default async function AdminGpsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .order('name', { ascending: true })

  const rows = (data || []) as DestinationRow[]
  const withCoordinates = rows.filter((row) => row.latitude !== null && row.longitude !== null)
  const verified = rows.filter(hasVerifiedCoordinates)
  const pending = withCoordinates.filter((row) => row.verification_status === 'pending' || (row.verification_status === 'verified' && !hasVerifiedCoordinates(row)))
  const rejected = withCoordinates.filter((row) => row.verification_status === 'rejected')
  const notices: Record<string, string> = {
    saved: 'Koordinat berhasil disimpan dan menunggu verifikasi.',
    verified: 'Koordinat destinasi berhasil diverifikasi.',
    rejected: 'Koordinat ditandai ditolak. Periksa catatan administrator.',
    cleared: 'Koordinat destinasi berhasil dihapus.',
  }

  return (
    <div className="admin-dashboard">
      <section className="admin-page-heading">
        <div>
          <p className="eyebrow">SISTEM INFORMASI GEOGRAFIS</p>
          <h1>Manajemen koordinat GPS</h1>
          <p>Catat koordinat hasil survei, pilih titik pada peta, lalu lakukan verifikasi sebelum dipublikasikan.</p>
        </div>
        <Link href="/peta" target="_blank" className="admin-button admin-button-secondary"><ArrowUpRight size={15} /> Lihat peta publik</Link>
      </section>

      {params.status && notices[params.status] && <div className="admin-form-success" role="status">{notices[params.status]}</div>}
      {params.error && <div className="admin-form-alert" role="alert">{params.error}</div>}
      {error && <div className="admin-setup-warning" role="alert">Data GPS gagal dibaca: {error.message}. Pastikan migration Tahap 2 dan Tahap 5 sudah dijalankan.</div>}

      <section className="admin-stat-grid gps-stat-grid" aria-label="Ringkasan koordinat">
        <article className="admin-stat-card"><span className="admin-stat-icon"><MapPinned size={20} /></span><p>Total destinasi</p><strong>{rows.length}</strong></article>
        <article className="admin-stat-card"><span className="admin-stat-icon"><MapPinOff size={20} /></span><p>Belum ada koordinat</p><strong>{rows.length - withCoordinates.length}</strong></article>
        <article className="admin-stat-card"><span className="admin-stat-icon"><Clock3 size={20} /></span><p>Menunggu verifikasi</p><strong>{pending.length}</strong></article>
        <article className="admin-stat-card"><span className="admin-stat-icon"><CheckCircle2 size={20} /></span><p>Terverifikasi</p><strong>{verified.length}</strong></article>
      </section>

      <div className="admin-list-summary gps-list-summary">
        <div><MapPinned size={18} /><span><strong>{withCoordinates.length}</strong> destinasi sudah memiliki koordinat</span></div>
        <span>{rejected.length} titik ditolak · hanya titik verified tampil publik</span>
      </div>

      <div className="admin-table-wrap">
        <table className="admin-table gps-admin-table">
          <thead><tr><th>Destinasi</th><th>Koordinat</th><th>Metode</th><th>Akurasi</th><th>Verifikasi</th><th>Publikasi</th><th>Aksi</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.name}</strong><small>/{row.slug}</small></td>
                <td>{row.latitude !== null && row.longitude !== null ? <><strong>{Number(row.latitude).toFixed(6)}, {Number(row.longitude).toFixed(6)}</strong><small>{row.coordinate_source || 'Sumber belum dicatat'}</small></> : 'Belum tersedia'}</td>
                <td>{row.coordinate_method === 'device_gps' ? 'GPS perangkat' : row.coordinate_method === 'map_pin' ? 'Pin peta' : row.coordinate_method === 'external_reference' ? 'Referensi eksternal' : '—'}</td>
                <td>{row.gps_accuracy_m !== null ? `±${Number(row.gps_accuracy_m).toLocaleString('id-ID')} m` : '—'}</td>
                <td><span className={`admin-status ${hasVerifiedCoordinates(row) ? 'admin-status-published' : row.verification_status === 'rejected' ? 'admin-status-archived' : 'admin-status-draft'}`}>{row.verification_status === 'verified' && !hasVerifiedCoordinates(row) ? 'Perlu tinjauan metadata' : statusLabels[row.verification_status]}</span></td>
                <td>{row.publication_status === 'published' ? 'Published' : row.publication_status === 'archived' ? 'Archived' : 'Draft'}</td>
                <td><div className="admin-row-actions"><Link href={`/admin/peta/${row.id}`} aria-label={`Atur koordinat ${row.name}`} title="Atur dan verifikasi GPS"><MapPinned size={16} /></Link></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="admin-table-note">Titik yang belum diverifikasi tidak ditampilkan pada peta publik, sekalipun destinasi berstatus Published.</p>
    </div>
  )
}
