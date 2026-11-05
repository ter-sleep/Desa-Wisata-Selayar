import Link from 'next/link'
import { CalendarDays, MessageCircle, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { updateReservation } from '@/lib/actions/visitor-management'
import { reservationTransitions, toWhatsAppDigits } from '@/lib/visitor-rules'
import type { ReservationStatus } from '@/types/database'

export const dynamic = 'force-dynamic'

const labels: Record<ReservationStatus, string> = {
  pending: 'Menunggu', confirmed: 'Dikonfirmasi', rejected: 'Ditolak', cancelled: 'Dibatalkan', completed: 'Selesai',
}
const filters: { value: string; label: string }[] = [
  { value: 'all', label: 'Semua' }, { value: 'pending', label: 'Menunggu' }, { value: 'confirmed', label: 'Dikonfirmasi' },
  { value: 'rejected', label: 'Ditolak' }, { value: 'cancelled', label: 'Dibatalkan' }, { value: 'completed', label: 'Selesai' },
]
function dateLabel(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeZone: 'Asia/Makassar' }).format(new Date(`${value}T00:00:00+08:00`))
}
export default async function AdminReservationsPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const baseQuery = supabase.from('reservations').select('*').order('created_at', { ascending: false })
  const selectedFilter = filters.find((item) => item.value === params.status)?.value
  const reservationsQuery = selectedFilter && selectedFilter !== 'all'
    ? baseQuery.eq('status', selectedFilter as ReservationStatus).limit(300)
    : baseQuery.limit(300)
  const [{ data, error }, { data: destinations, error: destinationsError }] = await Promise.all([
    reservationsQuery,
    supabase.from('destinations').select('id, name, slug'),
  ])
  const destinationMap = new Map<string, { id: string; name: string; slug: string }>((destinations || []).map((item) => [item.id, item] as const))
  const rows = data || []
  const activeFilter = filters.some((item) => item.value === params.status) ? params.status : 'all'

  return <div className="admin-page-stack">
    <section className="admin-page-heading">
      <div><p className="eyebrow">OPERASIONAL PENGUNJUNG</p><h1>Reservasi wisata</h1><p>Periksa permintaan kunjungan dan berikan keputusan konfirmasi dari panel pengelola.</p></div>
      <Link href="/reservasi" target="_blank" className="admin-button admin-button-secondary">Lihat formulir publik <CalendarDays size={15}/></Link>
    </section>
    {params.error && <div className="admin-form-alert" role="alert">{params.error}</div>}
    {params.status === 'updated' && <div className="admin-form-success">Status reservasi berhasil diperbarui.</div>}
    {error && <div className="admin-form-alert">Data reservasi gagal dimuat: {error.message}. Periksa migration dan kebijakan RLS.</div>}
    {destinationsError && <div className="admin-form-alert">Nama destinasi gagal dimuat: {destinationsError.message}.</div>}
    <div className="admin-list-summary"><div><CalendarDays size={18}/><strong>{rows.length}</strong><span>reservasi ditampilkan</span></div><span>Maksimal 300 data terbaru pada satu tampilan.</span></div>
    <nav className="admin-filter-tabs" aria-label="Filter status reservasi">
      {filters.map((item) => <Link key={item.value} href={item.value === 'all' ? '/admin/reservasi' : `/admin/reservasi?status=${item.value}`} className={activeFilter === item.value ? 'active' : ''}>{item.label}</Link>)}
    </nav>
    {rows.length === 0 && !error ? <div className="admin-empty-state"><CalendarDays size={30}/><strong>Belum ada reservasi pada filter ini.</strong><span>Permintaan dari formulir publik akan muncul di halaman ini.</span></div> : rows.length > 0 && (
      <div className="admin-booking-list">
        {rows.map((row) => {
          const destination = destinationMap.get(row.destination_id)
          const status = row.status as ReservationStatus
          const wa = toWhatsAppDigits(row.whatsapp)
          const message = encodeURIComponent(`Halo ${row.visitor_name}, kami dari pengelola Desa Wisata Bontomarannu. Kami menghubungi Anda terkait reservasi ${row.booking_code} untuk ${destination?.name || 'destinasi wisata'} pada ${dateLabel(row.visit_date)}.`)
          const actions = reservationTransitions[status]
          return <article className="admin-booking-card" key={row.id}>
            <div className="admin-booking-top">
              <div><span className="admin-booking-code">{row.booking_code}</span><small>Diterima {new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(new Date(row.created_at))}</small></div>
              <span className={`admin-status admin-booking-${status}`}>{labels[status]}</span>
            </div>
            <div className="admin-booking-grid">
              <div><small>PENGUNJUNG</small><strong>{row.visitor_name}</strong><span>{row.whatsapp}</span>{row.email && <a href={`mailto:${row.email}`}>{row.email}</a>}</div>
              <div><small>DESTINASI</small><strong>{destination?.name || 'Destinasi tidak ditemukan'}</strong><span>{dateLabel(row.visit_date)}</span><span>{row.participant_count} peserta</span></div>
              <div><small>CATATAN PENGUNJUNG</small><p>{row.visitor_notes || 'Tidak ada catatan tambahan.'}</p></div>
            </div>
            {row.admin_notes && <div className="admin-booking-note"><strong>Catatan pengelola:</strong> {row.admin_notes}</div>}
            <div className="admin-booking-actions">
              {wa && <a className="admin-button admin-button-secondary" href={`https://wa.me/${wa}?text=${message}`} target="_blank" rel="noreferrer"><MessageCircle size={14}/> Hubungi WhatsApp</a>}
              {actions.length > 0 ? <details className="admin-status-editor"><summary><RefreshCw size={14}/> Perbarui status</summary><form key={row.updated_at} action={updateReservation} className="admin-status-form"><input type="hidden" name="id" value={row.id}/><input type="hidden" name="updated_at" value={row.updated_at}/><label>Status berikutnya<select name="status" defaultValue={actions[0]}>{actions.map((item) => <option key={item} value={item}>{labels[item]}</option>)}</select></label><label>Catatan pengelola<textarea name="admin_notes" rows={2} maxLength={2000} defaultValue={row.admin_notes || ''} placeholder="Opsional: alasan atau informasi konfirmasi"/></label><button className="admin-button admin-button-primary" type="submit">Simpan perubahan</button></form></details> : <span className="admin-table-note">Tidak ada perubahan status lanjutan.</span>}
            </div>
          </article>
        })}
      </div>
    )}
  </div>
}
