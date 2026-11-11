import Link from 'next/link'
import { ArrowLeft, CheckCircle2, Clock3, ExternalLink, MapPin, ShieldCheck, XCircle } from 'lucide-react'
import { notFound } from 'next/navigation'
import { GpsCoordinateForm } from '@/components/admin/gps-coordinate-form'
import { ClearCoordinatesButton } from '@/components/admin/clear-coordinates-button'
import { reviewDestinationCoordinates } from '@/lib/actions/gps'
import { requireStaffProfile } from '@/lib/auth/permissions'
import { hasVerifiedCoordinates } from '@/lib/gps-rules'
import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export const dynamic = 'force-dynamic'

type DestinationRow = Database['public']['Tables']['destinations']['Row']
type SearchParams = Promise<{ status?: string; error?: string }>

const statusLabels: Record<DestinationRow['verification_status'], string> = {
  pending: 'Menunggu verifikasi',
  verified: 'Terverifikasi',
  rejected: 'Ditolak',
}

const notices: Record<string, string> = {
  saved: 'Koordinat tersimpan dan berstatus menunggu verifikasi.',
  verified: 'Koordinat berhasil diverifikasi dan dapat muncul pada peta publik jika destinasi sudah Published.',
  rejected: 'Koordinat ditolak. Periksa catatan verifikasi sebelum mengirim titik yang diperbaiki.',
  cleared: 'Koordinat berhasil dihapus.',
}

export default async function AdminGpsDetailPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  const [{ id }, query, profile] = await Promise.all([params, searchParams, requireStaffProfile()])
  const supabase = await createClient()
  const { data, error } = await supabase.from('destinations').select('*').eq('id', id).maybeSingle()
  if (!data && !error) notFound()
  if (error || !data) {
    return <div className="admin-dashboard"><div className="admin-form-alert">Data destinasi gagal dibaca: {error?.message || 'Tidak ditemukan'}</div><Link href="/admin/peta" className="admin-back-link"><ArrowLeft size={14} /> Kembali ke manajemen GPS</Link></div>
  }

  const destination = data as DestinationRow
  const hasCoordinates = destination.latitude !== null && destination.longitude !== null
  const canReview = profile.role === 'admin' || profile.role === 'super_admin'
  const isVerified = hasVerifiedCoordinates(destination)
  const reviewIncomplete = destination.verification_status === 'verified' && !isVerified

  return (
    <div className="admin-dashboard">
      <Link href="/admin/peta" className="admin-back-link"><ArrowLeft size={14} /> Kembali ke manajemen GPS</Link>
      <section className="admin-page-heading">
        <div>
          <p className="eyebrow">KOORDINAT DESTINASI</p>
          <h1>{destination.name}</h1>
          <p>Catat titik berdasarkan survei lapangan atau sumber rujukan yang dapat diverifikasi.</p>
        </div>
        <span className={`admin-status ${isVerified ? 'admin-status-published' : destination.verification_status === 'rejected' ? 'admin-status-archived' : 'admin-status-draft'}`}>{reviewIncomplete ? 'Perlu tinjauan metadata' : statusLabels[destination.verification_status]}</span>
      </section>

      {query.status && notices[query.status] && <div className="admin-form-success" role="status">{notices[query.status]}</div>}
      {query.error && <div className="admin-form-alert" role="alert">{query.error}</div>}
      {reviewIncomplete && <div className="admin-setup-warning" role="alert">Data GPS lama belum memiliki identitas dan waktu pemeriksaan yang lengkap. Admin perlu memeriksanya kembali sebelum marker tampil kepada publik.</div>}

      <section className="admin-next-card gps-destination-context">
        <div>
          <p className="eyebrow">STATUS DESTINASI</p>
          <h2>{destination.publication_status === 'published' ? 'Sudah dipublikasikan' : destination.publication_status === 'archived' ? 'Diarsipkan' : 'Masih berupa draft'}</h2>
          <p>{destination.publication_status === 'published' ? 'Koordinat yang berstatus terverifikasi dapat ditampilkan pada peta publik.' : 'Walaupun GPS terverifikasi, marker tidak akan ditampilkan sampai destinasi berstatus Published.'}</p>
        </div>
        {destination.publication_status === 'published' ? (
          <Link href={`/destinasi/${destination.slug}`} target="_blank" className="admin-phase-tag">Lihat destinasi <ExternalLink size={13} /></Link>
        ) : <span className="admin-phase-tag gps-unpublished-label">Belum tersedia untuk publik</span>}
      </section>

      <section className="admin-media-section gps-section">
        <div className="admin-form-heading">
          <p className="eyebrow">1 · PENCATATAN LOKASI</p>
          <h2>Koordinat GPS</h2>
          <p>Gunakan tombol GPS saat petugas berada di lokasi. Alternatifnya, pilih titik pada peta atau masukkan koordinat dari referensi resmi.</p>
        </div>
        {hasCoordinates && (
          <div className="gps-current-card">
            <MapPin size={19} />
            <div><strong>{Number(destination.latitude).toFixed(7)}, {Number(destination.longitude).toFixed(7)}</strong><small>{destination.coordinate_source || 'Sumber belum dicatat'} · {destination.gps_accuracy_m !== null ? `akurasi ±${Number(destination.gps_accuracy_m).toLocaleString('id-ID')} m` : 'akurasi tidak dicatat'}</small></div>
          </div>
        )}
        <GpsCoordinateForm
          key={destination.updated_at}
          id={destination.id}
          updatedAt={destination.updated_at}
          latitude={destination.latitude === null ? null : Number(destination.latitude)}
          longitude={destination.longitude === null ? null : Number(destination.longitude)}
          accuracyMeters={destination.gps_accuracy_m === null ? null : Number(destination.gps_accuracy_m)}
          source={destination.coordinate_source}
          method={destination.coordinate_method}
        />
        {hasCoordinates && <ClearCoordinatesButton id={destination.id} updatedAt={destination.updated_at} />}
      </section>

      <section className="admin-media-section gps-section">
        <div className="admin-form-heading">
          <p className="eyebrow">2 · PEMERIKSAAN ADMINISTRATOR</p>
          <h2>Verifikasi koordinat</h2>
          <p>Periksa apakah titik benar-benar berada di area destinasi, bukan sekadar pusat desa, jalan umum, atau lokasi yang diperkirakan.</p>
        </div>
        <div className="gps-review-current">
          <div className="gps-review-status"><span className={`admin-status ${isVerified ? 'admin-status-published' : destination.verification_status === 'rejected' ? 'admin-status-archived' : 'admin-status-draft'}`}>{reviewIncomplete ? 'Perlu tinjauan metadata' : statusLabels[destination.verification_status]}</span><span>{destination.reviewed_at ? `Diperiksa ${new Date(destination.reviewed_at).toLocaleString('id-ID')}` : 'Belum pernah diperiksa'}</span></div>
          {destination.verification_note && <p><strong>Catatan sebelumnya:</strong> {destination.verification_note}</p>}
        </div>
        {canReview && hasCoordinates ? (
          <form key={destination.updated_at} action={reviewDestinationCoordinates} className="admin-form gps-review-form">
            <input type="hidden" name="id" value={destination.id} />
            <input type="hidden" name="updated_at" value={destination.updated_at} />
            <label className="admin-field">
              <span>Catatan pemeriksaan <b>*</b></span>
              <textarea name="verification_note" minLength={5} maxLength={1000} rows={3} required defaultValue={destination.verification_note || ''} placeholder="Contoh: Titik sesuai dengan hasil survei lapangan dan penanda lokasi destinasi." />
            </label>
            <div className="gps-review-actions">
              <button type="submit" name="decision" value="verified" className="admin-button admin-button-primary"><CheckCircle2 size={15} /> Verifikasi koordinat</button>
              <button type="submit" name="decision" value="rejected" className="admin-button admin-button-danger"><XCircle size={15} /> Tolak koordinat</button>
            </div>
          </form>
        ) : !canReview ? (
          <div className="admin-setup-warning"><ShieldCheck size={17} /> Akun Editor dapat mengusulkan koordinat, tetapi hanya Admin atau Super Admin yang dapat memverifikasi.</div>
        ) : (
          <div className="admin-setup-warning"><Clock3 size={17} /> Koordinat harus disimpan terlebih dahulu sebelum dapat diperiksa.</div>
        )}
      </section>
    </div>
  )
}
