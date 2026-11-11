import Link from 'next/link'
import { ArrowUpRight, MapPin, Pencil, Plus, MapPinned } from 'lucide-react'
import { DeleteDestinationButton } from '@/components/admin/delete-destination-button'
import { requireStaffProfile } from '@/lib/auth/permissions'
import { hasVerifiedCoordinates } from '@/lib/gps-rules'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export const dynamic = 'force-dynamic'

type DestinationRow = Database['public']['Tables']['destinations']['Row']
type SearchParams = Promise<{ status?: string; error?: string }>

const statusLabels: Record<DestinationRow['publication_status'], string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
}

export default async function AdminDestinationsPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, profile] = await Promise.all([searchParams, requireStaffProfile()])
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  const rows = (data || []) as DestinationRow[]
  const canDelete = profile.role === 'super_admin' || profile.role === 'admin'
  const notices: Record<string, string> = {
    created: 'Destinasi berhasil ditambahkan.',
    updated: 'Perubahan destinasi berhasil disimpan.',
    deleted: 'Destinasi berhasil dihapus.',
  }

  return (
    <div className="admin-dashboard">
      <section className="admin-page-heading">
        <div>
          <p className="eyebrow">MANAJEMEN KONTEN</p>
          <h1>Data destinasi</h1>
          <p>Kelola informasi, sumber data, dan status publikasi destinasi wisata.</p>
        </div>
        <Link href="/admin/destinasi/baru" className="admin-button admin-button-primary"><Plus size={16} /> Tambah destinasi</Link>
      </section>

      {params.status && notices[params.status] && <div className="admin-form-success" role="status">{notices[params.status]}</div>}
      {params.error && <div className="admin-form-alert" role="alert">{params.error}</div>}
      {error && <div className="admin-setup-warning" role="alert">Data destinasi belum dapat dibaca: {error.message}. Pastikan migration Tahap 2 dan Tahap 3 sudah dijalankan serta akun Anda memiliki role pengelola.</div>}

      <section className="admin-list-summary">
        <div><MapPin size={18} /><span><strong>{rows.length}</strong> total destinasi pada database</span></div>
        <span>Data diperbarui langsung dari PostgreSQL</span>
      </section>

      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Destinasi</th><th>Kategori</th><th>Urutan</th><th>Publikasi</th><th>Verifikasi GPS</th><th>Pembaruan</th><th>Aksi</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td><strong>{row.name}</strong><small>/{row.slug}</small></td>
                <td>{row.category}</td>
                <td>{row.sort_order}</td>
                <td><span className={`admin-status admin-status-${row.publication_status}`}>{statusLabels[row.publication_status]}</span></td>
                <td>{hasVerifiedCoordinates(row) ? 'Terverifikasi' : row.verification_status === 'verified' ? 'Perlu tinjauan metadata' : row.verification_status === 'rejected' ? 'Ditolak' : row.latitude !== null ? 'Menunggu verifikasi' : 'Belum ada koordinat'}</td>
                <td>{new Date(row.updated_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                <td>
                  <div className="admin-row-actions">
                    <Link href={`/destinasi/${row.slug}`} target="_blank" aria-label={`Lihat ${row.name}`} title="Lihat halaman publik"><ArrowUpRight size={16} /></Link>
                    <Link href={`/admin/destinasi/${row.id}/edit`} aria-label={`Edit ${row.name}`} title="Edit destinasi"><Pencil size={16} /></Link>
                    <Link href={`/admin/peta/${row.id}`} aria-label={`Atur GPS ${row.name}`} title="Atur koordinat GPS"><MapPinned size={16} /></Link>
                    {canDelete && <DeleteDestinationButton id={row.id} name={row.name} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && !error && <div className="admin-empty-state"><MapPin size={26} /><strong>Belum ada data destinasi.</strong><span>Mulai dengan menambahkan destinasi pertama atau jalankan migration seed Tahap 3.</span><Link href="/admin/destinasi/baru" className="admin-button admin-button-primary">Tambah destinasi</Link></div>}
      </div>
      <p className="admin-table-note">Penghapusan tidak tersedia untuk destinasi yang sudah memiliki riwayat reservasi. Gunakan status Archived untuk menyembunyikannya tanpa menghilangkan relasi data.</p>
    </div>
  )
}
