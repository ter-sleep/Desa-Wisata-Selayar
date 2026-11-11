import type { Database } from '@/types/database'

type DestinationRow = Database['public']['Tables']['destinations']['Row']
type GpsReview = Pick<DestinationRow,
  'verification_status' | 'latitude' | 'longitude' | 'verified_at' | 'verified_by' | 'reviewed_at' | 'reviewed_by'
>
type CompleteGpsReview = {
  latitude: number
  longitude: number
  verified_at: string
  verified_by: string
  reviewed_at: string
  reviewed_by: string
}

export function hasVerifiedCoordinates<T extends GpsReview>(row: T): row is T & CompleteGpsReview {
  return row.verification_status === 'verified'
    && row.latitude !== null
    && row.longitude !== null
    && Boolean(row.verified_at && row.verified_by && row.reviewed_at && row.reviewed_by)
}
