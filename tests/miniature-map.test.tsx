import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { MiniatureMap } from '../components/miniature-map'
import { SitePreferencesProvider } from '../components/site-preferences'
import { toMapPoints, type MapPoint } from '../lib/map-data'
import { destinations } from '../lib/site-data'
import { geographySources, parseBoundary } from '../lib/tourism-geography'

const read = (file: string) => JSON.parse(readFileSync(join(process.cwd(), 'public', 'maps', file), 'utf8'))
const geography = {
  village: parseBoundary(read(geographySources.village.file), 'Bontomarannu', 'KDEPUM', '73.01.04.2008'),
  district: parseBoundary(read(geographySources.district.file), 'Bontomanai', 'KDCPUM', '73.01.04'),
  archipelago: parseBoundary(read(geographySources.archipelago.file), 'Kepulauan Selayar', 'KDPKAB', '73.01'),
}
const render = (points: MapPoint[], language: 'id' | 'en') => renderToStaticMarkup(
  <SitePreferencesProvider initialLanguage={language} initialTheme="light">
    <MiniatureMap geography={geography} points={points} selected={points[0] || null} userPosition={null}
      focusPosition={null} focusSequence={0} areaSequence={0} onSelect={() => {}} onFocusArea={() => {}} />
  </SitePreferencesProvider>,
)

test('empty miniature cards identify the real area without fake destination coordinates or directions', () => {
  const html = render([], 'en')
  assert.match(html, /Bontomarannu village/)
  assert.match(html, /Bontomanai district/)
  assert.match(html, /Indicative boundary/)
  assert.match(html, /No destination pins yet/)
  assert.match(html, /Trees, relief, and buildings are illustrations, not surveyed data/)
  assert.doesNotMatch(html, /maps\/dir|Copy coordinates|miniature-coordinates/)
  assert.match(html, /data-action="rotate" aria-label="Rotate the view"/)
  assert.match(html, /data-action="reset" aria-label="Reset view"/)
})

test('verified miniature cards preserve coordinate order, directions and translated actions', () => {
  const points = toMapPoints([{
    ...destinations[0],
    coordinates: {
      latitude: -6.07, longitude: 120.52, accuracyMeters: 8,
      verificationStatus: 'verified', source: 'Regression fixture', verifiedAt: '2026-11-05T00:00:00Z',
    },
  }])
  assert.equal(points.length, 1)
  const english = render(points, 'en')
  assert.match(english, /Verified GPS/)
  assert.match(english, /-6\.07, 120\.52/)
  const directions = english.match(/href="(https:\/\/www\.google\.com\/maps\/dir\/[^"]+)"/)?.[1]
  assert.ok(directions)
  assert.equal(new URL(directions.replaceAll('&amp;', '&')).searchParams.get('destination'), '-6.07,120.52')
  assert.match(english, /Copy coordinates/)
  assert.match(english, /View destination page/)
  const indonesian = render(points, 'id')
  assert.match(indonesian, /GPS terverifikasi/)
  assert.match(indonesian, /Salin koordinat/)
  assert.doesNotMatch(indonesian, /Copy coordinates/)
})
