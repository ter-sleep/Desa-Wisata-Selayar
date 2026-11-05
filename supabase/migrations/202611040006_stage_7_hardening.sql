-- Perbaikan Tahap 7. Tidak menghapus atau menulis ulang data pengunjung.
begin;

-- Reservasi publik hanya boleh dibuat melalui RPC Tahap 6.
drop policy if exists "reservations_public_create_pending" on public.reservations;

-- Validasi nomor baru tanpa menghalangi pembaruan status reservasi lama.
create or replace function public.validate_reservation_whatsapp()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_phone text := btrim(coalesce(new.whatsapp, ''));
begin
  if length(v_phone) > 30
    or v_phone !~ '^\+?[0-9(][0-9 ()-]*$'
    or length(regexp_replace(v_phone, '[^0-9]', '', 'g')) < 8
    or length(regexp_replace(v_phone, '[^0-9+]', '', 'g')) > 20 then
    raise exception 'Nomor WhatsApp tidak valid.' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists reservations_validate_whatsapp on public.reservations;
create trigger reservations_validate_whatsapp
before insert or update of whatsapp on public.reservations
for each row execute procedure public.validate_reservation_whatsapp();

revoke all on function public.validate_reservation_whatsapp() from public;

-- Editor boleh mengubah konten destinasi terverifikasi dan mengusulkan ulang
-- koordinat, tetapi tidak boleh menetapkan atau memalsukan hasil pemeriksaan.
create or replace function public.guard_destination_gps_changes()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_role public.app_role := public.current_app_role();
  v_coordinates_changed boolean;
  v_review_fields_changed boolean;
  v_reset_requested boolean;
begin
  v_coordinates_changed :=
    new.latitude is distinct from old.latitude
    or new.longitude is distinct from old.longitude
    or new.gps_accuracy_m is distinct from old.gps_accuracy_m
    or new.coordinate_method is distinct from old.coordinate_method
    or new.coordinate_source is distinct from old.coordinate_source
    or new.coordinate_captured_at is distinct from old.coordinate_captured_at
    or new.coordinate_updated_by is distinct from old.coordinate_updated_by;

  v_review_fields_changed :=
    new.verification_status is distinct from old.verification_status
    or new.verified_at is distinct from old.verified_at
    or new.verified_by is distinct from old.verified_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.reviewed_by is distinct from old.reviewed_by
    or new.verification_note is distinct from old.verification_note;

  v_reset_requested :=
    new.verification_status = 'pending'
    and old.verification_status <> 'pending'
    and new.verified_at is not distinct from old.verified_at
    and new.verified_by is not distinct from old.verified_by
    and new.reviewed_at is not distinct from old.reviewed_at
    and new.reviewed_by is not distinct from old.reviewed_by
    and new.verification_note is not distinct from old.verification_note;

  if v_review_fields_changed
    and coalesce(v_role::text, '') not in ('super_admin', 'admin')
    and not (coalesce(v_role::text, '') = 'editor' and v_reset_requested) then
    raise exception 'Hanya Admin atau Super Admin yang dapat memeriksa koordinat.'
      using errcode = '42501';
  end if;

  if v_coordinates_changed or v_reset_requested then
    new.coordinate_captured_at := case when new.latitude is null then null else now() end;
    new.coordinate_updated_by := (select auth.uid());
    new.verification_status := 'pending';
    new.verified_at := null;
    new.verified_by := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.verification_note := null;
  elsif v_review_fields_changed then
    if new.verification_status in ('verified', 'rejected') then
      if new.latitude is null or new.longitude is null then
        raise exception 'Koordinat latitude dan longitude wajib tersedia.' using errcode = '23514';
      end if;
      if length(btrim(coalesce(new.verification_note, ''))) not between 5 and 1000 then
        raise exception 'Catatan pemeriksaan wajib diisi (5–1.000 karakter).' using errcode = '23514';
      end if;
      new.reviewed_at := now();
      new.reviewed_by := (select auth.uid());
      new.verified_at := case when new.verification_status = 'verified' then new.reviewed_at else null end;
      new.verified_by := case when new.verification_status = 'verified' then new.reviewed_by else null end;
    else
      new.verified_at := null;
      new.verified_by := null;
      new.reviewed_at := null;
      new.reviewed_by := null;
      new.verification_note := null;
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.guard_destination_gps_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_role public.app_role := public.current_app_role();
begin
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

  if new.latitude is not null or new.longitude is not null then
    new.coordinate_captured_at := now();
    new.coordinate_updated_by := (select auth.uid());
  else
    new.coordinate_captured_at := null;
    new.coordinate_updated_by := null;
  end if;

  if new.verification_status in ('verified', 'rejected') then
    if coalesce(v_role::text, '') not in ('super_admin', 'admin') then
      raise exception 'Hanya Admin atau Super Admin yang dapat memeriksa koordinat.'
        using errcode = '42501';
    end if;
    if new.latitude is null or new.longitude is null then
      raise exception 'Koordinat latitude dan longitude wajib tersedia.' using errcode = '23514';
    end if;
    if length(btrim(coalesce(new.verification_note, ''))) not between 5 and 1000 then
      raise exception 'Catatan pemeriksaan wajib diisi (5–1.000 karakter).' using errcode = '23514';
    end if;
    new.reviewed_at := now();
    new.reviewed_by := (select auth.uid());
    new.verified_at := case when new.verification_status = 'verified' then new.reviewed_at else null end;
    new.verified_by := case when new.verification_status = 'verified' then new.reviewed_by else null end;
  else
    new.verified_at := null;
    new.verified_by := null;
    new.reviewed_at := null;
    new.reviewed_by := null;
    new.verification_note := null;
  end if;

  return new;
end;
$$;

commit;
