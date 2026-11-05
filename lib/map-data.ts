import type { Destination } from '@/lib/site-data'

export type Position = [number, number]

export type MapPoint = {
  slug: string
  name: string
  category: string
  description: string
  position: Position
  status: string
  accuracyMeters?: number
  coordinateSource?: string
}

// A regional camera center, never a destination marker or a verified field record.
export const bontomarannuView: Position = [-6.07902, 120.52937]
export const satelliteTiles = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

export function toMapPoints(destinations: Destination[]): MapPoint[] {
  return destinations.flatMap((destination) => {
    const coordinates = destination.coordinates
    if (!coordinates || coordinates.verificationStatus !== 'verified') return []
    if (!Number.isFinite(coordinates.latitude) || !Number.isFinite(coordinates.longitude) ||
      Math.abs(coordinates.latitude) > 90 || Math.abs(coordinates.longitude) > 180) return []

    return [{
      slug: destination.slug,
      name: destination.name,
      category: destination.category,
      description: destination.description,
      status: destination.status,
      position: [coordinates.latitude, coordinates.longitude] as Position,
      accuracyMeters: coordinates.accuracyMeters,
      coordinateSource: coordinates.source,
    }]
  })
}

export function filterMapPoints(points: MapPoint[], query: string, category: string) {
  const search = query.trim().toLocaleLowerCase()
  return points.filter((point) => (category === 'Semua' || point.category === category) &&
    point.name.toLocaleLowerCase().includes(search))
}

export function toLngLat([latitude, longitude]: Position): Position {
  return [longitude, latitude]
}

export function haversineKm(from: Position, to: Position) {
  const toRad = (value: number) => value * Math.PI / 180
  const dLat = toRad(to[0] - from[0])
  const dLng = toRad(to[1] - from[1])
  const a = Math.min(1, Math.max(0, Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from[0])) * Math.cos(toRad(to[0])) * Math.sin(dLng / 2) ** 2))
  return 6371.0088 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function directionsUrl(position: Position) {
  return `https://www.google.com/maps/dir/?api=1&destination=${position[0]},${position[1]}`
}
