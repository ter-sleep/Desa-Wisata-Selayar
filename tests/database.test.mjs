import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import test from 'node:test'
import { PGlite } from '@electric-sql/pglite'

const migrationDir = new URL('../supabase/migrations/', import.meta.url)
const migrationNames = (await readdir(migrationDir)).filter((name) => name.endsWith('.sql')).sort()
const migrations = await Promise.all(migrationNames.map(async (name) => ({
  name,
  sql: await readFile(new URL(name, migrationDir), 'utf8'),
})))

const users = {
  superAdmin: '11111111-1111-4111-8111-111111111111',
  admin: '22222222-2222-4222-8222-222222222222',
  editor: '33333333-3333-4333-8333-333333333333',
  visitor: '44444444-4444-4444-8444-444444444444',
  inactive: '55555555-5555-4555-8555-555555555555',
}

async function bootstrap(db) {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb not null default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    create schema storage;
    create table storage.buckets (
      id text primary key, name text not null, public boolean not null,
      file_size_limit bigint, allowed_mime_types text[]
    );
    create table storage.objects (
      id uuid primary key default gen_random_uuid(), bucket_id text not null, name text not null
    );
    create function storage.foldername(text) returns text[] language sql immutable as $$
      select string_to_array($1, '/')
    $$;
    alter table storage.objects enable row level security;
    grant usage on schema storage to anon, authenticated;
    grant select, insert, update, delete on storage.objects to anon, authenticated;
    grant execute on function storage.foldername(text) to anon, authenticated;
  `)
}

async function applyMigrations(db, from = 0, to = migrations.length) {
  for (const migration of migrations.slice(from, to)) {
    try {
      await db.exec(migration.sql)
    } catch (error) {
      throw new Error(`Migration ${migration.name} failed: ${error.message}`, { cause: error })
    }
  }
}

async function createUsers(db) {
  for (const id of Object.values(users)) {
    await db.query('insert into auth.users (id) values ($1)', [id])
  }
  for (const [name, role] of [['superAdmin', 'super_admin'], ['admin', 'admin'], ['editor', 'editor']]) {
    await db.query('update public.profiles set role = $1 where id = $2', [role, users[name]])
  }
  await db.query("update public.profiles set role = 'editor', is_active = false where id = $1", [users.inactive])
}

async function asRole(db, role, userId, work) {
  await db.exec(`set role ${role}`)
  try {
    await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId || ''])
    return await work()
  } finally {
    await db.exec('reset role')
    await db.query("select set_config('request.jwt.claim.sub', '', false)")
  }
}

test('migrations preserve rows and enforce application and Storage access', async (t) => {
  const db = new PGlite()
  t.after(() => db.close())
  await bootstrap(db)
  await applyMigrations(db)
  await createUsers(db)

  const { rows: seeded } = await db.query("select id from public.destinations where publication_status = 'published' order by slug limit 1")
  assert.equal(seeded.length, 1)
  const destinationId = seeded[0].id
  const draftId = await asRole(db, 'authenticated', users.admin, async () => {
    const result = await db.query(`
      insert into public.destinations (slug, name, category, publication_status)
      values ('destinasi-uji-draft', 'Destinasi uji', 'Uji', 'draft') returning id
    `)
    return result.rows[0].id
  })
  let bookingId
  let contactId

  await t.test('all application tables use RLS and migrations avoid destructive data statements', async () => {
    const { rows } = await db.query(`
      select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relrowsecurity and relname in
        ('profiles', 'destinations', 'destination_media', 'reservations', 'contact_messages', 'site_settings', 'audit_logs')
      order by relname
    `)
    assert.equal(rows.length, 7)
    for (const migration of migrations) {
      const withoutComments = migration.sql.replace(/--.*$/gm, '')
      assert.doesNotMatch(withoutComments, /\b(?:truncate|drop\s+table|delete\s+from)\b/i, migration.name)
    }
    const { rows: buckets } = await db.query("select public, file_size_limit from storage.buckets where id = 'destination-media'")
    assert.equal(buckets[0].public, false)
    assert.equal(Number(buckets[0].file_size_limit), 8 * 1024 * 1024)
  })

  await t.test('anonymous submissions require consent and a valid phone, but cannot read visitor records', async () => {
    await asRole(db, 'anon', null, async () => {
      await assert.rejects(() => db.query('select * from public.reservations'), /permission denied/i)
      await assert.rejects(() => db.query('select * from public.contact_messages'), /permission denied/i)
      assert.equal((await db.query('select id from public.destinations where id = $1', [draftId])).rows.length, 0)
      await assert.rejects(() => db.query(`
        insert into public.reservations (destination_id, visitor_name, whatsapp, visit_date, participant_count)
        values ($1, 'Pengunjung Uji', '081234567890', current_date + 1, 2)
      `, [destinationId]), /permission denied/i)
      const submit = `
        select * from public.submit_public_reservation(
          $1, 'Pengunjung Uji', null, $2,
          (now() at time zone 'Asia/Makassar')::date + 1, 2, null, $3
        )
      `
      await assert.rejects(() => db.query(submit, [destinationId, '081234567890', false]), /Persetujuan/i)
      await assert.rejects(() => db.query(submit, [destinationId, '++++++++', true]), /WhatsApp/i)
      await assert.rejects(() => db.query(submit, [draftId, '081234567890', true]), /Destinasi tidak tersedia/i)
      const result = await db.query(submit, [destinationId, '+62 812-3456-7890', true])
      assert.match(result.rows[0].booking_code, /^BTM-\d{8}-[A-F0-9]{8}$/)
      await assert.rejects(() => db.query(`
        select public.submit_public_contact_message('Pengunjung Uji', null, null, null, 'Pesan uji', false)
      `), /Persetujuan/i)
      const contact = await db.query(`
        select public.submit_public_contact_message('Pengunjung Uji', null, null, null, 'Pesan uji', true) as saved
      `)
      assert.equal(contact.rows[0].saved, true)
      await assert.rejects(() => db.query('select public.set_destination_media_cover($1)', [destinationId]), /permission denied/i)
    })
    const { rows } = await db.query('select id, privacy_consent_at from public.reservations')
    assert.equal(rows.length, 1)
    assert.ok(rows[0].privacy_consent_at)
    bookingId = rows[0].id
    contactId = (await db.query('select id from public.contact_messages')).rows[0].id
  })

  await t.test('visitors and inactive staff cannot read private records or promote themselves', async () => {
    for (const user of [users.visitor, users.inactive]) {
      await asRole(db, 'authenticated', user, async () => {
        assert.equal((await db.query('select * from public.reservations')).rows.length, 0)
        assert.equal((await db.query('select * from public.contact_messages')).rows.length, 0)
        const updated = await db.query("update public.profiles set role = 'super_admin' where id = $1 returning id", [user])
        assert.equal(updated.rows.length, 0)
      })
    }
    for (const user of [users.superAdmin, users.admin, users.editor]) {
      await asRole(db, 'authenticated', user, async () => {
        assert.equal((await db.query('select id from public.reservations')).rows.length, 1)
        assert.equal((await db.query('select id from public.contact_messages')).rows.length, 1)
      })
    }
  })

  await t.test('Editor cannot change settings or delete destinations; Admin can change settings', async () => {
    await asRole(db, 'authenticated', users.editor, async () => {
      const settings = await db.query("update public.site_settings set value = '\"test\"'::jsonb where key = 'public_address' returning key")
      assert.equal(settings.rows.length, 0)
      const deleted = await db.query('delete from public.destinations where id = $1 returning id', [destinationId])
      assert.equal(deleted.rows.length, 0)
    })
    await asRole(db, 'authenticated', users.admin, async () => {
      const settings = await db.query("update public.site_settings set value = '\"test\"'::jsonb where key = 'public_address' returning key")
      assert.equal(settings.rows.length, 1)
      await assert.rejects(() => db.query('delete from public.destinations where id = $1', [destinationId]), /foreign key/i)
    })
  })

  await t.test('status transitions enforce actor identity and protect visitor details', async () => {
    await asRole(db, 'authenticated', users.editor, async () => {
      await assert.rejects(() => db.query(`
        update public.reservations set status = 'confirmed', processed_by = $1, processed_at = now() where id = $2
      `, [users.admin, bookingId]), /Identitas/i)
      const confirmed = await db.query(`
        update public.reservations set status = 'confirmed', processed_by = $1, processed_at = now()
        where id = $2 returning status
      `, [users.editor, bookingId])
      assert.equal(confirmed.rows[0].status, 'confirmed')
      await assert.rejects(() => db.query(`
        update public.reservations set status = 'rejected', processed_by = $1, processed_at = now() where id = $2
      `, [users.editor, bookingId]), /Transisi/i)
      await assert.rejects(() => db.query("update public.reservations set visitor_name = 'Changed' where id = $1", [bookingId]), /permission denied/i)
      await assert.rejects(() => db.query(`
        update public.contact_messages set status = 'replied', processed_by = $1, processed_at = now() where id = $2
      `, [users.editor, contactId]), /Transisi/i)
      const read = await db.query(`
        update public.contact_messages set status = 'read', processed_by = $1, processed_at = now()
        where id = $2 returning status
      `, [users.editor, contactId])
      assert.equal(read.rows[0].status, 'read')
    })
  })

  await t.test('GPS review is attributed to the actual Admin and Editor may safely resubmit', async () => {
    await asRole(db, 'authenticated', users.admin, async () => {
      await db.query(`
        update public.destinations set latitude = 1, longitude = 2,
          coordinate_source = 'Sumber uji', coordinate_method = 'external_reference' where id = $1
      `, [destinationId])
      const reviewed = await db.query(`
        update public.destinations set verification_status = 'verified', verification_note = 'Catatan uji',
          reviewed_by = $1, verified_by = $1 where id = $2
        returning reviewed_by, verified_by, verification_status
      `, [users.editor, destinationId])
      assert.equal(reviewed.rows[0].reviewed_by, users.admin)
      assert.equal(reviewed.rows[0].verified_by, users.admin)
      assert.equal(reviewed.rows[0].verification_status, 'verified')
    })
    await asRole(db, 'authenticated', users.editor, async () => {
      const edited = await db.query(`
        update public.destinations set description = description || ' (uji)' where id = $1 returning verification_status
      `, [destinationId])
      assert.equal(edited.rows[0].verification_status, 'verified')
      await assert.rejects(() => db.query(`
        update public.destinations set verification_status = 'rejected', verification_note = 'Palsu uji' where id = $1
      `, [destinationId]), /Admin|Editor/i)
      const proposed = await db.query(`
        update public.destinations set verification_status = 'pending', coordinate_updated_by = $1 where id = $2
        returning verification_status, verified_by, reviewed_by, coordinate_updated_by
      `, [users.editor, destinationId])
      assert.equal(proposed.rows[0].verification_status, 'pending')
      assert.equal(proposed.rows[0].verified_by, null)
      assert.equal(proposed.rows[0].reviewed_by, null)
      assert.equal(proposed.rows[0].coordinate_updated_by, users.editor)
      await assert.rejects(() => db.query(`
        insert into public.destinations (slug, name, category, latitude, longitude, verification_status)
        values ('uji-palsu', 'Destinasi uji', 'Uji', 1, 2, 'verified')
      `), /Editor|Admin/i)
    })
  })

  await t.test('stale GPS and visitor forms do not overwrite newer changes', async () => {
    const revision = async (table, id) => {
      const { rows } = await db.query(`select updated_at::text as version from public.${table} where id = $1`, [id])
      return rows[0].version
    }
    const advanceClock = () => new Promise((resolve) => setTimeout(resolve, 10))

    const gpsVersion = await revision('destinations', destinationId)
    await advanceClock()
    await asRole(db, 'authenticated', users.editor, async () => {
      await db.query('update public.destinations set latitude = 3 where id = $1', [destinationId])
    })
    await asRole(db, 'authenticated', users.admin, async () => {
      const stale = await db.query(`
        update public.destinations set verification_status = 'verified', verification_note = 'Catatan lama'
        where id = $1 and updated_at = $2::timestamptz returning id
      `, [destinationId, gpsVersion])
      assert.equal(stale.rows.length, 0)
      const current = await db.query('select latitude, verification_status from public.destinations where id = $1', [destinationId])
      assert.equal(Number(current.rows[0].latitude), 3)
      assert.equal(current.rows[0].verification_status, 'pending')
      const freshVersion = await revision('destinations', destinationId)
      const fresh = await db.query(`
        update public.destinations set verification_status = 'verified', verification_note = 'Catatan terbaru'
        where id = $1 and updated_at = $2::timestamptz returning reviewed_by
      `, [destinationId, freshVersion])
      assert.equal(fresh.rows[0].reviewed_by, users.admin)
    })

    const reservationVersion = await revision('reservations', bookingId)
    await advanceClock()
    await asRole(db, 'authenticated', users.editor, async () => {
      await db.query("update public.reservations set admin_notes = 'Catatan terbaru' where id = $1", [bookingId])
      const stale = await db.query(`
        update public.reservations set status = 'completed', admin_notes = 'Catatan lama',
          processed_by = $1, processed_at = now()
        where id = $2 and status = 'confirmed' and updated_at = $3::timestamptz returning id
      `, [users.editor, bookingId, reservationVersion])
      assert.equal(stale.rows.length, 0)
      const current = await db.query('select status, admin_notes from public.reservations where id = $1', [bookingId])
      assert.equal(current.rows[0].status, 'confirmed')
      assert.equal(current.rows[0].admin_notes, 'Catatan terbaru')
    })

    const messageVersion = await revision('contact_messages', contactId)
    await advanceClock()
    await asRole(db, 'authenticated', users.editor, async () => {
      await db.query(`
        update public.contact_messages set status = 'archived', processed_by = $1, processed_at = now() where id = $2
      `, [users.editor, contactId])
      await advanceClock()
      await db.query(`
        update public.contact_messages set status = 'read', processed_by = $1, processed_at = now() where id = $2
      `, [users.editor, contactId])
      const stale = await db.query(`
        update public.contact_messages set status = 'replied', processed_by = $1, processed_at = now()
        where id = $2 and status = 'read' and updated_at = $3::timestamptz returning id
      `, [users.editor, contactId, messageVersion])
      assert.equal(stale.rows.length, 0)
      const current = await db.query('select status from public.contact_messages where id = $1', [contactId])
      assert.equal(current.rows[0].status, 'read')
    })
  })

  await t.test('Storage exposes only published media and keeps one published cover', async () => {
    const publicPath = `${destinationId}/public.jpg`
    const secondPath = `${destinationId}/second.jpg`
    const privatePath = `${destinationId}/private.jpg`
    const draftPath = `${draftId}/draft.jpg`
    const mediaIds = []
    await asRole(db, 'authenticated', users.editor, async () => {
      for (const [path, published] of [[publicPath, true], [secondPath, true], [privatePath, false]]) {
        await db.query("insert into storage.objects (bucket_id, name) values ('destination-media', $1)", [path])
        const inserted = await db.query(`
          insert into public.destination_media (destination_id, storage_path, is_published)
          values ($1, $2, $3) returning id
        `, [destinationId, path, published])
        mediaIds.push(inserted.rows[0].id)
      }
      await db.query('select public.set_destination_media_cover($1)', [mediaIds[0]])
      await db.query('select public.set_destination_media_cover($1)', [mediaIds[1]])
      const covers = await db.query('select id from public.destination_media where destination_id = $1 and is_cover', [destinationId])
      assert.deepEqual(covers.rows.map((row) => row.id), [mediaIds[1]])
      await db.query("insert into storage.objects (bucket_id, name) values ('destination-media', $1)", [draftPath])
      await db.query(`
        insert into public.destination_media (destination_id, storage_path, is_published)
        values ($1, $2, true)
      `, [draftId, draftPath])
    })
    await asRole(db, 'anon', null, async () => {
      const objects = await db.query("select name from storage.objects where bucket_id = 'destination-media' order by name")
      assert.deepEqual(objects.rows.map((row) => row.name), [publicPath, secondPath])
      const media = await db.query('select storage_path from public.destination_media order by storage_path')
      assert.deepEqual(media.rows.map((row) => row.storage_path), [publicPath, secondPath])
      await assert.rejects(() => db.query("insert into storage.objects (bucket_id, name) values ('destination-media', $1)", [`${destinationId}/anon.jpg`]), /row-level security|permission denied/i)
    })
  })
})

test('GPS migration retains legacy rows and backfills only known reviewer metadata', async (t) => {
  const db = new PGlite()
  t.after(() => db.close())
  await bootstrap(db)
  await applyMigrations(db, 0, 3)
  await createUsers(db)
  const { rows } = await db.query('select id from public.destinations order by slug limit 2')
  const known = rows[0].id
  const incomplete = rows[1].id
  await db.query(`
    update public.destinations set latitude = 1, longitude = 2, verification_status = 'verified',
      verified_at = now(), verified_by = $1 where id = $2
  `, [users.admin, known])
  await db.query(`
    update public.destinations set latitude = 3, longitude = 4, verification_status = 'verified' where id = $1
  `, [incomplete])

  await applyMigrations(db, 3)
  const upgraded = await db.query('select id, verification_status, reviewed_by from public.destinations where id in ($1, $2)', [known, incomplete])
  assert.equal(upgraded.rows.find((row) => row.id === known).reviewed_by, users.admin)
  assert.equal(upgraded.rows.find((row) => row.id === incomplete).verification_status, 'verified')
  assert.equal(upgraded.rows.find((row) => row.id === incomplete).reviewed_by, null)
  let constraint = await db.query("select convalidated from pg_constraint where conname = 'destinations_verification_review_check'")
  assert.equal(constraint.rows[0].convalidated, false)

  await asRole(db, 'authenticated', users.admin, async () => {
    await db.query("update public.destinations set verification_note = 'Ditinjau ulang' where id = $1", [incomplete])
  })
  await db.exec('alter table public.destinations validate constraint destinations_verification_review_check')
  constraint = await db.query("select convalidated from pg_constraint where conname = 'destinations_verification_review_check'")
  assert.equal(constraint.rows[0].convalidated, true)
})
