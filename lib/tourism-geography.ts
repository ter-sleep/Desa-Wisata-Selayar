import type { MultiPolygon, Polygon } from 'geojson'
import type { Position } from '@/lib/map-data'
import sources from '@/public/maps/sources.json'

export type AreaGeometry = Polygon | MultiPolygon
export type Boundary = { name: string; code: string; geometry: AreaGeometry; status: string | null }
export type TourismGeography = { village: Boundary; district: Boundary; archipelago: Boundary }
export type Bounds = { west: number; south: number; east: number; north: number }
export type MiniatureProjection = { latitude: number; longitude: number; longitudeScale: number; scale: number }
export const geographySources = sources

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function ring(value: unknown): value is number[][] {
  if (!Array.isArray(value) || value.length < 4) return false
  if (!value.every((point) => Array.isArray(point) && (point.length === 2 || point.length === 3) &&
    point.every(Number.isFinite) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90)) return false
  const first = value[0], last = value[value.length - 1]
  return first.length === last.length && first[0] === last[0] && first[1] === last[1] && first[2] === last[2]
}

function polygon(value: unknown): value is number[][][] {
  return Array.isArray(value) && value.length > 0 && value.every(ring)
}

function geometry(value: unknown): AreaGeometry {
  if (record(value)) {
    if (value.type === 'Polygon' && polygon(value.coordinates)) return { type: 'Polygon', coordinates: value.coordinates }
    if (value.type === 'MultiPolygon' && Array.isArray(value.coordinates) &&
      value.coordinates.length > 0 && value.coordinates.every(polygon)) {
      return { type: 'MultiPolygon', coordinates: value.coordinates }
    }
  }
  throw new Error('Boundary geometry must contain closed, finite WGS 84 polygon rings.')
}

export function parseBoundary(value: unknown, name: string, codeField: string, code: string): Boundary {
  if (!record(value) || value.type !== 'FeatureCollection' || !Array.isArray(value.features) || value.features.length !== 1) {
    throw new Error(`Expected exactly one boundary for ${name}.`)
  }
  const feature = value.features[0]
  if (!record(feature) || feature.type !== 'Feature' || !record(feature.properties) ||
    feature.properties.NAMOBJ !== name || feature.properties[codeField] !== code ||
    feature.properties.WADMKK !== 'Kepulauan Selayar' || feature.properties.WADMPR !== 'Sulawesi Selatan') {
    throw new Error(`Boundary identity does not match ${name}, Kepulauan Selayar.`)
  }
  return {
    name, code, geometry: geometry(feature.geometry),
    status: typeof feature.properties.Status === 'string' ? feature.properties.Status : null,
  }
}

export async function loadTourismGeography(signal: AbortSignal): Promise<TourismGeography> {
  const definitions = [
    [sources.village.file, sources.village.name, 'KDEPUM', sources.village.code],
    [sources.district.file, sources.district.name, 'KDCPUM', sources.district.code],
    [sources.archipelago.file, sources.archipelago.name, 'KDPKAB', sources.archipelago.code],
  ]
  const [village, district, archipelago] = await Promise.all(definitions.map(async ([file, name, field, code]) => {
    const response = await fetch(`/maps/${file}`, { signal })
    if (!response.ok) throw new Error(`Boundary resource ${file} returned HTTP ${response.status}.`)
    return parseBoundary(await response.json(), name, field, code)
  }))
  return { village, district, archipelago }
}

export function geometryPolygons(area: AreaGeometry) {
  return area.type === 'Polygon' ? [area.coordinates] : area.coordinates
}

export function geometryBounds(area: AreaGeometry): Bounds {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity
  for (const rings of geometryPolygons(area)) for (const points of rings) for (const [longitude, latitude] of points) {
    west = Math.min(west, longitude)
    south = Math.min(south, latitude)
    east = Math.max(east, longitude)
    north = Math.max(north, latitude)
  }
  if (![west, south, east, north].every(Number.isFinite)) throw new Error('Boundary geometry has no valid vertices.')
  return { west, south, east, north }
}

export function geometryCenter(area: AreaGeometry): Position {
  const bounds = geometryBounds(area)
  return [(bounds.south + bounds.north) / 2, (bounds.west + bounds.east) / 2]
}

export function pointInRing([latitude, longitude]: Position, points: number[][]) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [xi, yi] = points[i], [xj, yj] = points[j]
    const cross = (longitude - xi) * (yj - yi) - (latitude - yi) * (xj - xi)
    if (Math.abs(cross) < 1e-12 && longitude >= Math.min(xi, xj) && longitude <= Math.max(xi, xj) &&
      latitude >= Math.min(yi, yj) && latitude <= Math.max(yi, yj)) return true
    if ((yi > latitude) !== (yj > latitude) && longitude < (xj - xi) * (latitude - yi) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

export function geometryContains(area: AreaGeometry, position: Position) {
  return geometryPolygons(area).some(([outer, ...holes]) =>
    pointInRing(position, outer) && !holes.some((hole) => pointInRing(position, hole)),
  )
}

export function ringArea(points: number[][]) {
  const [originX, originY] = points[0]
  return Math.abs(points.reduce((area, [x, y], index) => {
    const [nextX, nextY] = points[(index + 1) % points.length]
    return area + (x - originX) * (nextY - originY) - (nextX - originX) * (y - originY)
  }, 0)) / 2
}

export function mainIslandGeometry(area: AreaGeometry): Polygon {
  const polygons = geometryPolygons(area)
  const largest = polygons.reduce((main, candidate) => ringArea(candidate[0]) > ringArea(main[0]) ? candidate : main)
  return { type: 'Polygon', coordinates: largest }
}

export function miniatureProjection(area: AreaGeometry): MiniatureProjection {
  const bounds = geometryBounds(mainIslandGeometry(area))
  const latitude = (bounds.south + bounds.north) / 2
  const longitudeScale = Math.cos(latitude * Math.PI / 180)
  return {
    latitude, longitude: (bounds.west + bounds.east) / 2, longitudeScale,
    scale: 20 / Math.max(bounds.north - bounds.south, (bounds.east - bounds.west) * longitudeScale),
  }
}

export function projectPosition([latitude, longitude]: Position, projection: MiniatureProjection): [number, number] {
  return [(longitude - projection.longitude) * projection.longitudeScale * projection.scale,
    (projection.latitude - latitude) * projection.scale]
}

export function unprojectPosition([x, z]: [number, number], projection: MiniatureProjection): Position {
  return [projection.latitude - z / projection.scale,
    projection.longitude + x / (projection.longitudeScale * projection.scale)]
}
