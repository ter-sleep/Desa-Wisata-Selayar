'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStaffProfile } from '@/lib/auth/permissions'
import { createClient } from '@/lib/supabase/server'

function value(formData: FormData, key: string) {
  const raw = formData.get(key)
  return typeof raw === 'string' ? raw.trim() : ''
}

export async function savePublicContactSettings(formData: FormData) {
  const profile = await requireStaffProfile()
  if (profile.role === 'editor') redirect('/admin/pengaturan?error=Akses%20hanya%20untuk%20Admin%20dan%20Super%20Admin.')

  const whatsapp = value(formData, 'whatsapp_number').replace(/[\s()-]/g, '')
  const publicAddress = value(formData, 'public_address')
  if (whatsapp && !/^\+?[0-9]{8,20}$/.test(whatsapp)) {
    redirect('/admin/pengaturan?error=Nomor%20WhatsApp%20harus%20menggunakan%20format%20internasional%20yang%20valid.')
  }
  if (publicAddress.length > 500) redirect('/admin/pengaturan?error=Alamat%20maksimal%20500%20karakter.')

  const supabase = await createClient()
  const entries = [
    { key: 'whatsapp_number', value: whatsapp, is_public: true, updated_by: profile.id },
    { key: 'public_address', value: publicAddress, is_public: true, updated_by: profile.id },
  ]
  const { error } = await supabase.from('site_settings').upsert(entries, { onConflict: 'key' })
  if (error) redirect(`/admin/pengaturan?error=${encodeURIComponent(`Pengaturan gagal disimpan: ${error.message}`)}`)

  await supabase.from('audit_logs').insert({
    user_id: profile.id,
    action: 'site_settings.contact_updated',
    entity_table: 'site_settings',
    summary: 'Memperbarui WhatsApp dan alamat publik website',
  })

  revalidatePath('/kontak')
  revalidatePath('/')
  revalidatePath('/admin/pengaturan')
  redirect('/admin/pengaturan?status=saved')
}
