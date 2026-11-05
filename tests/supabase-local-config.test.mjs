import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { createServer } from 'node:http'
import test from 'node:test'
import { localOnlyFetch, localSupabaseConfig } from './supabase-local-config.mjs'

test('Supabase integration configuration only accepts an unlinked loopback API', async () => {
  const status = {
    API_URL: 'http://127.0.0.1:54321',
    ANON_KEY: randomBytes(32).toString('hex'),
    SERVICE_ROLE_KEY: randomBytes(32).toString('hex'),
  }
  const config = localSupabaseConfig(status)
  assert.equal(config.url, status.API_URL)
  for (const apiUrl of [
    'https://example.com',
    'http://localhost:54321',
    'http://127.0.0.1',
    'http://127.0.0.1:54321@remote.example',
    'http://127.0.0.1:54321/auth/v1',
    'http://127.0.0.1:54321/?redirect=remote',
  ]) {
    assert.throws(() => localSupabaseConfig({ ...status, API_URL: apiUrl }), /only allow|invalid/)
  }
  assert.throws(() => localSupabaseConfig({ ...status, SERVICE_ROLE_KEY: '' }), /missing/)
  assert.throws(() => localSupabaseConfig({ ...status, linked_project_ref: 'linked' }), /unlinked/)
  assert.throws(() => localOnlyFetch('https://example.com'), /only allow/)
  await assert.rejects(async () => localOnlyFetch(config.url)('https://example.com'), /outside the local/)
})

test('local integration requests cannot follow redirects to a remote host', async (t) => {
  const server = createServer((request, response) => {
    if (request.url === '/redirect') {
      response.writeHead(302, { location: 'https://example.com' })
      response.end()
    } else {
      response.end('local')
    }
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  t.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const request = localOnlyFetch(`http://127.0.0.1:${address.port}`)
  assert.equal(await (await request(`http://127.0.0.1:${address.port}/`)).text(), 'local')
  await assert.rejects(() => request(`http://127.0.0.1:${address.port}/redirect`))
})
