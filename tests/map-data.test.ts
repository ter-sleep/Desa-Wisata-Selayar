import assert from 'node:assert/strict'
import test from 'node:test'
import { bontomarannuView, directionsUrl, filterMapPoints, haversineKm, toLngLat, toMapPoints } from '../lib/map-data'
import { destinations, type Destination } from '../lib/site-data'

const verified: Destination = {
  ...destinations[0],
  coordinates: {
    latitude: -6.07, longitude: 120.52, accuracyMeters: 8,
    verificationStatus: 'verified', source: 'Regression fixture', verifiedAt: '2026-11-05T00:00:00Z',
  },
}

test('both map renderers share exact verified coordinates and never generate markers from the camera center', () => {
  assert.deepEqual(toMapPoints(destinations), [])
  const points = toMapPoints([verified, { ...destinations[1], coordinates: null }])
  assert.equal(points.length, 1)
  assert.deepEqual(points[0].position, [-6.07, 120.52])
  assert.notDeepEqual(points[0].position, bontomarannuView)
  assert.deepEqual(toLngLat(points[0].position), [120.52, -6.07])
  assert.equal(points[0].accuracyMeters, 8)
  assert.equal(points[0].coordinateSource, 'Regression fixture')
  for (const latitude of [91, -91, NaN, Infinity]) {
    assert.deepEqual(toMapPoints([{ ...verified, coordinates: { ...verified.coordinates!, latitude } }]), [])
  }
  for (const longitude of [181, -181, NaN, Infinity]) {
    assert.deepEqual(toMapPoints([{ ...verified, coordinates: { ...verified.coordinates!, longitude } }]), [])
  }
})

test('map filters preserve source categories independently of display language', () => {
  const points = toMapPoints([verified, {
    ...destinations[1],
    coordinates: { ...verified.coordinates!, latitude: -6.08, longitude: 120.53 },
  }])
  assert.equal(filterMapPoints(points, '  TANADOANG ', 'Semua').length, 1)
  assert.equal(filterMapPoints(points, '', 'Agrowisata')[0].slug, destinations[1].slug)
  assert.equal(filterMapPoints(points, 'Gojang', 'Alam').length, 0)
})

test('directions and straight-line distances retain latitude/longitude order', () => {
  const position: [number, number] = [-6.07, 120.52]
  assert.equal(new URL(directionsUrl(position)).searchParams.get('destination'), '-6.07,120.52')
  assert.equal(haversineKm(position, position), 0)
  assert.ok(Math.abs(haversineKm([0, 0], [0, 1]) - 111.195) < .001)
  assert.ok(Number.isFinite(haversineKm([0, 0], [0, 180])))
})
