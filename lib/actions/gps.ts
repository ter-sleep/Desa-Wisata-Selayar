'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStaffProfile } from '@/lib/auth/permissions'
import { createClient } from '@/lib/supabase/server'
import type { CoordinateMethod } from '@/types/database'

const METHODS: CoordinateMethod[] = ['device_gps', 'map_pin', 'external_reference']

function value(formData: FormData, key: string) {
  const raw = formData.get(key)
  return typeof raw === 'string' ? raw.trim() : ''
}

function isUuid(input: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input)
}

function refreshGpsPages() {
  revalidatePath('/admin')
  revalidatePath('/admin/peta')
  revalidatePath('/admin/destinasi')
  revalidatePath('/peta')
  revalidatePath('/pusat-data')
  revalidatePath('/destinasi')
  revalidatePath('/destinasi/[slug]', 'page')
}

async function auditGps(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  action: string,
  destinationId: string,
  summary: string,
  metadata: Record<string, string | number | null> = {},
) {
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    entity_table: 'destinations',
    entity_id: destinationId,
    summary,
    metadata,
  })
}

function gpsError(message: string, id?: string): never {
  const path = id ? `/admin/peta/${encodeURIComponent(id)}` : '/admin/peta'
  redirect(`${path}?error=${encodeURIComponent(message)}`)
  throw new Error(message)
}

export async function saveDestinationCoordinates(formData: FormData) {
  const profile = await requireStaffProfile()
  const id = value(formData, 'id')
  const latitudeText = value(formData, 'latitude')
  const longitudeText = value(formData, 'longitude')
  const accuracyText = value(formData, 'gps_accuracy_m')
  const source = value(formData, 'coordinate_source')
  const method = value(formData, 'coordinate_method') as CoordinateMethod

  if (!isUuid(id)) gpsError('ID destinasi tidak valid.')
  if (!latitudeText || !longitudeText) gpsError('Latitude dan longitude wajib diisi.', id)

  const latitude = Number(latitudeText)
  const longitude = Number(longitudeText)
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    gpsError('Latitude harus berupa angka antara -90 dan 90.', id)
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    gpsError('Longitude harus berupa angka antara -180 dan 180.', id)
  }
  if (!METHODS.includes(method)) gpsError('Metode pengambilan koordinat tidak valid.', id)
  if (source.length < 5 || source.length > 300) {
    gpsError('Sumber koordinat wajib diisi (5–300 karakter).', id)
  }

  let accuracy: number | null = null
  if (accuracyText) {
    accuracy = Number(accuracyText)
    if (!Number.isFinite(accuracy) || accuracy < 0 || accuracy > 100000) {
      gpsError('Akurasi GPS harus berada pada rentang 0–100.000 meter.', id)
    }
  }

  const supabase = await createClient()
  const { data: destination, error: lookupError } = await supabase
    .from('destinations')
    .select('id, name')
    .eq('id', id)
    .maybeSingle()

  if (lookupError || !destination) gpsError('Destinasi tidak ditemukan atau tidak dapat diakses.', id)

  const { error } = await supabase
    .from('destinations')
    .update({
      latitude,
      longitude,
      gps_accuracy_m: accuracy,
      coordinate_source: source,
      coordinate_method: method,
      coordinate_captured_at: new Date().toISOString(),
      coordinate_updated_by: profile.id,
      // Trigger database akan mengembalikan status ke pending setiap kali titik berubah.
    })
    .eq('id', id)

  if (error) gpsError(`Koordinat gagal disimpan: ${error.message}`, id)

  await auditGps(
    supabase,
    profile.id,
    'destination.gps_updated',
    id,
    `Memperbarui koordinat GPS ${destination.name}`,
    { latitude, longitude, accuracy_m: accuracy, method },
  )

  refreshGpsPages()
  redirect(`/admin/peta/${encodeURIComponent(id)}?status=saved`)
}

export async function reviewDestinationCoordinates(formData: FormData) {
  const profile = await requireStaffProfile()
  if (!['super_admin', 'admin'].includes(profile.role)) {
    gpsError('Hanya Admin dan Super Admin yang dapat memverifikasi koordinat.', value(formData, 'id'))
  }

  const id = value(formData, 'id')
  const decision = value(formData, 'decision')
  const note = value(formData, 'verification_note')
  if (!isUuid(id)) gpsError('ID destinasi tidak valid.')
  if (decision !== 'verified' && decision !== 'rejected') gpsError('Keputusan verifikasi tidak valid.', id)
  if (note.length < 5 || note.length > 1000) {
    gpsError('Catatan pemeriksaan wajib diisi (5–1.000 karakter).', id)
  }

  const supabase = await createClient()
  const { data: destination, error: lookupError } = await supabase
    .from('destinations')
    .select('id, name, latitude, longitude')
    .eq('id', id)
    .maybeSingle()

  if (lookupError || !destination) gpsError('Destinasi tidak ditemukan.', id)
  if (destination.latitude === null || destination.longitude === null) {
    gpsError('Masukkan koordinat terlebih dahulu sebelum melakukan verifikasi.', id)
  }

  const now = new Date().toISOString()
  const { error } = await supabase
    .from('destinations')
    .update({
      verification_status: decision,
      verification_note: note,
      reviewed_at: now,
      reviewed_by: profile.id,
      verified_at: decision === 'verified' ? now : null,
      verified_by: decision === 'verified' ? profile.id : null,
    })
    .eq('id', id)

  if (error) gpsError(`Pemeriksaan koordinat gagal disimpan: ${error.message}`, id)

  await auditGps(
    supabase,
    profile.id,
    decision === 'verified' ? 'destination.gps_verified' : 'destination.gps_rejected',
    id,
    `${decision === 'verified' ? 'Memverifikasi' : 'Menolak'} koordinat ${destination.name}`,
    { latitude: Number(destination.latitude), longitude: Number(destination.longitude), decision },
  )

  refreshGpsPages()
  redirect(`/admin/peta/${encodeURIComponent(id)}?status=${decision}`)
}

export async function clearDestinationCoordinates(formData: FormData) {
  const profile = await requireStaffProfile()
  const id = value(formData, 'id')
  if (!isUuid(id)) gpsError('ID destinasi tidak valid.')

  const supabase = await createClient()
  const { data: destination, error: lookupError } = await supabase
    .from('destinations')
    .select('id, name')
    .eq('id', id)
    .maybeSingle()
  if (lookupError || !destination) gpsError('Destinasi tidak ditemukan.', id)

  const { error } = await supabase
    .from('destinations')
    .update({
      latitude: null,
      longitude: null,
      gps_accuracy_m: null,
      coordinate_source: null,
      coordinate_method: null,
      coordinate_captured_at: null,
      coordinate_updated_by: profile.id,
    })
    .eq('id', id)

  if (error) gpsError(`Koordinat gagal dihapus: ${error.message}`, id)
  await auditGps(supabase, profile.id, 'destination.gps_cleared', id, `Menghapus koordinat ${destination.name}`)
  refreshGpsPages()
  redirect(`/admin/peta/${encodeURIComponent(id)}?status=cleared`)
}
