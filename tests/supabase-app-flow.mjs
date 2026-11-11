import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import next from 'next'
import { guardedIntegrationFetch } from './supabase-local-config.mjs'

function browser(origin) {
  const cookies = new Map()
  return {
    async request(path, options = {}) {
      const target = new URL(path, origin)
      if (target.origin !== origin) throw new Error('Application test refused a nonlocal request.')
      const headers = new Headers(options.headers)
      headers.set('origin', origin)
      if (cookies.size) headers.set('cookie', [...cookies].map(([key, value]) => `${key}=${value}`).join('; '))
      const response = await fetch(target, {
        ...options,
        headers,
        redirect: 'manual',
        signal: AbortSignal.timeout(60000),
      })
      for (const header of response.headers.getSetCookie()) {
        const [pair, ...attributes] = header.split(';')
        const equals = pair.indexOf('=')
        if (equals < 0) continue
        const key = pair.slice(0, equals)
        const value = pair.slice(equals + 1)
        if (!value || attributes.some((attribute) => /^\s*max-age=0\s*$/i.test(attribute))) cookies.delete(key)
        else cookies.set(key, value)
      }
      return response
    },
  }
}

function hasFormClass(name) {
  return (form) => {
    const opening = form.slice(0, form.indexOf('>') + 1)
    const classes = opening.match(/\bclass="([^"]*)"/)?.[1]?.split(/\s+/) || []
    return classes.includes(name)
  }
}

async function loadForm(user, path, predicate, label) {
  const response = await user.request(path)
  assert.equal(response.status, 200, `Load ${label}`)
  const html = await response.text()
  const forms = html.match(/<form\b[^>]*>[\s\S]*?<\/form>/g) || []
  const form = forms.find(predicate)
  assert.ok(form, `${label} form was not rendered`)
  const action = form.match(/name="(\$ACTION_ID_[^"]+)"/)?.[1]
  assert.ok(action, `${label} Server Action was not rendered`)
  return { action, html }
}

async function submit(user, path, form, fields = {}, upload) {
  const body = new FormData()
  body.set(form.action, '')
  for (const [key, value] of Object.entries(fields)) body.set(key, String(value))
  if (upload) body.set('file', new Blob([upload], { type: 'image/png' }), 'integrasi.png')
  return user.request(path, { method: 'POST', body })
}

function expectRedirect(response, origin, path, expected, label, safeMessage) {
  assert.equal(response.status, 303, `${label} response status`)
  const location = response.headers.get('location')
  assert.ok(location, `${label} redirect is missing`)
  const target = new URL(location, origin)
  assert.equal(target.origin, origin, `${label} redirected outside the application`)
  const problem = target.searchParams.get('error')
  if (target.pathname !== path || (expected && target.searchParams.get(expected[0]) !== expected[1])) {
    throw new Error(`${label} redirected to ${target.pathname}${problem ? `: ${safeMessage({ message: problem })}` : ''}`)
  }
  return target
}

export async function testAppFlows(t, {
  config, users, password, service, fixture, png, requireData, safeMessage, createDestination,
}) {
  const previous = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_TELEMETRY_DISABLED: process.env.NEXT_TELEMETRY_DISABLED,
  }
  process.env.NEXT_PUBLIC_SUPABASE_URL = config.url
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = config.anonKey
  process.env.NEXT_TELEMETRY_DISABLED = '1'

  const server = createServer()
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const origin = `http://127.0.0.1:${address.port}`
  const app = next({ dev: true, hostname: '127.0.0.1', port: address.port })
  const previousFetch = globalThis.fetch
  globalThis.fetch = guardedIntegrationFetch(config.url, origin, previousFetch)
  t.after(async () => {
    try {
      server.closeAllConnections()
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
      await app.close()
    } finally {
      globalThis.fetch = previousFetch
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key]
        else process.env[key] = value
      }
    }
  })
  await app.prepare()
  server.on('request', app.getRequestHandler())

  async function signIn(user, account, expectedError) {
    const form = await loadForm(user, '/login', hasFormClass('auth-form'), 'Login')
    const response = await submit(user, '/login', form, { email: account.email, password })
    if (expectedError) expectRedirect(response, origin, '/login', ['error', expectedError], 'Login rejection', safeMessage)
    else expectRedirect(response, origin, '/admin', null, 'Staff login', safeMessage)
  }

  const guest = browser(origin)
  const blocked = await guest.request('/admin')
  assert.equal(blocked.status, 307, 'Unauthenticated dashboard access is redirected')
  assert.equal(new URL(blocked.headers.get('location'), origin).pathname, '/login')

  const wrongPassword = browser(origin)
  const login = await loadForm(wrongPassword, '/login', hasFormClass('auth-form'), 'Login')
  expectRedirect(
    await submit(wrongPassword, '/login', login, { email: users.editor.email, password: `${password}wrong` }),
    origin, '/login', ['error', 'invalid-credentials'], 'Invalid login', safeMessage,
  )
  for (const account of [users.visitor, users.inactive]) {
    const rejected = browser(origin)
    await signIn(rejected, account, 'unauthorized')
    assert.equal((await rejected.request('/admin')).status, 307, 'Non-staff session cannot access the dashboard')
  }

  const editor = browser(origin)
  await signIn(editor, users.editor)
  assert.equal((await editor.request('/admin')).status, 200, 'Editor can open the dashboard')

  const slug = `${fixture.subject}-ui`
  const fields = {
    slug,
    name: 'Destinasi integrasi UI',
    category: 'Alam',
    description: 'Deskripsi sementara untuk pengujian aplikasi.',
    publication_status: 'published',
    sort_order: '100',
  }
  const createForm = await loadForm(editor, '/admin/destinasi/baru', hasFormClass('admin-form'), 'Create destination')
  const createdResponse = await submit(editor, '/admin/destinasi/baru', createForm, fields)
  const created = requireData(await service.from('destinations').select('id').eq('slug', slug).maybeSingle(), 'Read UI destination')
  if (created) fixture.destinationIds.push(created.id)
  expectRedirect(createdResponse, origin, '/admin/destinasi', ['status', 'created'], 'Create destination', safeMessage)
  assert.ok(created, 'Application created a destination')

  const editPath = `/admin/destinasi/${created.id}/edit`
  const editForm = await loadForm(editor, editPath, hasFormClass('admin-form'), 'Edit destination')
  expectRedirect(
    await submit(editor, editPath, editForm, { ...fields, id: created.id, description: 'Deskripsi UI yang telah diperbarui.' }),
    origin, '/admin/destinasi', ['status', 'updated'], 'Edit destination', safeMessage,
  )
  const destination = requireData(await service.from('destinations').select('description')
    .eq('id', created.id).single(), 'Read edited destination')
  assert.equal(destination.description, 'Deskripsi UI yang telah diperbarui.')
  const publicPage = await guest.request(`/destinasi/${slug}`)
  assert.equal(publicPage.status, 200)
  assert.ok((await publicPage.text()).includes('Destinasi integrasi UI'))

  const upload = await loadForm(editor, '/admin/galeri', hasFormClass('media-upload-form'), 'Upload media')
  const uploadResponse = await submit(editor, '/admin/galeri', upload, {
    destination_id: created.id,
    caption: 'Foto integrasi UI',
    alt_text: 'Gambar integrasi UI',
    is_published: 'on',
    is_cover: 'on',
  }, png)
  const media = requireData(await service.from('destination_media').select('id, storage_path, is_cover')
    .eq('destination_id', created.id).maybeSingle(), 'Read uploaded media')
  if (media) fixture.paths.push(media.storage_path)
  expectRedirect(uploadResponse, origin, '/admin/galeri', ['status', 'uploaded'], 'Upload media', safeMessage)
  assert.ok(media?.is_cover, 'Application published and selected the uploaded cover')
  const gallery = await guest.request('/galeri')
  assert.equal(gallery.status, 200)
  assert.ok((await gallery.text()).includes('Gambar integrasi UI'), 'Published media is visible in the gallery')

  const gpsPath = `/admin/peta/${created.id}`
  const gpsForm = await loadForm(editor, gpsPath, hasFormClass('gps-coordinate-form'), 'GPS entry')
  const gpsVersion = requireData(await service.from('destinations').select('updated_at').eq('id', created.id).single(), 'Read GPS revision')
  expectRedirect(await submit(editor, gpsPath, gpsForm, {
    id: created.id,
    updated_at: gpsVersion.updated_at,
    latitude: '-6.13',
    longitude: '120.46',
    coordinate_method: 'map_pin',
    coordinate_source: 'Titik integrasi sementara',
  }), origin, gpsPath, ['status', 'saved'], 'Save GPS', safeMessage)
  const pending = requireData(await service.from('destinations').select('verification_status, updated_at')
    .eq('id', created.id).single(), 'Read pending GPS')
  assert.equal(pending.verification_status, 'pending')

  const admin = browser(origin)
  await signIn(admin, users.admin)
  const review = await loadForm(admin, gpsPath, hasFormClass('gps-review-form'), 'GPS review')
  expectRedirect(await submit(admin, gpsPath, review, {
    id: created.id,
    updated_at: pending.updated_at,
    verification_note: 'Pemeriksaan integrasi UI',
    decision: 'verified',
  }), origin, gpsPath, ['status', 'verified'], 'Review GPS', safeMessage)
  const verified = requireData(await service.from('destinations').select('verification_status, reviewed_by')
    .eq('id', created.id).single(), 'Read verified GPS')
  assert.equal(verified.verification_status, 'verified')
  assert.equal(verified.reviewed_by, users.admin.id)

  const bookingForm = await loadForm(guest, '/reservasi', hasFormClass('visitor-form'), 'Reservation')
  const bookingResponse = await submit(guest, '/reservasi', bookingForm, {
    destination_id: created.id,
    visitor_name: 'Pengunjung integrasi UI',
    whatsapp: '081234567890',
    visit_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
    participant_count: '2',
    privacy_consent: 'on',
  })
  const bookingRedirect = expectRedirect(bookingResponse, origin, '/reservasi', ['status', 'sent'], 'Submit reservation', safeMessage)
  const bookingCode = bookingRedirect.searchParams.get('code')
  assert.match(bookingCode || '', /^BTM-\d{8}-[A-F0-9]{8}$/)
  const reservation = requireData(await service.from('reservations').select('id, updated_at')
    .eq('booking_code', bookingCode).single(), 'Read UI reservation')

  const contactForm = await loadForm(guest, '/kontak', hasFormClass('visitor-form'), 'Contact')
  expectRedirect(await submit(guest, '/kontak', contactForm, {
    visitor_name: 'Pengunjung integrasi UI',
    subject: fixture.subject,
    message: 'Pesan integrasi lewat website.',
    privacy_consent: 'on',
  }), origin, '/kontak', ['status', 'sent'], 'Submit contact', safeMessage)
  const message = requireData(await service.from('contact_messages').select('id, updated_at')
    .eq('subject', fixture.subject).eq('message', 'Pesan integrasi lewat website.').single(), 'Read UI message')

  const recordForm = (id) => (form) => hasFormClass('admin-status-form')(form) && form.includes(`value="${id}"`)
  const reservationForm = await loadForm(editor, '/admin/reservasi', recordForm(reservation.id), 'Reservation status')
  const reservationStart = Date.now()
  expectRedirect(await submit(editor, '/admin/reservasi', reservationForm, {
    id: reservation.id,
    updated_at: reservation.updated_at,
    status: 'confirmed',
    admin_notes: 'Dikonfirmasi melalui UI',
    processed_by: users.admin.id,
    processed_at: '2000-01-01T00:00:00Z',
  }), origin, '/admin/reservasi', ['status', 'updated'], 'Update reservation', safeMessage)
  const reservationColumns = 'status, admin_notes, processed_by, processed_at, updated_at'
  const updatedReservation = requireData(await service.from('reservations').select(reservationColumns)
    .eq('id', reservation.id).single(), 'Read updated reservation')
  assert.equal(updatedReservation.status, 'confirmed')
  assert.equal(updatedReservation.admin_notes, 'Dikonfirmasi melalui UI')
  assert.equal(updatedReservation.processed_by, users.editor.id)
  assert.equal(updatedReservation.processed_at, updatedReservation.updated_at)
  assert.ok(Date.parse(updatedReservation.processed_at) >= reservationStart - 1000 &&
    Date.parse(updatedReservation.processed_at) <= Date.now() + 1000, 'Reservation processing time is database time')
  const staleReservation = expectRedirect(await submit(editor, '/admin/reservasi', reservationForm, {
    id: reservation.id, updated_at: reservation.updated_at, status: 'completed', admin_notes: 'Catatan lama',
  }), origin, '/admin/reservasi', null, 'Stale reservation update', safeMessage)
  assert.match(staleReservation.searchParams.get('error') || '', /sudah berubah/)
  assert.deepEqual(requireData(await service.from('reservations').select(reservationColumns)
    .eq('id', reservation.id).single(), 'Read reservation after stale action'), updatedReservation)
  const messageForm = await loadForm(editor, '/admin/pesan', recordForm(message.id), 'Message status')
  const messageStart = Date.now()
  expectRedirect(await submit(editor, '/admin/pesan', messageForm, {
    id: message.id,
    updated_at: message.updated_at,
    status: 'read',
    processed_by: users.admin.id,
    processed_at: '2099-01-01T00:00:00Z',
  }), origin, '/admin/pesan', ['status', 'updated'], 'Update message', safeMessage)
  const messageColumns = 'status, processed_by, processed_at, updated_at'
  const updatedMessage = requireData(await service.from('contact_messages').select(messageColumns)
    .eq('id', message.id).single(), 'Read updated message')
  assert.equal(updatedMessage.status, 'read')
  assert.equal(updatedMessage.processed_by, users.editor.id)
  assert.equal(updatedMessage.processed_at, updatedMessage.updated_at)
  assert.ok(Date.parse(updatedMessage.processed_at) >= messageStart - 1000 &&
    Date.parse(updatedMessage.processed_at) <= Date.now() + 1000, 'Message processing time is database time')
  const staleMessage = expectRedirect(await submit(editor, '/admin/pesan', messageForm, {
    id: message.id, updated_at: message.updated_at, status: 'replied',
  }), origin, '/admin/pesan', null, 'Stale message update', safeMessage)
  assert.match(staleMessage.searchParams.get('error') || '', /sudah berubah/)
  assert.deepEqual(requireData(await service.from('contact_messages').select(messageColumns)
    .eq('id', message.id).single(), 'Read message after stale action'), updatedMessage)

  const deleteMedia = await loadForm(editor, '/admin/galeri', (form) => form.includes(`value="${media.id}"`) && form.includes('Hapus'),
    'Delete media')
  expectRedirect(await submit(editor, '/admin/galeri', deleteMedia, { id: media.id }),
    origin, '/admin/galeri', ['status', 'deleted'], 'Delete media', safeMessage)
  const removedMedia = requireData(await service.from('destination_media').select('id')
    .eq('id', media.id).maybeSingle(), 'Read deleted media')
  assert.equal(removedMedia, null)
  assert.ok((await service.storage.from('destination-media').download(media.storage_path)).error, 'Media object was deleted')

  const removable = await createDestination('ui-delete')
  const deleteDestination = await loadForm(admin, '/admin/destinasi', (form) => form.includes(`value="${removable.id}"`) && form.includes('Hapus'),
    'Delete destination')
  expectRedirect(await submit(admin, '/admin/destinasi', deleteDestination, { id: removable.id }),
    origin, '/admin/destinasi', ['status', 'deleted'], 'Delete destination', safeMessage)
  const removed = requireData(await service.from('destinations').select('id').eq('id', removable.id).maybeSingle(), 'Read deleted destination')
  assert.equal(removed, null)

  const logout = await loadForm(admin, '/admin', (form) => form.includes('admin-logout'), 'Logout')
  expectRedirect(await submit(admin, '/admin', logout), origin, '/login', ['status', 'signed-out'], 'Logout', safeMessage)
  assert.equal((await admin.request('/admin')).status, 307, 'Logged-out session cannot access the dashboard')
}
