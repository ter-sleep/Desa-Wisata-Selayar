'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStaffProfile } from '@/lib/auth/permissions'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'destination-media'
const MAX_FILE_SIZE = 8 * 1024 * 1024
const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
  ['image/avif', 'avif'],
])

function field(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function checked(formData: FormData, key: string): boolean {
  return field(formData, key) === 'on' || field(formData, key) === 'true'
}

function validateImageSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === 'image/jpeg') return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mime === 'image/png') return bytes.slice(0, 8).join(',') === '137,80,78,71,13,10,26,10'
  if (mime === 'image/webp') {
    return String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF'
      && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
  }
  if (mime === 'image/avif') {
    const isFtyp = String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp'
    const brands = [
      String.fromCharCode(...bytes.slice(8, 12)),
      ...Array.from({ length: Math.max(0, Math.floor((bytes.length - 16) / 4)) }, (_, index) =>
        String.fromCharCode(...bytes.slice(16 + index * 4, 20 + index * 4)),
      ),
    ]
    return isFtyp && brands.some((brand) => brand === 'avif' || brand === 'avis')
  }
  return false
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
  await supabase.from('audit_logs').insert({
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

  const fail = (message: string): never => {
    redirect(`/admin/galeri?error=${encodeURIComponent(message)}`)
    throw new Error(message)
  }
  if (!destinationId) fail('Pilih destinasi terlebih dahulu.')
  if (!(fileValue instanceof File) || fileValue.size === 0) fail('Pilih satu file gambar yang akan diunggah.')
  const file = fileValue as File
  if (file.size > MAX_FILE_SIZE) fail('Ukuran foto maksimal 8 MB.')
  if (!ALLOWED_TYPES.has(file.type)) fail('Format yang diizinkan hanya JPG, PNG, WebP, dan AVIF.')
  if (caption.length > 180 || altText.length > 250 || credit.length > 180) {
    fail('Caption maksimal 180 karakter, teks alternatif 250 karakter, dan kredit 180 karakter.')
  }
  if (isCover && !isPublished) fail('Foto sampul harus berstatus dipublikasikan.')

  const supabase = await createClient()
  const { data: destination, error: destinationError } = await supabase
    .from('destinations')
    .select('id, name')
    .eq('id', destinationId)
    .maybeSingle()
  if (destinationError || !destination) fail('Destinasi tidak ditemukan atau tidak dapat diakses.')

  const extension = ALLOWED_TYPES.get(file.type)!
  const bytes = new Uint8Array(await file.slice(0, 64).arrayBuffer())
  if (!validateImageSignature(bytes, file.type)) fail('Isi file tidak cocok dengan format gambar yang dipilih.')

  const storagePath = `${destinationId}/${randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    })
  if (uploadError) fail(`Upload foto gagal: ${uploadError.message}`)

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
    await supabase.storage.from(BUCKET).remove([storagePath])
    fail(`Metadata foto gagal disimpan${insertError?.message ? `: ${insertError.message}` : '.'}`)
  }

  if (isCover) {
    const { error: coverError } = await supabase.rpc('set_destination_media_cover', { p_media_id: media.id })
    if (coverError) {
      await supabase.from('destination_media').delete().eq('id', media.id)
      await supabase.storage.from(BUCKET).remove([storagePath])
      fail(`Foto terunggah tetapi gagal dijadikan sampul: ${coverError.message}`)
    }
  }

  await writeMediaAudit(supabase, profile.id, 'media.uploaded', media.id, `Mengunggah foto untuk ${destination.name}`)
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
  const fail = (message: string): never => {
    redirect(`/admin/galeri?error=${encodeURIComponent(message)}`)
    throw new Error(message)
  }

  if (!id) fail('ID media tidak valid.')
  if (caption.length > 180 || altText.length > 250 || credit.length > 180) fail('Ada keterangan yang melebihi batas karakter.')
  if (isCover && !isPublished) fail('Foto sampul harus dipublikasikan.')
  const sortOrder = Number(sortOrderText)
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) fail('Urutan harus berupa bilangan bulat 0–100.000.')

  const supabase = await createClient()
  const { data: existing, error: lookupError } = await supabase
    .from('destination_media')
    .select('id, destination_id, storage_path')
    .eq('id', id)
    .maybeSingle()
  if (lookupError || !existing) fail('Foto tidak ditemukan.')

  const { error: updateError } = await supabase
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
  if (updateError) fail(`Perubahan metadata gagal: ${updateError.message}`)

  if (isCover) {
    const { error: coverError } = await supabase.rpc('set_destination_media_cover', { p_media_id: id })
    if (coverError) fail(`Metadata tersimpan, tetapi foto sampul gagal diperbarui: ${coverError.message}`)
  }

  await writeMediaAudit(supabase, profile.id, 'media.updated', id, 'Memperbarui metadata dan publikasi foto')
  refreshGalleryPaths()
  redirect('/admin/galeri?status=updated')
}

export async function deleteDestinationMedia(formData: FormData) {
  const profile = await requireStaffProfile()
  const id = field(formData, 'id')
  const fail = (message: string): never => {
    redirect(`/admin/galeri?error=${encodeURIComponent(message)}`)
    throw new Error(message)
  }
  if (!id) fail('ID media tidak valid.')

  const supabase = await createClient()
  const { data: existing, error: lookupError } = await supabase
    .from('destination_media')
    .select('id, storage_path, caption')
    .eq('id', id)
    .maybeSingle()
  if (lookupError || !existing) fail('Foto tidak ditemukan.')

  // Hapus metadata lebih dahulu agar foto tidak lagi mendapat signed URL publik.
  const { error: deleteRowError } = await supabase.from('destination_media').delete().eq('id', id)
  if (deleteRowError) fail(`Metadata foto gagal dihapus: ${deleteRowError.message}`)

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([existing.storage_path])
  await writeMediaAudit(supabase, profile.id, 'media.deleted', id, 'Menghapus foto dari galeri')
  refreshGalleryPaths()

  if (storageError) {
    fail(`Metadata sudah dihapus, tetapi file storage belum berhasil dibersihkan: ${storageError.message}. Hapus objek tersebut melalui Storage setelah memeriksa path-nya.`)
  }
  redirect('/admin/galeri?status=deleted')
}
