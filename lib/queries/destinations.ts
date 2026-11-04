import 'server-only'

import { isSupabaseConfigured } from '@/lib/supabase/env'
import { createClient } from '@/lib/supabase/server'
import { destinations as fallbackDestinations, type Destination } from '@/lib/site-data'
import type { Database } from '@/types/database'
import { getPublicCoverImageUrls } from '@/lib/queries/media'

type DestinationRow = Database['public']['Tables']['destinations']['Row']

function mapDestination(row: DestinationRow, coverImage?: string): Destination {
  const coordinates =
    row.verification_status === 'verified' && row.latitude !== null && row.longitude !== null
      ? {
          latitude: Number(row.latitude),
          longitude: Number(row.longitude),
          ...(row.gps_accuracy_m !== null ? { accuracyMeters: Number(row.gps_accuracy_m) } : {}),
          source: row.coordinate_source || 'Sumber belum dicatat',
          verificationStatus: 'verified' as const,
          ...(row.verified_at ? { verifiedAt: row.verified_at } : {}),
        }
      : null

  return {
    slug: row.slug,
    name: row.name,
    category: row.category,
    eyebrow: row.eyebrow || 'Destinasi Bontomarannu',
    description: row.description,
    image: coverImage || row.image_url || '/images/destination-placeholder.svg',
    status: row.status,
    details: row.details || [],
    coordinates,
    dataSource: row.data_source || 'Belum dicantumkan',
    dataStatus: row.data_status,
    updatedYear: String(row.updated_year || new Date(row.updated_at).getFullYear()),
    sortOrder: row.sort_order,
  }
}

/**
 * Mengambil destinasi yang boleh dilihat publik.
 * Data fallback hanya dipakai ketika Supabase belum dikonfigurasi. Jika Supabase
 * sudah dikonfigurasi tetapi query gagal, error dilempar agar masalah koneksi
 * tidak disamarkan sebagai data produksi.
 */
export async function getPublicDestinations(): Promise<Destination[]> {
  if (!isSupabaseConfigured()) return fallbackDestinations

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .eq('publication_status', 'published')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(`Gagal mengambil data destinasi: ${error.message}`)
  const rows = (data || []) as DestinationRow[]
  const covers = await getPublicCoverImageUrls(rows.map((row) => row.id))
  return rows.map((row) => mapDestination(row, covers.get(row.id)))
}

export async function getPublicDestinationBySlug(slug: string): Promise<Destination | null> {
  if (!isSupabaseConfigured()) {
    return fallbackDestinations.find((destination) => destination.slug === slug) || null
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('destinations')
    .select('*')
    .eq('slug', slug)
    .eq('publication_status', 'published')
    .maybeSingle()

  if (error) throw new Error(`Gagal mengambil detail destinasi: ${error.message}`)
  if (!data) return null
  const covers = await getPublicCoverImageUrls([data.id])
  return mapDestination(data as DestinationRow, covers.get(data.id))
}

export async function getAllDestinationsForStaff() {
  const supabase = await createClient()
  return supabase
    .from('destinations')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })
}
