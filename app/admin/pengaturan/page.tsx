import { Settings, MessageCircle, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { requireStaffProfile } from '@/lib/auth/permissions'
import { savePublicContactSettings } from '@/lib/actions/site-settings'

export const dynamic = 'force-dynamic'

function stringValue(value: unknown) { return typeof value === 'string' ? value : '' }

export default async function AdminSettingsPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const profile = await requireStaffProfile()
  const params = await searchParams
  const supabase = await createClient()
  const { data, error } = await supabase.from('site_settings').select('key, value').in('key', ['whatsapp_number', 'public_address'])
  const settings = new Map<string, unknown>((data || []).map((row) => [row.key, row.value] as const))
  const isEditor = profile.role === 'editor'

  return <div className="admin-page-stack">
    <section className="admin-page-heading"><div><p className="eyebrow">KONFIGURASI WEBSITE</p><h1>Pengaturan publik</h1><p>Kelola informasi kontak yang ditampilkan kepada pengunjung.</p></div><Settings size={30}/></section>
    {params.error && <div className="admin-form-alert" role="alert">{params.error}</div>}
    {params.status === 'saved' && <div className="admin-form-success" role="status">Pengaturan berhasil disimpan dan halaman kontak telah diperbarui.</div>}
    {error && <div className="admin-form-alert">Pengaturan gagal dimuat: {error.message}.</div>}
    <form action={savePublicContactSettings} className="admin-form">
      <div className="admin-form-heading"><h2>Kontak pengelola</h2><p>Informasi ini dapat dilihat oleh seluruh pengunjung website. Pastikan nomor dan alamat sudah mendapat persetujuan pemiliknya.</p></div>
      <div className="admin-form-grid">
        <label className="admin-field admin-field-full"><span><MessageCircle size={14}/> Nomor WhatsApp resmi</span><input name="whatsapp_number" type="tel" defaultValue={stringValue(settings.get('whatsapp_number'))} placeholder="Contoh: +6281234567890" disabled={isEditor}/><small>Gunakan format internasional. Nomor ini akan digunakan pada tombol WhatsApp di halaman Kontak.</small></label>
        <label className="admin-field admin-field-full"><span><MapPin size={14}/> Alamat publik</span><textarea name="public_address" rows={3} maxLength={500} defaultValue={stringValue(settings.get('public_address'))} placeholder="Alamat kantor/pos informasi yang telah dikonfirmasi" disabled={isEditor}/></label>
      </div>
      {isEditor ? <div className="admin-form-alert">Role Editor hanya dapat melihat pengaturan. Hubungi Admin atau Super Admin untuk mengubah informasi publik.</div> : <div className="admin-form-actions"><button className="admin-button admin-button-primary" type="submit">Simpan pengaturan</button></div>}
    </form>
  </div>
}
