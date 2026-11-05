'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStaffProfile } from '@/lib/auth/permissions'
import { recordAudit } from '@/lib/audit'
import { ALLOWED_IMAGE_TYPES, hasValidImageSignature, MAX_IMAGE_FILE_SIZE } from '@/lib/media-rules'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'destination-media'

function field(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function checked(formData: FormData, key: string): boolean {
  return field(formData, key) === 'on' || field(formData, key) === 'true'
}

function mediaError(message: string): never {
  redirect(`/admin/galeri?error=${encodeURIComponent(message)}`)
}

function refreshGalleryPaths() {
  revalidatePath('/galeri')
  revalidatePath('/destinasi')
  revalidatePath('/destinasi/[slug]', 'page')
  revalidatePath('/')
  revalidatePath('/admin/galeri')
  revalidatePath('/admin')
}

async function writeMediaAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  action: string,
  mediaId: string,
  summary: string,
) {
  await recordAudit(supabase, {
    user_id: userId,
    action,
    entity_table: 'destination_media',
    entity_id: mediaId,
    summary,
  })
}

export async function uploadDestinationMedia(formData: FormData) {
  const profile = await requireStaffProfile()
  const destinationId = field(formData, 'destination_id')
  const caption = field(formData, 'caption')
  const altText = field(formData, 'alt_text')
  const credit = field(formData, 'credit')
  const isPublished = checked(formData, 'is_published')
  const isCover = checked(formData, 'is_cover')
  const fileValue = formData.get('file')

  if (!destinationId) mediaError('Pilih destinasi terlebih dahulu.')
  if (!(fileValue instanceof File) || fileValue.size === 0) mediaError('Pilih satu file gambar yang akan diunggah.')
  const file = fileValue
  if (file.size > MAX_IMAGE_FILE_SIZE) mediaError('Ukuran foto maksimal 8 MB.')
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) mediaError('Format yang diizinkan hanya JPG, PNG, WebP, dan AVIF.')
  if (caption.length > 180 || altText.length > 250 || credit.length > 180) {
    mediaError('Caption maksimal 180 karakter, teks alternatif 250 karakter, dan kredit 180 karakter.')
  }
  if (isCover && !isPublished) mediaError('Foto sampul harus berstatus dipublikasikan.')

  const supabase = await createClient()
  const { data: destination, error: destinationError } = await supabase
    .from('destinations')
    .select('id, name')
    .eq('id', destinationId)
    .maybeSingle()
  if (destinationError || !destination) mediaError('Destinasi tidak ditemukan atau tidak dapat diakses.')

  const extension = ALLOWED_IMAGE_TYPES.get(file.type)!
  const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer())
  if (!hasValidImageSignature(bytes, file.type)) mediaError('Isi file tidak cocok dengan format gambar yang dipilih.')

  const storagePath = `${destinationId}/${randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })
  if (uploadError) mediaError(`Upload foto gagal: ${uploadError.message}`)

  const { data: media, error: insertError } = await supabase
    .from('destination_media')
    .insert({
      destination_id: destinationId,
      storage_path: storagePath,
      caption: caption || null,
      alt_text: altText || caption || destination.name,
      credit: credit || null,
      is_published: isPublished,
      is_cover: false,
      sort_order: 100,
      uploaded_by: profile.id,
      file_size_bytes: file.size,
      mime_type: file.type,
    })
    .select('id')
    .single()

  if (insertError || !media) {
    const { error: cleanupError } = await supabase.storage.from(BUCKET).remove([storagePath])
    const cleanupWarning = cleanupError
      ? ` File belum berhasil dihapus dari Storage (${storagePath}): ${cleanupError.message}.`
      : ''
    mediaError(`Metadata foto gagal disimpan${insertError?.message ? `: ${insertError.message}.` : '.'}${cleanupWarning}`)
  }

  await writeMediaAudit(supabase, profile.id, 'media.uploaded', media.id, `Mengunggah foto untuk ${destination.name}`)
  if (isCover) {
    const { error: coverError } = await supabase.rpc('set_destination_media_cover', { p_media_id: media.id })
    if (coverError) {
      refreshGalleryPaths()
      mediaError(`Foto tersimpan di galeri, tetapi gagal dijadikan sampul: ${coverError.message}`)
    }
  }

  refreshGalleryPaths()
  redirect('/admin/galeri?status=uploaded')
}

export async function updateDestinationMedia(formData: FormData) {
  const profile = await requireStaffProfile()
  const id = field(formData, 'id')
  const caption = field(formData, 'caption')
  const altText = field(formData, 'alt_text')
  const credit = field(formData, 'credit')
  const sortOrderText = field(formData, 'sort_order')
  const isPublished = checked(formData, 'is_published')
  const isCover = checked(formData, 'is_cover')
  if (!id) mediaError('ID media tidak valid.')
  if (caption.length > 180 || altText.length > 250 || credit.length > 180) mediaError('Ada keterangan yang melebihi batas karakter.')
  if (isCover && !isPublished) mediaError('Foto sampul harus dipublikasikan.')
  const sortOrder = Number(sortOrderText)
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) mediaError('Urutan harus berupa bilangan bulat 0–100.000.')

  const supabase = await createClient()
  const { data: existing, error: lookupError } = await supabase
    .from('destination_media')
    .select('id, destination_id, storage_path')
    .eq('id', id)
    .maybeSingle()
  if (lookupError || !existing) mediaError('Foto tidak ditemukan.')

  const { data: updated, error: updateError } = await supabase
    .from('destination_media')
    .update({
      caption: caption || null,
      alt_text: altText,
      credit: credit || null,
      sort_order: sortOrder,
      is_published: isPublished,
      ...(!isCover ? { is_cover: false } : {}),
    })
    .eq('id', id)
    .select('id')
    .maybeSingle()
  if (updateError) mediaError(`Perubahan metadata gagal: ${updateError.message}`)
  if (!updated) mediaError('Foto sudah berubah atau tidak ditemukan. Muat ulang halaman.')

  if (isCover) {
    const { error: coverError } = await supabase.rpc('set_destination_media_cover', { p_media_id: id })
    if (coverError) {
      await writeMediaAudit(supabase, profile.id, 'media.updated', id, 'Memperbarui metadata dan publikasi foto')
      refreshGalleryPaths()
      mediaError(`Metadata tersimpan, tetapi foto sampul gagal diperbarui: ${coverError.message}`)
    }
  }

  await writeMediaAudit(supabase, profile.id, 'media.updated', id, 'Memperbarui metadata dan publikasi foto')
  refreshGalleryPaths()
  redirect('/admin/galeri?status=updated')
}

export async function deleteDestinationMedia(formData: FormData) {
  const profile = await requireStaffProfile()
  const id = field(formData, 'id')
  if (!id) mediaError('ID media tidak valid.')

  const supabase = await createClient()
  // Hapus metadata lebih dahulu agar foto tidak lagi mendapat signed URL publik.
  const { data: deleted, error: deleteRowError } = await supabase
    .from('destination_media')
    .delete()
    .eq('id', id)
    .select('id, storage_path')
    .maybeSingle()
  if (deleteRowError) mediaError(`Metadata foto gagal dihapus: ${deleteRowError.message}`)
  if (!deleted) mediaError('Foto sudah berubah atau tidak ditemukan. Muat ulang halaman.')

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([deleted.storage_path])
  await writeMediaAudit(supabase, profile.id, 'media.deleted', id, 'Menghapus foto dari galeri')
  refreshGalleryPaths()

  if (storageError) {
    mediaError(`Metadata sudah dihapus, tetapi file storage belum berhasil dibersihkan (${deleted.storage_path}): ${storageError.message}. Hapus objek tersebut melalui Storage setelah memeriksa path-nya.`)
  }
  redirect('/admin/galeri?status=deleted')
}
