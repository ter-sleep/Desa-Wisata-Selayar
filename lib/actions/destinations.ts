'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { requireStaffProfile } from '@/lib/auth/permissions'
import { createClient } from '@/lib/supabase/server'
import type { PublicationStatus } from '@/types/database'

const PUBLICATION_STATUSES: PublicationStatus[] = ['draft', 'published', 'archived']

function textValue(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function validateImageUrl(value: string): boolean {
  if (!value) return true
  if (value.startsWith('/') && !value.startsWith('//')) return true
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function parseDestination(formData: FormData) {
  const name = textValue(formData, 'name')
  const category = textValue(formData, 'category')
  const description = textValue(formData, 'description')
  const slug = slugify(textValue(formData, 'slug') || name)
  const imageUrl = textValue(formData, 'image_url')
  const eyebrow = textValue(formData, 'eyebrow')
  const status = textValue(formData, 'status') || 'Informasi perlu dikonfirmasi'
  const dataSource = textValue(formData, 'data_source')
  const dataStatus = textValue(formData, 'data_status') || 'Perlu verifikasi'
  const updatedYearText = textValue(formData, 'updated_year')
  const sortOrderText = textValue(formData, 'sort_order') || '100'
  const publicationStatusText = textValue(formData, 'publication_status') || 'draft'
  const details = textValue(formData, 'details')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)

  if (name.length < 2 || name.length > 160) return { error: 'Nama destinasi harus terdiri dari 2–160 karakter.' } as const
  if (category.length < 2 || category.length > 80) return { error: 'Kategori harus terdiri dari 2–80 karakter.' } as const
  if (!slug || slug.length > 180) return { error: 'Slug tidak valid. Gunakan huruf, angka, dan tanda hubung.' } as const
  if (description.length < 10 || description.length > 5000) return { error: 'Deskripsi harus terdiri dari 10–5.000 karakter.' } as const
  if (eyebrow.length > 120 || status.length > 160 || dataSource.length > 300 || dataStatus.length > 160) return { error: 'Salah satu keterangan melebihi batas karakter.' } as const
  if (!validateImageUrl(imageUrl)) return { error: 'URL gambar harus berupa URL HTTP(S) atau path lokal yang diawali /.' } as const
  if (!PUBLICATION_STATUSES.includes(publicationStatusText as PublicationStatus)) return { error: 'Status publikasi tidak valid.' } as const
  if (details.length > 30 || details.some((item) => item.length > 180)) return { error: 'Maksimal 30 detail, masing-masing maksimal 180 karakter.' } as const

  const sortOrder = Number(sortOrderText)
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) {
    return { error: 'Urutan tampil harus berupa bilangan bulat antara 0 dan 100.000.' } as const
  }

  let updatedYear: number | null = null
  if (updatedYearText) {
    updatedYear = Number(updatedYearText)
    if (!Number.isInteger(updatedYear) || updatedYear < 1900 || updatedYear > 2200) {
      return { error: 'Tahun pembaruan harus berupa tahun yang valid.' } as const
    }
  }

  return {
    value: {
      slug,
      name,
      category,
      eyebrow: eyebrow || null,
      description,
      image_url: imageUrl || null,
      status,
      details,
      data_source: dataSource || null,
      data_status: dataStatus,
      updated_year: updatedYear,
      sort_order: sortOrder,
      publication_status: publicationStatusText as PublicationStatus,
    },
  } as const
}

function invalidateDestinationPages(slug?: string) {
  revalidatePath('/')
  revalidatePath('/destinasi')
  revalidatePath('/peta')
  revalidatePath('/pusat-data')
  revalidatePath('/admin')
  revalidatePath('/admin/destinasi')
  revalidatePath('/destinasi/[slug]', 'page')
  if (slug) revalidatePath(`/destinasi/${slug}`)
}

async function writeAuditLog(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  action: string,
  entityId: string,
  summary: string,
) {
  // Audit bersifat pendukung; kegagalannya tidak membatalkan perubahan data utama.
  await supabase.from('audit_logs').insert({
    user_id: userId,
    action,
    entity_table: 'destinations',
    entity_id: entityId,
    summary,
  })
}

export async function createDestination(formData: FormData) {
  const profile = await requireStaffProfile()
  const parsed = parseDestination(formData)
  if ('error' in parsed) redirect(`/admin/destinasi/baru?error=${encodeURIComponent(parsed.error)}`)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('destinations')
    .insert({ ...parsed.value, created_by: profile.id })
    .select('id, slug, name')
    .single()

  if (error) {
    const message = error.code === '23505'
      ? 'Slug sudah digunakan. Ubah slug agar unik.'
      : `Destinasi gagal disimpan: ${error.message}`
    redirect(`/admin/destinasi/baru?error=${encodeURIComponent(message)}`)
  }

  await writeAuditLog(supabase, profile.id, 'destination.created', data.id, `Menambahkan destinasi ${data.name}`)
  invalidateDestinationPages(data.slug)
  redirect('/admin/destinasi?status=created')
}

export async function updateDestination(formData: FormData) {
  const profile = await requireStaffProfile()
  const id = textValue(formData, 'id')
  if (!id) redirect('/admin/destinasi?error=ID%20destinasi%20tidak%20valid')

  const parsed = parseDestination(formData)
  if ('error' in parsed) redirect(`/admin/destinasi/${encodeURIComponent(id)}/edit?error=${encodeURIComponent(parsed.error)}`)

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('destinations')
    .update(parsed.value)
    .eq('id', id)
    .select('id, slug, name')
    .maybeSingle()

  if (error || !data) {
    const message = error?.code === '23505'
      ? 'Slug sudah digunakan destinasi lain.'
      : `Perubahan gagal disimpan${error?.message ? `: ${error.message}` : '.'}`
    redirect(`/admin/destinasi/${encodeURIComponent(id)}/edit?error=${encodeURIComponent(message)}`)
  }

  await writeAuditLog(supabase, profile.id, 'destination.updated', data.id, `Memperbarui destinasi ${data.name}`)
  invalidateDestinationPages(data.slug)
  redirect('/admin/destinasi?status=updated')
}

export async function deleteDestination(formData: FormData) {
  const profile = await requireStaffProfile()
  if (!['super_admin', 'admin'].includes(profile.role)) {
    redirect('/admin/destinasi?error=Anda%20tidak%20memiliki%20izin%20menghapus%20destinasi')
  }

  const id = textValue(formData, 'id')
  const supabase = await createClient()
  const { data: existing, error: lookupError } = await supabase
    .from('destinations')
    .select('id, slug, name')
    .eq('id', id)
    .maybeSingle()

  if (lookupError || !existing) redirect('/admin/destinasi?error=Destinasi%20tidak%20ditemukan')

  // Simpan path media sebelum penghapusan; FK destination_media memakai ON DELETE CASCADE.
  const { data: relatedMedia, error: mediaLookupError } = await supabase
    .from('destination_media')
    .select('storage_path')
    .eq('destination_id', id)
  if (mediaLookupError) {
    redirect(`/admin/destinasi?error=${encodeURIComponent(`Daftar foto destinasi gagal dibaca: ${mediaLookupError.message}`)}`)
  }

  const { error } = await supabase.from('destinations').delete().eq('id', id)
  if (error) {
    const message = error.code === '23503'
      ? 'Destinasi memiliki riwayat reservasi dan tidak dapat dihapus. Ubah status publikasinya menjadi arsip.'
      : `Destinasi gagal dihapus: ${error.message}`
    redirect(`/admin/destinasi?error=${encodeURIComponent(message)}`)
  }

  // Metadata media sudah terhapus melalui cascade; bersihkan file fisik agar tidak menjadi orphan.
  const storagePaths = (relatedMedia || []).map((row) => row.storage_path)
  let storageCleanupWarning = ''
  if (storagePaths.length > 0) {
    const { error: storageError } = await supabase.storage.from('destination-media').remove(storagePaths)
    if (storageError) storageCleanupWarning = ` Destinasi terhapus, tetapi ${storagePaths.length} file foto belum berhasil dibersihkan dari Storage: ${storageError.message}.`
  }

  await writeAuditLog(supabase, profile.id, 'destination.deleted', existing.id, `Menghapus destinasi ${existing.name}`)
  invalidateDestinationPages(existing.slug)
  redirect(`/admin/destinasi?status=deleted${storageCleanupWarning ? `&error=${encodeURIComponent(storageCleanupWarning)}` : ''}`)
}
