import Link from 'next/link'
import { Mail, MessageCircle, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { updateContactMessage } from '@/lib/actions/visitor-management'
import type { MessageStatus } from '@/types/database'

export const dynamic = 'force-dynamic'

const labels: Record<MessageStatus, string> = { new: 'Baru', read: 'Dibaca', replied: 'Dibalas', archived: 'Diarsipkan' }
const filters = [{ value: 'all', label: 'Semua' }, { value: 'new', label: 'Baru' }, { value: 'read', label: 'Dibaca' }, { value: 'replied', label: 'Dibalas' }, { value: 'archived', label: 'Diarsipkan' }]
const transitions: Record<MessageStatus, MessageStatus[]> = { new: ['read', 'archived'], read: ['replied', 'archived'], replied: ['archived'], archived: ['read'] }
function whatsappDigits(value: string) { const digits = value.replace(/\D/g, ''); return digits.startsWith('0') ? `62${digits.slice(1)}` : digits.startsWith('8') ? `62${digits}` : digits }

export default async function AdminMessagesPage({ searchParams }: { searchParams: Promise<{ status?: string; error?: string }> }) {
  const params = await searchParams
  const supabase = await createClient()
  const baseQuery = supabase.from('contact_messages').select('*').order('created_at', { ascending: false })
  const selectedFilter = filters.find((item) => item.value === params.status)?.value
  const messagesQuery = selectedFilter && selectedFilter !== 'all'
    ? baseQuery.eq('status', selectedFilter as MessageStatus).limit(300)
    : baseQuery.limit(300)
  const { data, error } = await messagesQuery
  const rows = data || []
  const activeFilter = filters.some((item) => item.value === params.status) ? params.status : 'all'

  return <div className="admin-page-stack">
    <section className="admin-page-heading"><div><p className="eyebrow">LAYANAN INFORMASI</p><h1>Pesan pengunjung</h1><p>Baca pesan yang dikirim melalui formulir kontak publik dan catat tindak lanjutnya.</p></div><Link href="/kontak" target="_blank" className="admin-button admin-button-secondary">Lihat formulir publik <Mail size={15}/></Link></section>
    {params.error && <div className="admin-form-alert" role="alert">{params.error}</div>}
    {error && <div className="admin-form-alert">Pesan gagal dimuat: {error.message}. Periksa migration dan kebijakan RLS.</div>}
    {params.status === 'updated' && <div className="admin-form-success">Status pesan berhasil diperbarui.</div>}
    <div className="admin-list-summary"><div><Mail size={18}/><strong>{rows.length}</strong><span>pesan ditampilkan</span></div><span>Maksimal 300 pesan terbaru pada satu tampilan.</span></div>
    <nav className="admin-filter-tabs" aria-label="Filter pesan">{filters.map((item) => <Link key={item.value} href={item.value === 'all' ? '/admin/pesan' : `/admin/pesan?status=${item.value}`} className={activeFilter === item.value ? 'active' : ''}>{item.label}</Link>)}</nav>
    {rows.length === 0 ? <div className="admin-empty-state"><Mail size={30}/><strong>Belum ada pesan pada filter ini.</strong><span>Pesan baru dari pengunjung akan muncul di sini.</span></div> : <div className="admin-message-list">
      {rows.map((row) => {
        const status = row.status as MessageStatus
        const actions = transitions[status]
        const phone = row.phone ? whatsappDigits(row.phone) : ''
        const waText = encodeURIComponent(`Halo ${row.visitor_name}, kami dari pengelola Desa Wisata Bontomarannu. Terima kasih atas pesan Anda${row.subject ? ` mengenai ${row.subject}` : ''}.`)
        return <article className="admin-message-card" key={row.id}>
          <div className="admin-booking-top"><div><span className="admin-booking-code">{row.subject || 'Pesan tanpa subjek'}</span><small>{new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(new Date(row.created_at))}</small></div><span className={`admin-status admin-message-${status}`}>{labels[status]}</span></div>
          <div className="admin-message-meta"><strong>{row.visitor_name}</strong>{row.email && <a href={`mailto:${row.email}`}>{row.email}</a>}{row.phone && <span>{row.phone}</span>}</div>
          <p className="admin-message-body">{row.message}</p>
          <div className="admin-booking-actions">
            {row.email && <a className="admin-button admin-button-secondary" href={`mailto:${row.email}?subject=${encodeURIComponent(`Re: ${row.subject || 'Pesan Anda'}`)}`}><Mail size={14}/> Balas email</a>}
            {phone && <a className="admin-button admin-button-secondary" href={`https://wa.me/${phone}?text=${waText}`} target="_blank" rel="noreferrer"><MessageCircle size={14}/> WhatsApp</a>}
            {actions.length > 0 && <details className="admin-status-editor"><summary><RefreshCw size={14}/> Ubah status</summary><form action={updateContactMessage} className="admin-status-form"><input type="hidden" name="id" value={row.id}/><label>Status berikutnya<select name="status" defaultValue={actions[0]}>{actions.map((item) => <option key={item} value={item}>{labels[item]}</option>)}</select></label><button className="admin-button admin-button-primary" type="submit">Simpan status</button></form></details>}
          </div>
        </article>
      })}
    </div>}
  </div>
}
