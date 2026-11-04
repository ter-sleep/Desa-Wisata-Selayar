import Link from 'next/link'
import { ArrowUpRight, Images, MapPin, MessageSquare, CalendarDays, ShieldCheck, MapPinned, Mail, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

async function getCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: 'destinations' | 'destination_media' | 'reservations' | 'contact_messages',
) {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true })
  return error ? null : count ?? 0
}

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const [destinations, media, reservations, messages] = await Promise.all([
    getCount(supabase, 'destinations'),
    getCount(supabase, 'destination_media'),
    getCount(supabase, 'reservations'),
    getCount(supabase, 'contact_messages'),
  ])

  const stats = [
    { label: 'Total destinasi', value: destinations, icon: MapPin },
    { label: 'Dokumentasi foto', value: media, icon: Images },
    { label: 'Reservasi masuk', value: reservations, icon: CalendarDays },
    { label: 'Pesan pengunjung', value: messages, icon: MessageSquare },
  ]

  return (
    <div className="admin-dashboard">
      <section className="admin-page-heading">
        <div>
          <p className="eyebrow">RINGKASAN SISTEM</p>
          <h1>Dashboard</h1>
          <p>Ringkasan data pengelolaan Desa Wisata Bontomarannu.</p>
        </div>
        <Link href="/" className="admin-public-link">Buka website <ArrowUpRight size={16} /></Link>
      </section>

      {stats.some((item) => item.value === null) && (
        <div className="admin-setup-warning" role="status">
          Sebagian tabel belum dapat dibaca. Pastikan migration Tahap 2 sudah dijalankan pada Supabase dan kebijakan RLS telah aktif.
        </div>
      )}

      <section className="admin-stat-grid" aria-label="Statistik ringkas">
        {stats.map((item) => {
          const Icon = item.icon
          return (
            <article className="admin-stat-card" key={item.label}>
              <span className="admin-stat-icon"><Icon size={20} /></span>
              <p>{item.label}</p>
              <strong>{item.value === null ? '—' : item.value.toLocaleString('id-ID')}</strong>
            </article>
          )
        })}
      </section>

      <section className="admin-welcome-card">
        <div>
          <p className="eyebrow">PENGELOLAAN SISTEM DEWIS · TAHAP 6</p>
          <h2>Informasi wisata dan layanan pengunjung terhubung dalam satu panel.</h2>
          <p>Kelola informasi destinasi dan dokumentasi foto dari satu panel. Foto dapat diunggah, diberi keterangan dan kredit, ditetapkan sebagai sampul, lalu dipublikasikan ke website.</p>
        </div>
        <span className="admin-welcome-mark"><ShieldCheck size={34} /></span>
      </section>

      <section className="admin-next-card">
        <div>
          <h2>Pengelolaan data destinasi</h2>
          <p>Tambah, perbarui, arsipkan, atau publikasikan informasi destinasi melalui modul pengelolaan.</p>
        </div>
        <Link href="/admin/destinasi" className="admin-phase-tag">Buka data destinasi <ArrowUpRight size={13} /></Link>
      </section>
      <section className="admin-next-card">
        <div>
          <h2>Galeri dan media library</h2>
          <p>Unggah foto, atur caption dan kredit, pilih foto sampul, serta kendalikan publikasi dokumentasi.</p>
        </div>
        <Link href="/admin/galeri" className="admin-phase-tag">Buka galeri <ArrowUpRight size={13} /></Link>
      </section>
      <section className="admin-next-card">
        <div>
          <h2>Koordinat GPS dan peta wisata</h2>
          <p>Catat titik melalui GPS perangkat atau pemilihan manual, periksa akurasi dan sumber, lalu verifikasi agar lokasi dapat tampil di peta publik.</p>
        </div>
        <Link href="/admin/peta" className="admin-phase-tag"><MapPinned size={13} /> Buka manajemen GPS <ArrowUpRight size={13} /></Link>
      </section>
      <section className="admin-next-card">
        <div>
          <h2>Reservasi wisata</h2>
          <p>Periksa permintaan kunjungan, konfirmasi jadwal, dan hubungi pengunjung melalui WhatsApp.</p>
        </div>
        <Link href="/admin/reservasi" className="admin-phase-tag"><CalendarDays size={13} /> Kelola reservasi <ArrowUpRight size={13} /></Link>
      </section>
      <section className="admin-next-card">
        <div>
          <h2>Pesan pengunjung</h2>
          <p>Baca pertanyaan dari formulir kontak dan perbarui status tindak lanjutnya.</p>
        </div>
        <Link href="/admin/pesan" className="admin-phase-tag"><Mail size={13} /> Buka pesan <ArrowUpRight size={13} /></Link>
      </section>
      <section className="admin-next-card">
        <div>
          <h2>Pengaturan kontak publik</h2>
          <p>Atur nomor WhatsApp resmi dan alamat publik yang ditampilkan pada halaman Kontak.</p>
        </div>
        <Link href="/admin/pengaturan" className="admin-phase-tag"><Settings size={13} /> Pengaturan <ArrowUpRight size={13} /></Link>
      </section>
    </div>
  )
}
