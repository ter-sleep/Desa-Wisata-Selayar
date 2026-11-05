import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { join } from 'node:path'
import test from 'node:test'
import next from 'next'

test('public routes preserve redirects, branding, language preferences and not-found status', { timeout: 180000 }, async (t) => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = ''
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = ''
  process.env.NEXT_TELEMETRY_DISABLED = '1'

  const server = createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')

  const app = next({ dev: true, hostname: '127.0.0.1', port: address.port })
  t.after(async () => {
    server.closeAllConnections()
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    await app.close()
  })

  await app.prepare()
  server.on('request', app.getRequestHandler())
  const base = `http://127.0.0.1:${address.port}`
  const request = (path, cookie) => fetch(`${base}${path}`, {
    redirect: 'manual', signal: AbortSignal.timeout(45000),
    headers: cookie ? { cookie } : undefined,
  })

  for (const path of ['/admin', '/admin/destinasi', '/admin/galeri', '/admin/peta']) {
    const response = await request(path)
    assert.equal(response.status, 307, path)
    const location = new URL(response.headers.get('location'), base)
    assert.equal(location.pathname, '/login')
    assert.equal(location.searchParams.get('error'), 'setup')
  }

  const notFound = await request('/destinasi/destinasi-yang-tidak-ada-123')
  assert.equal(notFound.status, 404)
  assert.match(await notFound.text(), /Halaman belum tersedia/)
  assert.equal((await request('/kontak')).status, 200)

  const routes = [
    ['/', 'Discover another side of'],
    ['/destinasi', 'Places to'],
    ['/destinasi/puncak-tanadoang', 'About this place'],
    ['/profil', 'One village,'],
    ['/sejarah-budaya', 'Trace the heritage of'],
    ['/agrowisata', 'From the forest,'],
    ['/panduan-berkunjung', 'preparation.'],
    ['/galeri', 'Look a little'],
    ['/informasi', 'Stories that'],
    ['/peta', 'See the village from'],
    ['/pusat-data', 'Data for a better journey.'],
    ['/reservasi', 'Reservation request'],
    ['/kontak', 'Send us a message'],
    ['/kebijakan-privasi', 'Information you submit'],
    ['/login', 'Sign in to the dashboard'],
  ]
  for (const [path, heading] of routes) {
    const response = await request(path, 'dewis-language=en; dewis-theme=dark')
    assert.equal(response.status, 200, path)
    const html = await response.text()
    assert.match(html, /<html[^>]*lang="en"[^>]*class="dark"/, path)
    assert.ok(html.includes(heading), `${path} has translated server content`)
    assert.match(html, /Managed by/, path)
    assert.match(html, /UKM BAHASA/, path)
    assert.match(html, /universitas-muhammadiyah-makassar\.webp/, path)
    assert.match(html, /ukm-bahasa\.webp/, path)
    assert.match(html, /aksara-berdampak\.webp/, path)
  }
  const englishNotFound = await request('/destinasi/does-not-exist', 'dewis-language=en')
  assert.equal(englishNotFound.status, 404)
  assert.match(await englishNotFound.text(), /This page is not available/)
  const missingRoute = await request('/page-that-does-not-exist', 'dewis-language=en')
  assert.equal(missingRoute.status, 404)
  assert.match(await missingRoute.text(), /This page is not available/)
  const invalidPreferences = await request('/profil', 'dewis-language=fr; dewis-theme=invalid')
  assert.match(await invalidPreferences.text(), /<html[^>]*lang="id"[^>]*data-theme="light"/)
  const submissionError = await request(`/kontak?error=${encodeURIComponent('Format email tidak valid.')}`, 'dewis-language=en')
  assert.match(await submissionError.text(), /The email format is invalid/)
  for (const image of ['universitas-muhammadiyah-makassar', 'ukm-bahasa', 'aksara-berdampak']) {
    const response = await request(`/images/branding/${image}.webp`)
    assert.equal(response.status, 200)
    assert.match(response.headers.get('content-type'), /image\/webp/)
  }
  for (const file of ['sources.json', 'bontomarannu.geojson', 'bontomanai.geojson', 'kepulauan-selayar.geojson']) {
    const response = await request(`/maps/${file}`)
    assert.equal(response.status, 200, file)
    const expected = await readFile(join(process.cwd(), 'public', 'maps', file))
    const actual = Buffer.from(await response.arrayBuffer())
    const digest = (buffer) => createHash('sha256').update(buffer).digest('hex')
    assert.equal(digest(actual), digest(expected), `${file} preserves the bundled geographic data and provenance`)
    const data = JSON.parse(actual.toString())
    assert.equal(file === 'sources.json' ? data.publisher : data.type, file === 'sources.json' ? 'Badan Informasi Geospasial' : 'FeatureCollection')
  }
})
