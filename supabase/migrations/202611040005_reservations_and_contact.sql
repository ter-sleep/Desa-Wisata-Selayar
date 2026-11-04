-- DEWIS Tahap 6: reservasi publik, persetujuan privasi, dan kontak pengunjung.
-- Jalankan setelah migration Tahap 2-5 pada proyek Supabase yang sama.

begin;

alter table public.reservations
  add column if not exists privacy_consent_at timestamptz;

alter table public.contact_messages
  add column if not exists privacy_consent_at timestamptz;

-- Kode booking memakai tanggal lokal destinasi (WITA / Asia Makassar).
alter table public.reservations alter column booking_code set default (
  'BTM-' || to_char(now() at time zone 'Asia/Makassar', 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
);

-- Semua reservasi publik harus melewati validasi fungsi di bawah; jangan izinkan insert tabel langsung.
revoke insert on public.reservations from anon, authenticated;
revoke insert (destination_id, visitor_name, email, whatsapp, visit_date, participant_count, visitor_notes)
  on public.reservations from anon, authenticated;

-- Pengiriman publik memakai RPC agar persetujuan privasi tidak dapat diisi dengan timestamp palsu.
revoke insert on public.contact_messages from anon, authenticated;
revoke insert (visitor_name, email, phone, subject, message)
  on public.contact_messages from anon, authenticated;
drop policy if exists "contact_messages_public_create_new" on public.contact_messages;

create index if not exists reservations_visit_status_idx
  on public.reservations (visit_date, status);

create index if not exists contact_messages_created_idx
  on public.contact_messages (created_at desc);

-- Fungsi ini menjadi satu-satunya jalur reservasi publik yang mengembalikan kode booking.
-- SECURITY DEFINER dipakai agar pengunjung tidak memerlukan hak SELECT atas data reservasi.
create or replace function public.submit_public_reservation(
  p_destination_id uuid,
  p_visitor_name text,
  p_email text,
  p_whatsapp text,
  p_visit_date date,
  p_participant_count integer,
  p_visitor_notes text,
  p_privacy_consent boolean
)
returns table (booking_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking_code text;
  v_name text := btrim(coalesce(p_visitor_name, ''));
  v_phone text := btrim(coalesce(p_whatsapp, ''));
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
  v_notes text := nullif(btrim(coalesce(p_visitor_notes, '')), '');
begin
  if p_privacy_consent is distinct from true then
    raise exception 'Persetujuan pemrosesan data wajib diberikan.' using errcode = '22023';
  end if;

  if p_destination_id is null then
    raise exception 'Destinasi wajib dipilih.' using errcode = '22023';
  end if;

  if length(v_name) < 2 or length(v_name) > 120 then
    raise exception 'Nama harus terdiri dari 2–120 karakter.' using errcode = '22023';
  end if;

  if length(regexp_replace(v_phone, '[^0-9+]', '', 'g')) not between 8 and 20 then
    raise exception 'Nomor WhatsApp tidak valid.' using errcode = '22023';
  end if;

  if v_email is not null and (length(v_email) > 254 or v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$') then
    raise exception 'Format email tidak valid.' using errcode = '22023';
  end if;

  if p_visit_date is null or p_visit_date < (now() at time zone 'Asia/Makassar')::date then
    raise exception 'Tanggal kunjungan tidak boleh berada di masa lalu.' using errcode = '22023';
  end if;

  if p_participant_count is null or p_participant_count not between 1 and 500 then
    raise exception 'Jumlah peserta harus antara 1 dan 500 orang.' using errcode = '22023';
  end if;

  if v_notes is not null and length(v_notes) > 1000 then
    raise exception 'Catatan maksimal 1.000 karakter.' using errcode = '22023';
  end if;

  perform 1
  from public.destinations d
  where d.id = p_destination_id
    and d.publication_status = 'published';

  if not found then
    raise exception 'Destinasi tidak tersedia untuk reservasi.' using errcode = '22023';
  end if;

  insert into public.reservations (
    destination_id,
    visitor_name,
    email,
    whatsapp,
    visit_date,
    participant_count,
    visitor_notes,
    status,
    privacy_consent_at
  ) values (
    p_destination_id,
    v_name,
    v_email,
    v_phone,
    p_visit_date,
    p_participant_count,
    v_notes,
    'pending',
    now()
  )
  returning reservations.booking_code into v_booking_code;

  return query select v_booking_code;
end;
$$;

revoke all on function public.submit_public_reservation(uuid, text, text, text, date, integer, text, boolean) from public;
grant execute on function public.submit_public_reservation(uuid, text, text, text, date, integer, text, boolean) to anon, authenticated;

-- Pesan kontak juga memakai RPC: tidak memberi pengunjung hak INSERT langsung atau SELECT.
create or replace function public.submit_public_contact_message(
  p_visitor_name text,
  p_email text,
  p_phone text,
  p_subject text,
  p_message text,
  p_privacy_consent boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text := btrim(coalesce(p_visitor_name, ''));
  v_email text := nullif(btrim(coalesce(p_email, '')), '');
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_subject text := nullif(btrim(coalesce(p_subject, '')), '');
  v_message text := btrim(coalesce(p_message, ''));
begin
  if p_privacy_consent is distinct from true then
    raise exception 'Persetujuan pemrosesan data wajib diberikan.' using errcode = '22023';
  end if;
  if length(v_name) not between 2 and 120 then
    raise exception 'Nama harus terdiri dari 2–120 karakter.' using errcode = '22023';
  end if;
  if v_email is not null and (length(v_email) > 254 or v_email !~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$') then
    raise exception 'Format email tidak valid.' using errcode = '22023';
  end if;
  if v_phone is not null and length(v_phone) > 30 then
    raise exception 'Nomor telepon maksimal 30 karakter.' using errcode = '22023';
  end if;
  if v_subject is not null and length(v_subject) > 160 then
    raise exception 'Subjek maksimal 160 karakter.' using errcode = '22023';
  end if;
  if length(v_message) not between 5 and 5000 then
    raise exception 'Pesan harus terdiri dari 5–5.000 karakter.' using errcode = '22023';
  end if;

  insert into public.contact_messages (visitor_name, email, phone, subject, message, status, privacy_consent_at)
  values (v_name, v_email, v_phone, v_subject, v_message, 'new', now());
  return true;
end;
$$;

revoke all on function public.submit_public_contact_message(text, text, text, text, text, boolean) from public;
grant execute on function public.submit_public_contact_message(text, text, text, text, text, boolean) to anon, authenticated;


-- Batasi hak UPDATE staf hanya pada kolom pemrosesan; identitas dan rincian pengunjung tidak dapat diubah.
revoke update on public.reservations, public.contact_messages from authenticated;
grant update (status, admin_notes, processed_by, processed_at)
  on public.reservations to authenticated;
grant update (status, processed_by, processed_at)
  on public.contact_messages to authenticated;

-- Validasi transisi status di database, bukan hanya di antarmuka Server Actions.
create or replace function public.enforce_reservation_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if not (
      (old.status = 'pending' and new.status in ('confirmed', 'rejected', 'cancelled'))
      or (old.status = 'confirmed' and new.status in ('cancelled', 'completed'))
    ) then
      raise exception 'Transisi status reservasi tidak diizinkan.' using errcode = '23514';
    end if;
    if new.processed_by is distinct from auth.uid() or new.processed_at is null then
      raise exception 'Identitas dan waktu pemrosesan wajib dicatat.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_validate_status_transition on public.reservations;
create trigger reservations_validate_status_transition
before update on public.reservations
for each row execute procedure public.enforce_reservation_status_transition();

create or replace function public.enforce_contact_status_transition()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if not (
      (old.status = 'new' and new.status in ('read', 'archived'))
      or (old.status = 'read' and new.status in ('replied', 'archived'))
      or (old.status = 'replied' and new.status = 'archived')
      or (old.status = 'archived' and new.status = 'read')
    ) then
      raise exception 'Transisi status pesan tidak diizinkan.' using errcode = '23514';
    end if;
    if new.processed_by is distinct from auth.uid() or new.processed_at is null then
      raise exception 'Identitas dan waktu pemrosesan wajib dicatat.' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists contact_messages_validate_status_transition on public.contact_messages;
create trigger contact_messages_validate_status_transition
before update on public.contact_messages
for each row execute procedure public.enforce_contact_status_transition();

-- Policies RLS Tahap 2 tetap menjadi kontrol baris utama untuk membaca dan memproses data staf.

commit;
