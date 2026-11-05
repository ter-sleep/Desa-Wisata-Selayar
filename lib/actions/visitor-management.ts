'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStaffProfile } from '@/lib/auth/permissions'
import { recordAudit } from '@/lib/audit'
import { createClient } from '@/lib/supabase/server'
import { messageTransitions, reservationTransitions } from '@/lib/visitor-rules'
import type { MessageStatus, ReservationStatus } from '@/types/database'

function value(formData: FormData, key: string) {
  const raw = formData.get(key)
  return typeof raw === 'string' ? raw.trim() : ''
}

function actionError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`)
}

export async function updateReservation(formData: FormData) {
  const profile = await requireStaffProfile()
  const id = value(formData, 'id')
  const updatedAt = value(formData, 'updated_at')
  const nextStatus = value(formData, 'status') as ReservationStatus
  const adminNotes = value(formData, 'admin_notes')
  const returnTo = '/admin/reservasi'

  if (!/^[0-9a-f-]{36}$/i.test(id)) actionError(returnTo, 'ID reservasi tidak valid.')
  if (!updatedAt) actionError(returnTo, 'Versi reservasi tidak tersedia. Muat ulang halaman.')
  if (adminNotes.length > 2000) actionError(returnTo, 'Catatan admin maksimal 2.000 karakter.')
  if (!['pending', 'confirmed', 'rejected', 'cancelled', 'completed'].includes(nextStatus)) {
    actionError(returnTo, 'Status reservasi tidak dikenal.')
  }

  const supabase = await createClient()
  const { data: current, error: lookupError } = await supabase
    .from('reservations')
    .select('id, booking_code, status, updated_at')
    .eq('id', id)
    .maybeSingle()
  if (lookupError || !current) actionError(returnTo, 'Reservasi tidak ditemukan.')
  if (current.updated_at !== updatedAt) actionError(returnTo, 'Reservasi sudah berubah. Muat ulang sebelum mencoba kembali.')

  const currentStatus = current.status as ReservationStatus
  if (!reservationTransitions[currentStatus]?.includes(nextStatus)) {
    actionError(returnTo, `Perubahan status ${currentStatus} ke ${nextStatus} tidak diizinkan.`)
  }

  const { data: updated, error } = await supabase.from('reservations').update({
    status: nextStatus,
    admin_notes: adminNotes || null,
  }).eq('id', id).eq('status', currentStatus).eq('updated_at', updatedAt).select('id').maybeSingle()
  if (error) actionError(returnTo, `Reservasi gagal diperbarui: ${error.message}`)
  if (!updated) actionError(returnTo, 'Status reservasi sudah berubah. Muat ulang sebelum mencoba kembali.')

  await recordAudit(supabase, {
    user_id: profile.id,
    action: `reservation.${nextStatus}`,
    entity_table: 'reservations',
    entity_id: id,
    summary: `Mengubah status ${current.booking_code} menjadi ${nextStatus}`,
    metadata: { previous_status: currentStatus, new_status: nextStatus },
  })

  revalidatePath('/admin')
  revalidatePath(returnTo)
  redirect(`${returnTo}?status=updated`)
}

export async function updateContactMessage(formData: FormData) {
  const profile = await requireStaffProfile()
  const id = value(formData, 'id')
  const updatedAt = value(formData, 'updated_at')
  const nextStatus = value(formData, 'status') as MessageStatus
  const returnTo = '/admin/pesan'

  if (!/^[0-9a-f-]{36}$/i.test(id)) actionError(returnTo, 'ID pesan tidak valid.')
  if (!updatedAt) actionError(returnTo, 'Versi pesan tidak tersedia. Muat ulang halaman.')
  if (!['new', 'read', 'replied', 'archived'].includes(nextStatus)) actionError(returnTo, 'Status pesan tidak dikenal.')

  const supabase = await createClient()
  const { data: current, error: lookupError } = await supabase
    .from('contact_messages')
    .select('id, status, updated_at')
    .eq('id', id)
    .maybeSingle()
  if (lookupError || !current) actionError(returnTo, 'Pesan tidak ditemukan.')
  if (current.updated_at !== updatedAt) actionError(returnTo, 'Pesan sudah berubah. Muat ulang sebelum mencoba kembali.')

  const currentStatus = current.status as MessageStatus
  if (!messageTransitions[currentStatus]?.includes(nextStatus)) {
    actionError(returnTo, `Perubahan status pesan ${currentStatus} ke ${nextStatus} tidak diizinkan.`)
  }

  const { data: updated, error } = await supabase.from('contact_messages').update({
    status: nextStatus,
  }).eq('id', id).eq('status', currentStatus).eq('updated_at', updatedAt).select('id').maybeSingle()
  if (error) actionError(returnTo, `Pesan gagal diperbarui: ${error.message}`)
  if (!updated) actionError(returnTo, 'Status pesan sudah berubah. Muat ulang sebelum mencoba kembali.')

  await recordAudit(supabase, {
    user_id: profile.id,
    action: `contact_message.${nextStatus}`,
    entity_table: 'contact_messages',
    entity_id: id,
    summary: `Memperbarui status pesan pengunjung menjadi ${nextStatus}`,
    metadata: { previous_status: currentStatus, new_status: nextStatus },
  })

  revalidatePath('/admin')
  revalidatePath(returnTo)
  redirect(`${returnTo}?status=updated`)
}
