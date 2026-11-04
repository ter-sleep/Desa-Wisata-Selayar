-- DEWIS · Tahap 4
-- Galeri, metadata media, bucket privat, signed URL, dan kebijakan akses.
-- Jalankan setelah migration 001_initial_schema.sql dan 002_seed_existing_destinations.sql.

begin;

-- Ukuran dan tipe media dicatat untuk audit serta validasi di sisi server.
alter table public.destination_media
  add column if not exists file_size_bytes bigint,
  add column if not exists mime_type text;

alter table public.destination_media
  drop constraint if exists destination_media_file_size_check;
alter table public.destination_media
  add constraint destination_media_file_size_check
  check (file_size_bytes is null or file_size_bytes between 1 and 8388608);

alter table public.destination_media
  drop constraint if exists destination_media_mime_type_check;
alter table public.destination_media
  add constraint destination_media_mime_type_check
  check (mime_type is null or mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif'));

create index if not exists destination_media_public_sort_idx
  on public.destination_media (is_published, destination_id, sort_order, created_at desc);

comment on column public.destination_media.file_size_bytes is 'Ukuran file saat diunggah; maksimal 8 MiB.';
comment on column public.destination_media.mime_type is 'MIME type gambar yang lolos validasi server.';

-- Bucket dibuat privat agar gambar draft/tidak dipublikasikan tidak dapat dibaca
-- hanya dengan mengetahui URL objek. Foto publik disajikan melalui signed URL.
update storage.buckets
set public = false,
    file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
where id = 'destination-media';

-- Hapus policy Tahap 2 dan pasang ulang dengan akses baca terpilah.
drop policy if exists "destination_media_bucket_public_read" on storage.objects;
drop policy if exists "destination_media_bucket_read_published_or_staff" on storage.objects;
drop policy if exists "destination_media_bucket_staff_upload" on storage.objects;
drop policy if exists "destination_media_bucket_staff_update" on storage.objects;
drop policy if exists "destination_media_bucket_staff_delete" on storage.objects;

-- Pengunjung hanya dapat membuat signed URL untuk media yang dipublikasikan
-- dan milik destinasi yang juga dipublikasikan. Staf dapat membaca seluruh media.
create policy "destination_media_bucket_read_published_or_staff"
on storage.objects for select to anon, authenticated
using (
  bucket_id = 'destination-media'
  and (
    public.current_app_role() in ('super_admin', 'admin', 'editor')
    or exists (
      select 1
      from public.destination_media as m
      join public.destinations as d on d.id = m.destination_id
      where m.storage_path = storage.objects.name
        and m.is_published = true
        and d.publication_status = 'published'
    )
  )
);

-- Upload hanya ke folder yang memakai UUID destinasi yang benar-benar ada.
create policy "destination_media_bucket_staff_upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'destination-media'
  and public.current_app_role() in ('super_admin', 'admin', 'editor')
  and exists (
    select 1 from public.destinations d
    where d.id::text = (storage.foldername(storage.objects.name))[1]
  )
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
  and exists (
    select 1 from public.destinations d
    where d.id::text = (storage.foldername(storage.objects.name))[1]
  )
);

-- Hapus hanya oleh staf; dibutuhkan juga saat membersihkan objek yatim
-- setelah metadata di database dihapus.
create policy "destination_media_bucket_staff_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'destination-media'
  and public.current_app_role() in ('super_admin', 'admin', 'editor')
);

-- Fungsi atomik untuk memastikan maksimal satu foto sampul per destinasi.
-- Lock pada baris destinasi mencegah dua permintaan cover saling menimpa.
create or replace function public.set_destination_media_cover(p_media_id uuid)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_destination_id uuid;
begin
  if coalesce(public.current_app_role()::text, '') not in ('super_admin', 'admin', 'editor') then
    raise exception 'Tidak memiliki izin mengatur foto sampul.' using errcode = '42501';
  end if;

  select m.destination_id
    into v_destination_id
  from public.destination_media as m
  where m.id = p_media_id
    and m.is_published = true;

  if v_destination_id is null then
    raise exception 'Media tidak ditemukan atau belum dipublikasikan.' using errcode = 'P0002';
  end if;

  perform 1
  from public.destinations as d
  where d.id = v_destination_id
  for update;

  update public.destination_media
  set is_cover = false
  where destination_id = v_destination_id
    and is_cover = true;

  update public.destination_media
  set is_cover = true
  where id = p_media_id;
end;
$$;

revoke all on function public.set_destination_media_cover(uuid) from public;
grant execute on function public.set_destination_media_cover(uuid) to authenticated;

commit;
