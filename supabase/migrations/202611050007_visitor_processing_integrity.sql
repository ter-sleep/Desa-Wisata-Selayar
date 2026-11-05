-- Database owns processing attribution; historical rows are left unchanged.
begin;

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
    if auth.uid() is null then
      raise exception 'Pemrosesan reservasi memerlukan pengguna terautentikasi.' using errcode = '42501';
    end if;
    new.processed_by := auth.uid();
    new.processed_at := now();
  elsif new.processed_by is distinct from old.processed_by
     or new.processed_at is distinct from old.processed_at then
    raise exception 'Identitas dan waktu pemrosesan hanya dapat berubah melalui transisi status.' using errcode = '23514';
  end if;
  return new;
end;
$$;

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
    if auth.uid() is null then
      raise exception 'Pemrosesan pesan memerlukan pengguna terautentikasi.' using errcode = '42501';
    end if;
    new.processed_by := auth.uid();
    new.processed_at := now();
  elsif new.processed_by is distinct from old.processed_by
     or new.processed_at is distinct from old.processed_at then
    raise exception 'Identitas dan waktu pemrosesan hanya dapat berubah melalui transisi status.' using errcode = '23514';
  end if;
  return new;
end;
$$;

commit;
