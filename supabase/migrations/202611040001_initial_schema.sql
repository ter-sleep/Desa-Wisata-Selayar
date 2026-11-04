-- DEWIS · Tahap 2
-- Database awal, role pengguna, RLS, dan bucket foto destinasi.
-- Jalankan melalui Supabase Dashboard > SQL Editor atau Supabase CLI.

begin;

-- -----------------------------------------------------------------------------
-- 1. Role aplikasi
-- -----------------------------------------------------------------------------
do $$
begin
  create type public.app_role as enum ('super_admin', 'admin', 'editor', 'visitor');
exception
  when duplicate_object then null;
end
$$;

-- -----------------------------------------------------------------------------
-- 2. Profil pengguna (identitas autentikasi tetap dikelola auth.users)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  avatar_url text,
  role public.app_role not null default 'visitor',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Profil aplikasi yang terhubung satu-ke-satu dengan auth.users.';
comment on column public.profiles.role is 'Hak akses aplikasi; profil baru selalu visitor sampai dipromosikan Super Admin.';

-- Fungsi ini SECURITY DEFINER agar policy dapat membaca role tanpa rekursi RLS.
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles as p
  where p.id = (select auth.uid())
    and p.is_active = true
  limit 1;
$$;

revoke all on function public.current_app_role() from public;
grant execute on function public.current_app_role() to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    'visitor'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

 drop trigger if exists on_auth_user_created_dewis on auth.users;
create trigger on_auth_user_created_dewis
after insert on auth.users
for each row execute procedure public.handle_new_auth_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. Master destinasi
-- -----------------------------------------------------------------------------
create table if not exists public.destinations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 2 and 160),
  category text not null,
  eyebrow text,
  description text not null default '',
  image_url text,
  status text not null default 'Informasi perlu dikonfirmasi',
  details text[] not null default '{}',
  data_source text,
  data_status text not null default 'Perlu verifikasi',
  updated_year integer,
  latitude numeric(10, 7),
  longitude numeric(10, 7),
  gps_accuracy_m numeric(8, 2),
  coordinate_source text,
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  verified_at timestamptz,
  verified_by uuid references public.profiles (id) on delete set null,
  publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'archived')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint destinations_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint destinations_longitude_range check (longitude is null or longitude between -180 and 180),
  constraint destinations_coordinate_pair check ((latitude is null) = (longitude is null)),
  constraint destinations_verified_coordinates check (
    verification_status <> 'verified' or (latitude is not null and longitude is not null)
  )
);

create index if not exists destinations_publication_category_idx
  on public.destinations (publication_status, category);
create index if not exists destinations_verification_idx
  on public.destinations (verification_status);

drop trigger if exists destinations_set_updated_at on public.destinations;
create trigger destinations_set_updated_at
before update on public.destinations
for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. Media/foto destinasi
-- -----------------------------------------------------------------------------
create table if not exists public.destination_media (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid not null references public.destinations (id) on delete cascade,
  storage_path text not null unique,
  caption text,
  alt_text text not null default '',
  credit text,
  is_cover boolean not null default false,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists destination_media_destination_sort_idx
  on public.destination_media (destination_id, sort_order);
create unique index if not exists destination_media_one_cover_per_destination_idx
  on public.destination_media (destination_id) where is_cover = true;

drop trigger if exists destination_media_set_updated_at on public.destination_media;
create trigger destination_media_set_updated_at
before update on public.destination_media
for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. Reservasi kunjungan
-- -----------------------------------------------------------------------------
create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  booking_code text not null unique default (
    'BTM-' || to_char(timezone('utc', now()), 'YYYYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
  ),
  destination_id uuid not null references public.destinations (id) on delete restrict,
  visitor_name text not null check (length(trim(visitor_name)) between 2 and 120),
  email text,
  whatsapp text not null check (length(regexp_replace(whatsapp, '[^0-9+]', '', 'g')) between 8 and 20),
  visit_date date not null,
  participant_count integer not null check (participant_count between 1 and 500),
  visitor_notes text,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'rejected', 'cancelled', 'completed')),
  admin_notes text,
  processed_by uuid references public.profiles (id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reservations_destination_date_idx
  on public.reservations (destination_id, visit_date);
create index if not exists reservations_status_created_idx
  on public.reservations (status, created_at desc);

drop trigger if exists reservations_set_updated_at on public.reservations;
create trigger reservations_set_updated_at
before update on public.reservations
for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 6. Pesan dari formulir pengunjung
-- -----------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  visitor_name text not null check (length(trim(visitor_name)) between 2 and 120),
  email text,
  phone text,
  subject text,
  message text not null check (length(trim(message)) between 5 and 5000),
  status text not null default 'new'
    check (status in ('new', 'read', 'replied', 'archived')),
  processed_by uuid references public.profiles (id) on delete set null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contact_messages_status_created_idx
  on public.contact_messages (status, created_at desc);

drop trigger if exists contact_messages_set_updated_at on public.contact_messages;
create trigger contact_messages_set_updated_at
before update on public.contact_messages
for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 7. Konfigurasi website
-- -----------------------------------------------------------------------------
create table if not exists public.site_settings (
  key text primary key check (length(trim(key)) between 2 and 100),
  value jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (key, value, is_public)
values
  ('site_name', to_jsonb('Desa Wisata Bontomarannu'::text), true),
  ('whatsapp_number', to_jsonb(''::text), true),
  ('public_address', to_jsonb(''::text), true)
on conflict (key) do nothing;

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
before update on public.site_settings
for each row execute procedure public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 8. Audit log
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_table text,
  entity_id uuid,
  summary text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_created_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_user_created_idx on public.audit_logs (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 9. Row Level Security
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.destinations enable row level security;
alter table public.destination_media enable row level security;
alter table public.reservations enable row level security;
alter table public.contact_messages enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_logs enable row level security;

-- Profil: pengguna dapat membaca profilnya sendiri; admin dapat melihat daftar profil.
create policy "profiles_select_self_or_admin"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or public.current_app_role() in ('super_admin', 'admin')
);

-- Perubahan role/status hanya boleh dilakukan Super Admin.
create policy "profiles_update_super_admin"
on public.profiles for update to authenticated
using (public.current_app_role() = 'super_admin')
with check (public.current_app_role() = 'super_admin');

-- Destinasi: publik hanya membaca yang sudah dipublikasikan.
create policy "destinations_public_read_published"
on public.destinations for select to anon, authenticated
using (
  publication_status = 'published'
  or public.current_app_role() in ('super_admin', 'admin', 'editor')
);

create policy "destinations_staff_insert"
on public.destinations for insert to authenticated
with check (public.current_app_role() in ('super_admin', 'admin', 'editor'));

create policy "destinations_staff_update"
on public.destinations for update to authenticated
using (public.current_app_role() in ('super_admin', 'admin', 'editor'))
with check (public.current_app_role() in ('super_admin', 'admin', 'editor'));

create policy "destinations_admin_delete"
on public.destinations for delete to authenticated
using (public.current_app_role() in ('super_admin', 'admin'));

-- Media: publik hanya membaca media terbit dari destinasi yang terbit.
create policy "destination_media_public_read_published"
on public.destination_media for select to anon, authenticated
using (
  (
    is_published = true
    and exists (
      select 1 from public.destinations d
      where d.id = destination_media.destination_id
        and d.publication_status = 'published'
    )
  )
  or public.current_app_role() in ('super_admin', 'admin', 'editor')
);

create policy "destination_media_staff_insert"
on public.destination_media for insert to authenticated
with check (public.current_app_role() in ('super_admin', 'admin', 'editor'));

create policy "destination_media_staff_update"
on public.destination_media for update to authenticated
using (public.current_app_role() in ('super_admin', 'admin', 'editor'))
with check (public.current_app_role() in ('super_admin', 'admin', 'editor'));

create policy "destination_media_staff_delete"
on public.destination_media for delete to authenticated
using (public.current_app_role() in ('super_admin', 'admin', 'editor'));

-- Reservasi: publik boleh membuat permintaan baru saja; status awal wajib pending.
create policy "reservations_public_create_pending"
on public.reservations for insert to anon, authenticated
with check (
  status = 'pending'
  and processed_by is null
  and processed_at is null
  and exists (
    select 1 from public.destinations d
    where d.id = reservations.destination_id
      and d.publication_status = 'published'
  )
);

create policy "reservations_staff_read"
on public.reservations for select to authenticated
using (public.current_app_role() in ('super_admin', 'admin', 'editor'));

create policy "reservations_staff_update"
on public.reservations for update to authenticated
using (public.current_app_role() in ('super_admin', 'admin', 'editor'))
with check (public.current_app_role() in ('super_admin', 'admin', 'editor'));

-- Pesan: publik hanya boleh memasukkan pesan baru, tidak dapat membacanya kembali.
create policy "contact_messages_public_create_new"
on public.contact_messages for insert to anon, authenticated
with check (status = 'new' and processed_by is null and processed_at is null);

create policy "contact_messages_staff_read"
on public.contact_messages for select to authenticated
using (public.current_app_role() in ('super_admin', 'admin', 'editor'));

create policy "contact_messages_staff_update"
on public.contact_messages for update to authenticated
using (public.current_app_role() in ('super_admin', 'admin', 'editor'))
with check (public.current_app_role() in ('super_admin', 'admin', 'editor'));

-- Pengaturan: nilai bertanda is_public dapat dibaca pengunjung.
create policy "site_settings_public_read"
on public.site_settings for select to anon, authenticated
using (is_public = true or public.current_app_role() in ('super_admin', 'admin'));

create policy "site_settings_admin_insert"
on public.site_settings for insert to authenticated
with check (public.current_app_role() in ('super_admin', 'admin'));

create policy "site_settings_admin_update"
on public.site_settings for update to authenticated
using (public.current_app_role() in ('super_admin', 'admin'))
with check (public.current_app_role() in ('super_admin', 'admin'));

create policy "site_settings_super_admin_delete"
on public.site_settings for delete to authenticated
using (public.current_app_role() = 'super_admin');

-- Audit log bersifat append-only untuk staff; tidak ada policy update/delete.
create policy "audit_logs_admin_read"
on public.audit_logs for select to authenticated
using (public.current_app_role() in ('super_admin', 'admin'));

create policy "audit_logs_staff_insert_self"
on public.audit_logs for insert to authenticated
with check (
  user_id = (select auth.uid())
  and public.current_app_role() in ('super_admin', 'admin', 'editor')
);

-- -----------------------------------------------------------------------------
-- 10. Hak akses SQL (tetap dibatasi oleh RLS)
-- -----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;

grant select on public.destinations, public.destination_media, public.site_settings to anon, authenticated;
grant insert, update, delete on public.destinations, public.destination_media to authenticated;
revoke insert on public.reservations, public.contact_messages from anon, authenticated;
grant insert (destination_id, visitor_name, email, whatsapp, visit_date, participant_count, visitor_notes)
  on public.reservations to anon, authenticated;
grant insert (visitor_name, email, phone, subject, message)
  on public.contact_messages to anon, authenticated;
grant select, update on public.reservations, public.contact_messages to authenticated;
grant select, update on public.profiles to authenticated;
grant insert, select, update, delete on public.site_settings to authenticated;
grant select, insert on public.audit_logs to authenticated;

-- -----------------------------------------------------------------------------
-- 11. Storage bucket foto destinasi (public read, authenticated staff write)
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'destination-media',
  'destination-media',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "destination_media_bucket_public_read"
on storage.objects for select to anon, authenticated
using (bucket_id = 'destination-media');

create policy "destination_media_bucket_staff_upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'destination-media'
  and public.current_app_role() in ('super_admin', 'admin', 'editor')
);

create policy "destination_media_bucket_staff_update"
on storage.objects for update to authenticated
using (
  bucket_id = 'destination-media'
  and public.current_app_role() in ('super_admin', 'admin', 'editor')
)
with check (
  bucket_id = 'destination-media'
  and public.current_app_role() in ('super_admin', 'admin', 'editor')
);

create policy "destination_media_bucket_staff_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'destination-media'
  and public.current_app_role() in ('super_admin', 'admin', 'editor')
);

commit;
