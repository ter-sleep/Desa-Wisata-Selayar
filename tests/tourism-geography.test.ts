import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import {
  geographySources, geometryBounds, geometryCenter, geometryContains, mainIslandGeometry,
  miniatureProjection, parseBoundary, projectPosition, unprojectPosition,
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
