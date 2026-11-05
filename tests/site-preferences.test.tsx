import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import { englishMessages, localizeContent, parseLanguage, parseTheme, translate } from '../lib/i18n'
import { SitePreferencesProvider } from '../components/site-preferences'
import { DestinationCard, Footer, Watermark } from '../components/site'
import { BoundaryReferences } from '../components/boundary-references'
import { destinations, navItems } from '../lib/site-data'

test('display preferences accept only supported languages and themes', () => {
  assert.equal(parseLanguage('en'), 'en')
  for (const value of [undefined, '', 'id', 'fr', '<script>']) assert.equal(parseLanguage(value), 'id')
  assert.equal(parseTheme('dark'), 'dark')
  assert.equal(parseTheme('light'), 'light')
  for (const value of [undefined, '', 'system', 'invalid']) assert.equal(parseTheme(value), 'system')
})

test('all editorial messages retain interpolation parameters in both languages', () => {
  const parameters = (value: string) => [...value.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort()
  for (const [source, translated] of Object.entries(englishMessages)) {
    assert.ok(translated.trim(), source)
    assert.deepEqual(parameters(source), parameters(translated), source)
  }
  for (const item of navItems) assert.notEqual(localizeContent('en', item.label), item.label)
  assert.equal(translate('en', '{visible} dari {total} titik terverifikasi', { visible: 2, total: 6 }), '2 of 6 verified points')
  assert.equal(translate('id', '{visible} dari {total} titik terverifikasi', { visible: 2, total: 6 }), '2 dari 6 titik terverifikasi')
  assert.throws(() => translate('en', '{count} entri'), /Missing translation parameter: count/)
})

test('known descriptions translate without inventing translations for new CMS content', () => {
  const description = destinations[0].description
  assert.equal(localizeContent('id', description), description)
  assert.match(localizeContent('en', description), /misty hills/)
  const edited = 'Keterangan baru yang ditulis pengelola.'
  assert.equal(localizeContent('en', edited), edited)
  const markup = renderToStaticMarkup(
    <SitePreferencesProvider initialLanguage="en">
      <DestinationCard destination={{ ...destinations[0], description: '<script>privateContent()</script>' }} />
    </SitePreferencesProvider>,
  )
  assert.match(markup, /&lt;script&gt;privateContent\(\)&lt;\/script&gt;/)
  assert.doesNotMatch(markup, /<script>privateContent/)
})

test('institutional logos are local and prominent in both header and footer variants', () => {
  const header = renderToStaticMarkup(<SitePreferencesProvider><Watermark compact /></SitePreferencesProvider>)
  assert.equal((header.match(/<img /g) || []).length, 3)
  assert.match(header, /universitas-muhammadiyah-makassar\.webp/)
  assert.match(header, /ukm-bahasa\.webp/)
  assert.match(header, /aksara-berdampak\.webp/)
  assert.doesNotMatch(header, /blob\.vercel-storage|opacity:/)
  const footer = renderToStaticMarkup(<SitePreferencesProvider initialLanguage="en" initialTheme="dark"><Footer /></SitePreferencesProvider>)
  assert.match(footer, /Managed by/)
  assert.match(footer, /UKM BAHASA/)
  assert.match(footer, /Universitas Muhammadiyah Makassar/)
  assert.match(footer, /Aksara Berdampak/)
  assert.match(footer, /href="\/peta"/)
})

test('boundary history links to regulations and distinguishes legal context from indicative geometry in both languages', () => {
  const render = (language: 'id' | 'en') => renderToStaticMarkup(
    <SitePreferencesProvider initialLanguage={language}><BoundaryReferences /></SitePreferencesProvider>,
  )
  const indonesian = render('id')
  const english = render('en')
  for (const html of [indonesian, english]) {
    assert.match(html, /<details class="map-boundary-details">/)
    assert.match(html, /https:\/\/peraturan\.bpk\.go\.id\/Details\/49065\//)
    assert.match(html, /https:\/\/peraturan\.bpk\.go\.id\/Details\/49018\//)
    assert.equal((html.match(/target="_blank" rel="noreferrer"/g) || []).length, 3)
  }
  assert.match(indonesian, /Riwayat batas desa/)
  assert.match(indonesian, /Bontomarannu di utara Bontokoraang/)
  assert.match(indonesian, /Bontomarannu di sebelah timur Kaburu/)
  assert.match(indonesian, /tetap bersumber dari BIG dan bersifat indikatif/)
  assert.match(english, /Village boundary history/)
  assert.match(english, /Bontomarannu north of Bontokoraang/)
  assert.match(english, /Bontomarannu east of Kaburu/)
  assert.match(english, /The displayed polygon still comes from BIG and is indicative/)
})
