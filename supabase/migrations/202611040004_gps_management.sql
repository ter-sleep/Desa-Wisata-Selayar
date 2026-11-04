-- DEWIS · Tahap 5
-- Manajemen koordinat GPS, jejak sumber, dan verifikasi oleh admin.
-- Jalankan setelah migration 001–003.

begin;

alter table public.destinations
  add column if not exists coordinate_method text,
  add column if not exists coordinate_captured_at timestamptz,
  add column if not exists coordinate_updated_by uuid references public.profiles(id) on delete set null,
  add column if not exists verification_note text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

alter table public.destinations
  drop constraint if exists destinations_coordinate_method_check;
alter table public.destinations
  add constraint destinations_coordinate_method_check
  check (coordinate_method is null or coordinate_method in ('device_gps', 'map_pin', 'external_reference'));

alter table public.destinations
  drop constraint if exists destinations_gps_accuracy_range_check;
alter table public.destinations
  add constraint destinations_gps_accuracy_range_check
  check (gps_accuracy_m is null or gps_accuracy_m between 0 and 100000);

alter table public.destinations
  drop constraint if exists destinations_verification_review_check;
alter table public.destinations
  add constraint destinations_verification_review_check
  check (
    (verification_status = 'verified' and latitude is not null and longitude is not null
      and verified_at is not null and verified_by is not null
      and reviewed_at is not null and reviewed_by is not null)
    or (verification_status = 'rejected' and reviewed_at is not null and reviewed_by is not null)
    or (verification_status = 'pending' and verified_at is null and verified_by is null)
  );

create index if not exists destinations_gps_public_idx
  on public.destinations (verification_status, publication_status)
  where latitude is not null and longitude is not null;

comment on column public.destinations.coordinate_method is 'Metode pengambilan koordinat: GPS perangkat, pin peta, atau referensi eksternal.';
comment on column public.destinations.coordinate_captured_at is 'Waktu koordinat diambil atau dicatat oleh pengelola.';
comment on column public.destinations.coordinate_updated_by is 'Pengelola yang terakhir mencatat koordinat.';
comment on column public.destinations.verification_note is 'Catatan pemeriksaan koordinat oleh administrator.';
comment on column public.destinations.reviewed_at is 'Waktu pemeriksaan koordinat terakhir, termasuk hasil ditolak.';
comment on column public.destinations.reviewed_by is 'Administrator yang melakukan pemeriksaan koordinat terakhir.';

-- Menjaga status verifikasi agar Editor tidak dapat memalsukan status verified
-- melalui REST API langsung. Setiap perubahan koordinat otomatis mengembalikan
-- status ke pending, sehingga koordinat baru harus diperiksa kembali.
create or replace function public.guard_destination_gps_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_role public.app_role;
  v_coordinates_changed boolean;
  v_review_fields_changed boolean;
begin
  v_role := public.current_app_role();

  v_review_fields_changed :=
    new.verification_status is distinct from old.verification_status
    or new.verified_at is distinct from old.verified_at
    or new.verified_by is distinct from old.verified_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.reviewed_by is distinct from old.reviewed_by
    or new.verification_note is distinct from old.verification_note;

  if v_role = 'editor' and v_review_fields_changed then
    raise exception 'Editor tidak memiliki izin memverifikasi koordinat.'
      using errcode = '42501';
  end if;

  if v_role not in ('super_admin', 'admin')
    and new.verification_status in ('verified', 'rejected')
    and new.verification_status is distinct from old.verification_status then
    raise exception 'Hanya Admin atau Super Admin yang dapat memeriksa koordinat.'
      using errcode = '42501';
  end if;

  v_coordinates_changed :=
    new.latitude is distinct from old.latitude
    or new.longitude is distinct from old.longitude
    or new.gps_accuracy_m is distinct from old.gps_accuracy_m
    or new.coordinate_method is distinct from old.coordinate_method
    or new.coordinate_source is distinct from old.coordinate_source;

  if v_coordinates_changed then
    new.coordinate_captured_at := case
      when new.latitude is null then null
      else now()
    end;
    new.coordinate_updated_by := (select auth.uid());
    new.verification_status := 'pending';
    new.verified_at := null;
    new.verified_by := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.verification_note := null;
  end if;

  if new.verification_status in ('verified', 'rejected') then
    if v_role not in ('super_admin', 'admin') then
      raise exception 'Hanya Admin atau Super Admin yang dapat memeriksa koordinat.'
        using errcode = '42501';
    end if;
    if new.reviewed_at is null or new.reviewed_by is null then
      raise exception 'Identitas dan waktu pemeriksa wajib dicatat.'
        using errcode = '23514';
    end if;
  end if;

  if new.verification_status = 'verified' then
    if new.latitude is null or new.longitude is null then
      raise exception 'Koordinat latitude dan longitude wajib tersedia.'
        using errcode = '23514';
    end if;
    if new.verified_at is null or new.verified_by is null then
      raise exception 'Identitas dan waktu verifikasi wajib dicatat.'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists destinations_guard_gps_changes on public.destinations;
create trigger destinations_guard_gps_changes
before update on public.destinations
for each row execute procedure public.guard_destination_gps_changes();

revoke all on function public.guard_destination_gps_changes() from public;

-- INSERT juga harus dilindungi: policy insert destinasi berlaku untuk Editor,
-- sehingga status verifikasi dan atribusi koordinat tidak boleh dipercaya dari payload.
create or replace function public.guard_destination_gps_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_role public.app_role;
begin
  v_role := public.current_app_role();

  if v_role = 'editor' and (
    new.verification_status <> 'pending'
    or new.verified_at is not null
    or new.verified_by is not null
    or new.reviewed_at is not null
    or new.reviewed_by is not null
    or new.verification_note is not null
  ) then
    raise exception 'Editor tidak memiliki izin menetapkan hasil verifikasi pada data baru.'
      using errcode = '42501';
  end if;

  if new.verification_status in ('verified', 'rejected') and v_role not in ('super_admin', 'admin') then
    raise exception 'Hanya Admin atau Super Admin yang dapat menetapkan hasil pemeriksaan koordinat.'
      using errcode = '42501';
  end if;

  if new.latitude is not null or new.longitude is not null then
    new.coordinate_captured_at := now();
    new.coordinate_updated_by := (select auth.uid());
  else
    new.coordinate_captured_at := null;
    new.coordinate_updated_by := null;
  end if;

  return new;
end;
$$;

drop trigger if exists destinations_guard_gps_insert on public.destinations;
create trigger destinations_guard_gps_insert
before insert on public.destinations
for each row execute procedure public.guard_destination_gps_insert();

revoke all on function public.guard_destination_gps_insert() from public;

commit;
