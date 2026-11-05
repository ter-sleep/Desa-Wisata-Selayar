import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import next from 'next'

test('unconfigured public routes preserve redirects and not-found status', { timeout: 90000 }, async (t) => {
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
  const request = (path) => fetch(`${base}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(45000) })

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
})
