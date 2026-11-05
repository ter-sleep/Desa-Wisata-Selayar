import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import {
  geographySources, geometryBounds, geometryCenter, geometryContains, mainIslandGeometry,
  miniatureBoundaryDistance, miniatureFieldOfView, miniatureProjection, parseBoundary, preserveBoundaryDetail, projectPosition, unprojectPosition,
} from '../lib/tourism-geography'

const read = (file: string) => JSON.parse(readFileSync(join(process.cwd(), 'public', 'maps', file), 'utf8'))
const villageData = read(geographySources.village.file)
const districtData = read(geographySources.district.file)
const archipelagoData = read(geographySources.archipelago.file)
const village = parseBoundary(villageData, 'Bontomarannu', 'KDEPUM', '73.01.04.2008')
const district = parseBoundary(districtData, 'Bontomanai', 'KDCPUM', '73.01.04')
const archipelago = parseBoundary(archipelagoData, 'Kepulauan Selayar', 'KDPKAB', '73.01')

test('official boundaries distinguish Bontomarannu village from Bontomanai district and retain indicative status', () => {
  assert.equal(village.status, 'Batas Indikatif')
  assert.equal(village.geometry.type, 'Polygon')
  assert.equal(district.geometry.type, 'MultiPolygon')
  assert.ok(geometryContains(district.geometry, geometryCenter(village.geometry)))
  assert.ok(geometryContains(archipelago.geometry, geometryCenter(village.geometry)))
  assert.deepEqual(geometryBounds(village.geometry), {
    west: 120.506885, south: -6.095971, east: 120.557494, north: -6.061564,
  })
  assert.match(geographySources.village.service, /^https:\/\/geoservices\.big\.go\.id\//)
  assert.equal(geographySources.edition, 'Juni 2026')
})

test('boundary parsing rejects wrong regions, duplicate features, invalid coordinates and open rings', () => {
  const change = (modify: (data: typeof villageData) => void) => {
    const data = structuredClone(villageData)
    modify(data)
    assert.throws(() => parseBoundary(data, 'Bontomarannu', 'KDEPUM', '73.01.04.2008'))
  }
  change((data) => { data.features[0].properties.WADMKK = 'Gowa' })
  change((data) => { data.features[0].properties.KDEPUM = '73.06.01.2001' })
  change((data) => { data.features.push(data.features[0]) })
  change((data) => { data.features[0].geometry.coordinates[0][0][0] = 181 })
  change((data) => { data.features[0].geometry.coordinates[0][0][1] = NaN })
  change((data) => { data.features[0].geometry.coordinates[0][0][2] = Infinity })
  change((data) => { data.features[0].geometry.coordinates[0][0].push(0) })
  change((data) => { const ring = data.features[0].geometry.coordinates[0]; ring[ring.length - 1][2] = 1 })
  change((data) => { data.features[0].geometry.coordinates[0].pop() })
})

test('BIG positions retain optional finite altitude without using it as surveyed miniature relief', () => {
  const ring = village.geometry.type === 'Polygon' ? village.geometry.coordinates[0] : village.geometry.coordinates[0][0]
  assert.equal(ring[0].length, 3)
  assert.deepEqual(ring[0], villageData.features[0].geometry.coordinates[0][0])
  const twoDimensional = structuredClone(villageData)
  twoDimensional.features[0].geometry.coordinates = twoDimensional.features[0].geometry.coordinates.map((points: number[][]) => points.map((point) => point.slice(0, 2)))
  assert.deepEqual(geometryBounds(parseBoundary(twoDimensional, 'Bontomarannu', 'KDEPUM', '73.01.04.2008').geometry), geometryBounds(village.geometry))
})

test('the miniature uses the actual main Selayar island and preserves geographic coordinate order', () => {
  const main = mainIslandGeometry(archipelago.geometry)
  assert.deepEqual(geometryBounds(main), { west: 120.426459, south: -6.498436, east: 120.568394, north: -5.767548 })
  assert.ok(geometryContains(main, geometryCenter(village.geometry)))
  const projection = miniatureProjection(archipelago.geometry)
  const position: [number, number] = [-6.07902, 120.52937]
  const projected = projectPosition(position, projection)
  const restored = unprojectPosition(projected, projection)
  assert.ok(Math.abs(restored[0] - position[0]) < 1e-10)
  assert.ok(Math.abs(restored[1] - position[1]) < 1e-10)
  assert.ok(projectPosition([position[0], position[1] + .01], projection)[0] > projected[0])
  assert.ok(projectPosition([position[0] + .01, position[1]], projection)[1] < projected[1])
})

test('village boundary focus fits the entire outline in portrait and landscape viewports', () => {
  const projection = miniatureProjection(archipelago.geometry)
  const bounds = geometryBounds(village.geometry)
  const width = (bounds.east - bounds.west) * projection.longitudeScale * projection.scale
  const height = (bounds.north - bounds.south) * projection.scale
  for (const aspect of [.4, .7, 1, 1.8]) {
    const distance = miniatureBoundaryDistance(village.geometry, projection, aspect)
    const visibleHeight = 2 * distance * Math.tan(miniatureFieldOfView * Math.PI / 360)
    assert.ok(visibleHeight >= height * 1.35)
    assert.ok(visibleHeight * aspect >= width * 1.35)
    assert.ok(distance >= 3.25)
  }
  assert.ok(miniatureBoundaryDistance(village.geometry, projection, .4) > miniatureBoundaryDistance(village.geometry, projection, 1.8))
  for (const aspect of [0, -1, NaN, Infinity]) {
    assert.throws(() => miniatureBoundaryDistance(village.geometry, projection, aspect))
  }
})

test('Google Maps is a place reference, not replacement boundary geometry or destination GPS', () => {
  const { position, url, purpose } = geographySources.reference
  assert.deepEqual(position, { latitude: -6.089094, longitude: 120.5394232 })
  assert.ok(geometryContains(village.geometry, [position.latitude, position.longitude]))
  assert.ok(!geometryContains(village.geometry, [-6.0918875, 120.4756788]))
  assert.equal(new URL(url).origin, 'https://www.google.com')
  assert.equal(new URL(url).search, '')
  assert.match(purpose, /differs from the Google Maps outline/)
  assert.match(purpose, /not polygon data/)
  assert.deepEqual(village.geometry, villageData.features[0].geometry)
})

test('regional regulations are historical references, not replacement boundary geometry', () => {
  const { bontokoraang, kaburu } = geographySources.legalReferences
  assert.equal(new URL(bontokoraang.url).origin, 'https://peraturan.bpk.go.id')
  assert.equal(new URL(kaburu.url).origin, 'https://peraturan.bpk.go.id')
  assert.match(bontokoraang.url, /\/49065\//)
  assert.match(kaburu.url, /\/49018\//)
  assert.equal(bontokoraang.article, 'Pasal 9')
  assert.equal(kaburu.article, 'Pasal 3')
  assert.match(bontokoraang.purpose, /does not include/)
  assert.match(kaburu.purpose, /separately/)
  assert.equal(village.status, 'Batas Indikatif')
  assert.deepEqual(village.geometry, villageData.features[0].geometry)
})

test('boundary rendering accepts original GeoJSON geometries and Features without losing vertex detail', () => {
  for (const input of [village.geometry, villageData.features[0], district.geometry]) {
    const before = structuredClone(input)
    const layer = { options: { smoothFactor: 1, color: '#e76350' } }
    preserveBoundaryDetail(input, layer)
    assert.deepEqual(layer.options, { smoothFactor: 0, color: '#e76350' })
    assert.deepEqual(input, before)
  }
})
