import assert from 'node:assert/strict'
import { randomBytes, randomUUID } from 'node:crypto'
import test from 'node:test'
import { createClient } from '@supabase/supabase-js'
import { localOnlyFetch, readLocalSupabaseConfig } from './supabase-local-config.mjs'

const config = await readLocalSupabaseConfig(process.env.DEWIS_SUPABASE_STATUS_FILE)
const localFetch = localOnlyFetch(config.url)
const sensitive = new Set([config.anonKey, config.serviceKey])
const bucket = 'destination-media'
const png = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=',
  'base64',
)

function safeMessage(error) {
  let message = error?.message || 'Unknown error'
  for (const value of sensitive) message = message.split(value).join('[redacted]')
  return message.replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[redacted]')
}

function requireData(result, operation) {
  if (result.error) throw new Error(`${operation}: ${safeMessage(result.error)}`)
  return result.data
}

function requireDenied(result, operation) {
  assert.ok(result.error, `${operation} unexpectedly succeeded`)
  assert.equal(result.error.code, '42501', `${operation}: ${safeMessage(result.error)}`)
}

function requireInvisible(result, operation) {
  if (result.error) {
    requireDenied(result, operation)
  } else {
    assert.deepEqual(result.data, [], `${operation} returned private rows`)
  }
}

function client(key = config.anonKey) {
  return createClient(config.url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: localFetch },
  })
}

test('local Supabase Auth, PostgREST, RLS, RPC and Storage', { timeout: 180000 }, async (t) => {
  const service = client(config.serviceKey)
  const anon = client()
  const marker = randomUUID()
  const password = randomBytes(24).toString('base64url')
  sensitive.add(password)
  const users = {}
  const fixture = { userIds: [], destinationIds: [], paths: [], subject: `integration-${marker}`, setting: `integration-${marker}` }

  t.after(async () => {
    const errors = []
    async function clean(label, promise) {
      try {
        const result = await promise
        if (result.error) errors.push(`${label}: ${safeMessage(result.error)}`)
      } catch (error) {
        errors.push(`${label}: ${safeMessage(error)}`)
      }
    }
    if (fixture.paths.length) await clean('Storage cleanup', service.storage.from(bucket).remove(fixture.paths))
    for (const id of fixture.destinationIds) {
      await clean('Reservation cleanup', service.from('reservations').delete().eq('destination_id', id))
    }
    await clean('Contact cleanup', service.from('contact_messages').delete().eq('subject', fixture.subject))
    await clean('Settings cleanup', service.from('site_settings').delete().eq('key', fixture.setting))
    for (const id of fixture.destinationIds) {
      await clean('Destination cleanup', service.from('destinations').delete().eq('id', id))
    }
    for (const id of fixture.userIds) await clean('Auth cleanup', service.auth.admin.deleteUser(id))
    if (errors.length) throw new Error(errors.join('; '))
  })

  const seeds = requireData(await anon.from('destinations').select('slug'), 'Read seeded destinations')
  assert.ok(seeds.some((row) => row.slug === 'puncak-tanadoang'), 'Migration seed is available through PostgREST')

  for (const [name, role, active] of [
    ['superAdmin', 'super_admin', true],
    ['admin', 'admin', true],
    ['editor', 'editor', true],
    ['visitor', 'visitor', true],
    ['inactive', 'editor', false],
  ]) {
    const email = `${name.toLowerCase()}-${marker}@example.com`
    const created = requireData(await service.auth.admin.createUser({ email, password, email_confirm: true }), `Create ${name}`)
    assert.ok(created.user?.id, `Auth did not return ${name}`)
    fixture.userIds.push(created.user.id)
    const profile = requireData(
      await service.from('profiles').select('role').eq('id', created.user.id).single(),
      `Read ${name} profile`,
    )
    assert.equal(profile.role, 'visitor', 'New Auth users receive a visitor profile')
    requireData(
      await service.from('profiles').update({ role, is_active: active }).eq('id', created.user.id).select('id').single(),
      `Set ${name} role`,
    )
    const userClient = client()
    const session = requireData(await userClient.auth.signInWithPassword({ email, password }), `Sign in ${name}`)
    assert.equal(session.user?.id, created.user.id)
    assert.ok(session.session?.access_token)
    sensitive.add(session.session.access_token)
    sensitive.add(session.session.refresh_token)
    users[name] = { id: created.user.id, email, client: userClient }
  }

  const editor = users.editor.client
  const admin = users.admin.client
  const superAdmin = users.superAdmin.client
  const visitor = users.visitor.client
  const inactive = users.inactive.client

  async function createDestination(suffix) {
    const row = requireData(await editor.from('destinations').insert({
      slug: `integration-${marker}-${suffix}`,
      name: `Destinasi uji ${suffix}`,
      category: 'Uji',
      publication_status: 'draft',
    }).select('id, updated_at').single(), `Create ${suffix} destination`)
    fixture.destinationIds.push(row.id)
    return row
  }
  const destination = await createDestination('public')
  const draft = await createDestination('draft')

  await t.test('Auth and destination CRUD respect application roles', async () => {
    const wrongPassword = await client().auth.signInWithPassword({ email: users.visitor.email, password: `${password}x` })
    assert.ok(wrongPassword.error, 'Wrong password must not create a session')

    requireInvisible(await anon.from('destinations').select('id').eq('id', destination.id), 'Anonymous draft read')
    requireDenied(await visitor.from('destinations').insert({
      slug: `integration-${marker}-visitor`,
      name: 'Destinasi uji visitor',
      category: 'Uji',
    }), 'Visitor destination insert')

    requireData(await editor.from('destinations').update({ publication_status: 'published' })
      .eq('id', destination.id).select('id').single(), 'Publish destination')
    const published = requireData(await anon.from('destinations').select('id').eq('id', destination.id), 'Read published destination')
    assert.equal(published.length, 1)

    const removable = await createDestination('delete')
    requireInvisible(await editor.from('destinations').delete().eq('id', removable.id).select('id'), 'Editor destination delete')
    const deleted = requireData(await admin.from('destinations').delete().eq('id', removable.id).select('id'), 'Admin destination delete')
    assert.equal(deleted.length, 1)

    requireInvisible(await visitor.from('profiles').update({ role: 'super_admin' })
      .eq('id', users.visitor.id).select('id'), 'Visitor role escalation')
    const unchanged = requireData(await service.from('profiles').select('role').eq('id', users.visitor.id).single(), 'Read visitor role')
    assert.equal(unchanged.role, 'visitor')
    requireData(await superAdmin.from('profiles').update({ is_active: false })
      .eq('id', users.visitor.id).select('id').single(), 'Super Admin deactivates visitor')
    requireData(await superAdmin.from('profiles').update({ is_active: true })
      .eq('id', users.visitor.id).select('id').single(), 'Super Admin reactivates visitor')
  })

  await t.test('Public RPCs validate submissions and RLS protects visitor data', async () => {
    const reservation = {
      p_destination_id: destination.id,
      p_visitor_name: 'Pengunjung Uji',
      p_email: null,
      p_whatsapp: '+62 812-3456-7890',
      p_visit_date: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10),
      p_participant_count: 2,
      p_visitor_notes: null,
      p_privacy_consent: true,
    }
    const withoutConsent = await anon.rpc('submit_public_reservation', { ...reservation, p_privacy_consent: false })
    assert.match(withoutConsent.error?.message || '', /Persetujuan/)
    const invalidPhone = await anon.rpc('submit_public_reservation', { ...reservation, p_whatsapp: '++++++++' })
    assert.match(invalidPhone.error?.message || '', /WhatsApp/)
    const draftReservation = await anon.rpc('submit_public_reservation', { ...reservation, p_destination_id: draft.id })
    assert.match(draftReservation.error?.message || '', /Destinasi tidak tersedia/)
    const booking = requireData(await anon.rpc('submit_public_reservation', reservation), 'Submit reservation')
    assert.match(booking[0].booking_code, /^BTM-\d{8}-[A-F0-9]{8}$/)
    const savedBooking = requireData(await service.from('reservations').select('id, status, privacy_consent_at')
      .eq('booking_code', booking[0].booking_code).single(), 'Read submitted reservation')
    assert.equal(savedBooking.status, 'pending')
    assert.ok(savedBooking.privacy_consent_at)

    requireDenied(await anon.from('reservations').insert({
      destination_id: destination.id,
      visitor_name: 'Pengunjung Uji',
      whatsapp: '081234567890',
      visit_date: reservation.p_visit_date,
      participant_count: 2,
    }), 'Direct anonymous reservation insert')

    const message = {
      p_visitor_name: 'Pengunjung Uji',
      p_email: null,
      p_phone: null,
      p_subject: fixture.subject,
      p_message: 'Pesan integrasi sementara.',
      p_privacy_consent: true,
    }
    const noContactConsent = await anon.rpc('submit_public_contact_message', { ...message, p_privacy_consent: false })
    assert.match(noContactConsent.error?.message || '', /Persetujuan/)
    assert.equal(requireData(await anon.rpc('submit_public_contact_message', message), 'Submit contact message'), true)
    const savedMessage = requireData(await service.from('contact_messages').select('id, status, privacy_consent_at')
      .eq('subject', fixture.subject).single(), 'Read submitted message')
    assert.equal(savedMessage.status, 'new')
    assert.ok(savedMessage.privacy_consent_at)

    for (const [name, userClient] of [['anonymous', anon], ['visitor', visitor], ['inactive', inactive]]) {
      requireInvisible(await userClient.from('reservations').select('id').eq('id', savedBooking.id), `${name} reservation read`)
      requireInvisible(await userClient.from('contact_messages').select('id').eq('id', savedMessage.id), `${name} contact read`)
    }
    for (const [name, userClient] of [['superAdmin', superAdmin], ['admin', admin], ['editor', editor]]) {
      assert.equal(requireData(await userClient.from('reservations').select('id').eq('id', savedBooking.id), `${name} reservation read`).length, 1)
      assert.equal(requireData(await userClient.from('contact_messages').select('id').eq('id', savedMessage.id), `${name} contact read`).length, 1)
    }

    requireDenied(await editor.from('reservations').update({ visitor_name: 'Diubah' }).eq('id', savedBooking.id), 'Editor visitor detail update')
    const wrongActor = await editor.from('reservations').update({
      status: 'confirmed', processed_by: users.admin.id, processed_at: new Date().toISOString(),
    }).eq('id', savedBooking.id)
    assert.match(wrongActor.error?.message || '', /Identitas/)
    const confirmed = requireData(await editor.from('reservations').update({
      status: 'confirmed', processed_by: users.editor.id, processed_at: new Date().toISOString(),
    }).eq('id', savedBooking.id).select('status, updated_at').single(), 'Confirm reservation')
    assert.equal(confirmed.status, 'confirmed')
    await new Promise((resolve) => setTimeout(resolve, 10))
    requireData(await editor.from('reservations').update({ admin_notes: 'Catatan terbaru' })
      .eq('id', savedBooking.id).select('id').single(), 'Update reservation notes')
    const stale = requireData(await editor.from('reservations').update({
      status: 'completed', processed_by: users.editor.id, processed_at: new Date().toISOString(),
    }).eq('id', savedBooking.id).eq('updated_at', confirmed.updated_at).select('id'), 'Reject stale reservation update')
    assert.equal(stale.length, 0)
    const currentBooking = requireData(await editor.from('reservations').select('status, admin_notes')
      .eq('id', savedBooking.id).single(), 'Read current reservation')
    assert.equal(currentBooking.status, 'confirmed')
    assert.equal(currentBooking.admin_notes, 'Catatan terbaru')

    const readMessage = requireData(await editor.from('contact_messages').update({
      status: 'read', processed_by: users.editor.id, processed_at: new Date().toISOString(),
    }).eq('id', savedMessage.id).select('status, updated_at').single(), 'Mark message read')
    assert.equal(readMessage.status, 'read')
    for (const status of ['archived', 'read']) {
      await new Promise((resolve) => setTimeout(resolve, 10))
      requireData(await editor.from('contact_messages').update({
        status, processed_by: users.editor.id, processed_at: new Date().toISOString(),
      }).eq('id', savedMessage.id).select('id').single(), `Set message ${status}`)
    }
    const staleMessage = requireData(await editor.from('contact_messages').update({
      status: 'replied', processed_by: users.editor.id, processed_at: new Date().toISOString(),
    }).eq('id', savedMessage.id).eq('status', 'read').eq('updated_at', readMessage.updated_at).select('id'), 'Reject stale message update')
    assert.equal(staleMessage.length, 0)
  })

  await t.test('GPS review and settings require the intended staff role', async () => {
    const coords = requireData(await editor.from('destinations').update({
      latitude: -6.13,
      longitude: 120.46,
      coordinate_method: 'device_gps',
      coordinate_source: 'Survei integrasi',
    }).eq('id', destination.id).select('verification_status, coordinate_updated_by, updated_at').single(), 'Save GPS')
    assert.equal(coords.verification_status, 'pending')
    assert.equal(coords.coordinate_updated_by, users.editor.id)
    requireDenied(await editor.from('destinations').update({
      verification_status: 'verified', verification_note: 'Verifikasi palsu',
    }).eq('id', destination.id), 'Editor GPS verification')
    const reviewed = requireData(await admin.from('destinations').update({
      verification_status: 'verified',
      verification_note: 'Tinjauan sementara',
      reviewed_by: users.editor.id,
      verified_by: users.editor.id,
    }).eq('id', destination.id).select('verification_status, reviewed_by, verified_by, updated_at').single(), 'Admin GPS verification')
    assert.equal(reviewed.verification_status, 'verified')
    assert.equal(reviewed.reviewed_by, users.admin.id)
    assert.equal(reviewed.verified_by, users.admin.id)

    await new Promise((resolve) => setTimeout(resolve, 10))
    const resubmitted = requireData(await editor.from('destinations').update({ latitude: -6.14 })
      .eq('id', destination.id).select('verification_status, verified_by, reviewed_by').single(), 'Resubmit coordinates')
    assert.equal(resubmitted.verification_status, 'pending')
    assert.equal(resubmitted.verified_by, null)
    assert.equal(resubmitted.reviewed_by, null)
    const stale = requireData(await admin.from('destinations').update({
      verification_status: 'verified', verification_note: 'Tinjauan kedaluwarsa',
    }).eq('id', destination.id).eq('updated_at', reviewed.updated_at).select('id'), 'Reject stale GPS review')
    assert.equal(stale.length, 0)

    requireData(await admin.from('site_settings').insert({ key: fixture.setting, value: 'sementara', is_public: false })
      .select('key').single(), 'Create temporary setting')
    requireInvisible(await editor.from('site_settings').update({ value: 'ditolak' })
      .eq('key', fixture.setting).select('key'), 'Editor setting update')
    requireData(await superAdmin.from('site_settings').delete().eq('key', fixture.setting)
      .select('key').single(), 'Delete temporary setting')
  })

  await t.test('Private Storage exposes only published media and supports cover and deletion', async () => {
    const bucketData = requireData(await service.storage.getBucket(bucket), 'Read media bucket')
    assert.equal(bucketData.public, false)
    assert.equal(bucketData.file_size_limit, 8 * 1024 * 1024)
    const publicPath = `${destination.id}/${marker}-public.png`
    const secondPath = `${destination.id}/${marker}-second.png`
    const privatePath = `${destination.id}/${marker}-private.png`
    const draftPath = `${draft.id}/${marker}-draft.png`
    const forbiddenPath = `${destination.id}/${marker}-forbidden.png`
    fixture.paths.push(publicPath, secondPath, privatePath, draftPath, forbiddenPath)
    const forbidden = await anon.storage.from(bucket).upload(forbiddenPath, png, { contentType: 'image/png' })
    assert.ok(forbidden.error, 'Anonymous upload must be denied')

    const media = []
    for (const [path, destinationId, published] of [
      [publicPath, destination.id, true],
      [secondPath, destination.id, true],
      [privatePath, destination.id, false],
      [draftPath, draft.id, true],
    ]) {
      requireData(await editor.storage.from(bucket).upload(path, png, { contentType: 'image/png' }), 'Upload image')
      media.push(requireData(await editor.from('destination_media').insert({
        destination_id: destinationId,
        storage_path: path,
        alt_text: 'Gambar uji',
        is_published: published,
        uploaded_by: users.editor.id,
        file_size_bytes: png.length,
        mime_type: 'image/png',
      }).select('id').single(), 'Create image metadata'))
    }

    for (const path of [privatePath, draftPath]) {
      const signed = await anon.storage.from(bucket).createSignedUrl(path, 600)
      assert.match(signed.error?.message || '', /not found|row.level security|permission/i)
    }
    const signed = requireData(await anon.storage.from(bucket).createSignedUrl(publicPath, 600), 'Sign published image')
    const signedResponse = await localFetch(signed.signedUrl)
    assert.equal(signedResponse.status, 200)
    assert.deepEqual(Buffer.from(await signedResponse.arrayBuffer()), png)
    const publicUrl = anon.storage.from(bucket).getPublicUrl(publicPath).data.publicUrl
    const publicResponse = await localFetch(publicUrl, { headers: { apikey: config.anonKey } })
    assert.notEqual(publicResponse.status, 200, 'A private bucket must not expose a public object URL')

    requireData(await editor.rpc('set_destination_media_cover', { p_media_id: media[0].id }), 'Set first cover')
    requireData(await editor.rpc('set_destination_media_cover', { p_media_id: media[1].id }), 'Set second cover')
    const covers = requireData(await editor.from('destination_media').select('id')
      .eq('destination_id', destination.id).eq('is_cover', true), 'Read covers')
    assert.deepEqual(covers.map((row) => row.id), [media[1].id])

    requireData(await editor.from('destination_media').update({ is_published: false })
      .eq('id', media[0].id).select('id').single(), 'Unpublish image')
    const noNewLink = await anon.storage.from(bucket).createSignedUrl(publicPath, 600)
    assert.ok(noNewLink.error, 'Unpublished media must not receive new signed URLs')
    assert.equal((await localFetch(signed.signedUrl)).status, 200, 'Previously signed URLs remain valid until expiry')
    requireData(await editor.storage.from(bucket).remove([privatePath]), 'Delete private image')
    assert.ok((await editor.storage.from(bucket).download(privatePath)).error, 'Deleted image must not be readable')
  })

  await t.test('Logout ends the authenticated session', async () => {
    requireData(await visitor.auth.signOut(), 'Sign out visitor')
    const { data } = await visitor.auth.getSession()
    assert.equal(data.session, null)
  })
})
