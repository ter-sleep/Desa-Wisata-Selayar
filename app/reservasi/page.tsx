import Link from 'next/link'
import { CalendarDays, CheckCircle2, ClipboardCheck, MessageCircle } from 'lucide-react'
import { Footer, Header, PageIntro, Notice } from '@/components/site'
import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import { submitReservation } from '@/lib/actions/public-submissions'

export const dynamic = 'force-dynamic'

export default async function ReservationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string; code?: string; destination?: string }>
}) {
  const params = await searchParams
  let destinations: { id: string; slug: string; name: string }[] = []
  let loadError = ''

  if (isSupabaseConfigured()) {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('destinations')
      .select('id, slug, name')
      .eq('publication_status', 'published')
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    if (error) loadError = 'Daftar destinasi belum dapat dimuat. Silakan hubungi pengelola.'
    else destinations = data || []
  } else {
    loadError = 'Layanan reservasi belum dihubungkan ke database. Silakan hubungi pengelola.'
  }

  const selectedDestination = destinations.find((item) => item.slug === params.destination)?.id || ''
  const sent = params.status === 'sent' && Boolean(params.code)
  const received = params.status === 'received'

  return <>
    <Header />
    <main>
      <PageIntro eyebrow="09 — Rencanakan kunjungan" title={<>Buat rencana<br/><em>perjalanan.</em></>} text="Sampaikan rencana kunjungan Anda kepada pengelola Desa Wisata Bontomarannu. Permintaan akan diperiksa sebelum dinyatakan terkonfirmasi." />
      <section className="section visitor-section">
        <div className="visitor-layout">
          <div className="visitor-copy">
            <p className="eyebrow">RESERVASI KUNJUNGAN</p>
            <h2>Mulai dari<br/><em>rencana yang jelas.</em></h2>
            <p>Isi tanggal dan jumlah peserta dengan benar. Pengelola akan menghubungi Anda untuk menyampaikan ketersediaan dan informasi lanjutan.</p>
            <div className="visitor-step"><CalendarDays size={18}/><span><strong>1. Ajukan permintaan</strong><small>Isi formulir reservasi secara lengkap.</small></span></div>
            <div className="visitor-step"><ClipboardCheck size={18}/><span><strong>2. Tunggu pemeriksaan</strong><small>Status awal reservasi adalah menunggu konfirmasi.</small></span></div>
            <div className="visitor-step"><MessageCircle size={18}/><span><strong>3. Dihubungi pengelola</strong><small>Konfirmasi dilakukan melalui kontak yang Anda berikan.</small></span></div>
          </div>

          <div className="visitor-form-card">
            <p className="eyebrow">FORMULIR PENGUNJUNG</p>
            <h2>Permintaan reservasi</h2>
            {sent && <div className="visitor-alert visitor-alert-success" role="status"><CheckCircle2 size={19}/><div><strong>Permintaan berhasil dikirim.</strong><span>Simpan kode reservasi Anda: <b>{params.code}</b>. Status saat ini: menunggu konfirmasi pengelola.</span></div></div>}
            {received && <div className="visitor-alert visitor-alert-success" role="status">Permintaan telah diterima.</div>}
            {params.error && <div className="visitor-alert visitor-alert-error" role="alert">{params.error}</div>}
            {loadError && <div className="visitor-alert visitor-alert-error" role="status">{loadError}</div>}
            {!loadError && destinations.length === 0 && <div className="visitor-alert visitor-alert-error">Belum ada destinasi yang dipublikasikan untuk reservasi.</div>}

            {destinations.length > 0 && !sent && (
              <form action={submitReservation} className="visitor-form">
                <label className="visitor-field">Destinasi yang ingin dikunjungi <b>*</b>
                  <select name="destination_id" defaultValue={selectedDestination} required>
                    <option value="" disabled>Pilih destinasi</option>
                    {destinations.map((destination) => <option key={destination.id} value={destination.id}>{destination.name}</option>)}
                  </select>
                </label>
                <label className="visitor-field">Nama lengkap <b>*</b><input name="visitor_name" required minLength={2} maxLength={120} autoComplete="name" placeholder="Nama sesuai identitas"/></label>
                <div className="visitor-form-grid">
                  <label className="visitor-field">Nomor WhatsApp <b>*</b><input name="whatsapp" required maxLength={30} autoComplete="tel" placeholder="Contoh: 081234567890"/><small>Pastikan nomor aktif dan dapat menerima pesan.</small></label>
                  <label className="visitor-field">Email (opsional)<input name="email" type="email" maxLength={254} autoComplete="email" placeholder="nama@email.com"/></label>
                </div>
                <div className="visitor-form-grid">
                  <label className="visitor-field">Tanggal kunjungan <b>*</b><input name="visit_date" type="date" min={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(new Date())} required/></label>
                  <label className="visitor-field">Jumlah peserta <b>*</b><input name="participant_count" type="number" min={1} max={500} defaultValue={1} required/></label>
                </div>
                <label className="visitor-field">Catatan tambahan (opsional)<textarea name="visitor_notes" maxLength={1000} rows={4} placeholder="Tujuan kunjungan, kebutuhan khusus, atau informasi lain."/></label>
                <label className="visitor-consent"><input type="checkbox" name="privacy_consent" required/><span>Saya menyetujui data pada formulir ini digunakan oleh pengelola untuk memproses permintaan reservasi dan menghubungi saya. Baca <a href="/kebijakan-privasi" target="_blank" rel="noreferrer">kebijakan privasi</a>.</span></label>
                <div className="visitor-honeypot" aria-hidden="true"><label>Jangan isi kolom ini<input name="website" tabIndex={-1} autoComplete="off"/></label></div>
                <button className="button button-dark visitor-submit" type="submit">Kirim permintaan reservasi <CalendarDays size={16}/></button>
                <small className="visitor-privacy-note">Pengiriman formulir belum berarti reservasi disetujui. Kunjungan baru dianggap terkonfirmasi setelah ada konfirmasi dari pengelola.</small>
              </form>
            )}
            {sent && <Link href="/destinasi" className="button button-dark visitor-submit">Jelajahi destinasi</Link>}
          </div>
        </div>
      </section>
    </main>
    <Footer />
  </>
}
