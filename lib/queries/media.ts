import 'server-only'

import { createClient } from '@/lib/supabase/server'
import { isSupabaseConfigured } from '@/lib/supabase/env'
import type { Database } from '@/types/database'

const BUCKET = 'destination-media'
const SIGNED_URL_TTL_SECONDS = 60 * 60

type MediaRow = Database['public']['Tables']['destination_media']['Row']

type DestinationSummary = {
  id: string
  name: string
  slug: string
  publication_status: Database['public']['Tables']['destinations']['Row']['publication_status']
}

export type GalleryMediaItem = MediaRow & {
  image_url: string
  destination_name: string
  destination_slug: string
}

async function signMediaPaths(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: MediaRow[],
): Promise<Map<string, string>> {
  if (rows.length === 0) return new Map()
  const paths = rows.map((row) => row.storage_path)
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS)

  if (error || !data) {
    return new Map<string, string>(paths.map((path) => [path, '/images/destination-placeholder.svg'] as const))
  }

  return new Map<string, string>(rows.map((row, index) => [
    row.storage_path,
    data[index]?.signedUrl || '/images/destination-placeholder.svg',
  ] as const))
}

export async function getPublicGalleryMedia(limit = 120): Promise<GalleryMediaItem[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  const { data: destinations, error: destinationsError } = await supabase
    .from('destinations')
    .select('id, name, slug, publication_status')
    .eq('publication_status', 'published')

  if (destinationsError) throw new Error(`Gagal mengambil destinasi galeri: ${destinationsError.message}`)
  if (!destinations?.length) return []

  const destinationById = new Map<string, DestinationSummary>(
    (destinations as DestinationSummary[]).map((destination) => [destination.id, destination] as const),
  )
  const { data: media, error: mediaError } = await supabase
    .from('destination_media')
    .select('*')
    .in('destination_id', [...destinationById.keys()])
    .eq('is_published', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(limit)

  if (mediaError) throw new Error(`Gagal mengambil foto galeri: ${mediaError.message}`)

  const rows = (media || []) as MediaRow[]
  const urls = await signMediaPaths(supabase, rows)

  return rows.flatMap((row) => {
    const destination = destinationById.get(row.destination_id)
    if (!destination) return []
    return [{
      ...row,
      image_url: urls.get(row.storage_path) || '/images/destination-placeholder.svg',
      destination_name: destination.name,
      destination_slug: destination.slug,
    }]
  })
}

export async function getPublicMediaForDestination(destinationSlug: string): Promise<GalleryMediaItem[]> {
  if (!isSupabaseConfigured()) return []
  const supabase = await createClient()
  const { data: destination, error: destinationError } = await supabase
    .from('destinations')
    .select('id, name, slug, publication_status')
    .eq('slug', destinationSlug)
    .eq('publication_status', 'published')
    .maybeSingle()

  if (destinationError) throw new Error(`Gagal mengambil destinasi: ${destinationError.message}`)
  if (!destination) return []

  const { data: media, error: mediaError } = await supabase
    .from('destination_media')
    .select('*')
    .eq('destination_id', destination.id)
    .eq('is_published', true)
    .order('is_cover', { ascending: false })
    .order('sort_order', { ascending: true })

  if (mediaError) throw new Error(`Gagal mengambil dokumentasi destinasi: ${mediaError.message}`)
  const rows = (media || []) as MediaRow[]
  const urls = await signMediaPaths(supabase, rows)
  return rows.map((row) => ({
    ...row,
    image_url: urls.get(row.storage_path) || '/images/destination-placeholder.svg',
    destination_name: destination.name,
    destination_slug: destination.slug,
  }))
}

export async function getAdminGalleryData() {
  const supabase = await createClient()
  const [{ data: destinations, error: destinationError }, { data: media, error: mediaError }] = await Promise.all([
    supabase
      .from('destinations')
      .select('id, name, slug, publication_status')
      .order('name', { ascending: true }),
    supabase
      .from('destination_media')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200),
  ])

  if (destinationError) throw new Error(`Gagal mengambil daftar destinasi: ${destinationError.message}`)
  if (mediaError) throw new Error(`Gagal mengambil media: ${mediaError.message}`)

  const destinationById = new Map<string, DestinationSummary>(
    ((destinations || []) as DestinationSummary[]).map((destination) => [destination.id, destination] as const),
  )
  const rows = (media || []) as MediaRow[]
  const urls = await signMediaPaths(supabase, rows)
  const items: GalleryMediaItem[] = rows.flatMap((row) => {
    const destination = destinationById.get(row.destination_id)
    if (!destination) return []
    return [{
      ...row,
      image_url: urls.get(row.storage_path) || '/images/destination-placeholder.svg',
      destination_name: destination.name,
      destination_slug: destination.slug,
    }]
  })

  return {
    destinations: (destinations || []) as DestinationSummary[],
    media: items,
  }
}

export async function getPublicCoverImageUrls(destinationIds: string[]) {
  if (!destinationIds.length) return new Map<string, string>()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('destination_media')
    .select('*')
    .in('destination_id', destinationIds)
    .eq('is_cover', true)
    .eq('is_published', true)

  if (error) throw new Error(`Gagal mengambil foto sampul: ${error.message}`)
  const rows = (data || []) as MediaRow[]
  const urls = await signMediaPaths(supabase, rows)
  return new Map<string, string>(rows.flatMap((row) => {
    const signedUrl = urls.get(row.storage_path)
    return signedUrl && signedUrl !== '/images/destination-placeholder.svg'
      ? [[row.destination_id, signedUrl] as const]
      : []
  }))
}
