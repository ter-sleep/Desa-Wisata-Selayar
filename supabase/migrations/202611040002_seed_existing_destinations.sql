-- DEWIS · Tahap 3
-- Migrasi katalog destinasi statis yang sudah ada ke PostgreSQL.
-- Semua entri lama dipertahankan sebagai Published agar konten publik tidak kosong
-- setelah aplikasi beralih membaca database. Koordinat tetap NULL dan status GPS
-- tetap pending sampai pengelola melakukan verifikasi lapangan.

begin;

-- Urutan tampil dipisahkan dari nama agar beranda/katalog dapat dikurasi admin.
alter table public.destinations
  add column if not exists sort_order integer not null default 100;

alter table public.destinations
  drop constraint if exists destinations_sort_order_check;
alter table public.destinations
  add constraint destinations_sort_order_check check (sort_order between 0 and 100000);

insert into public.destinations (
  slug, name, category, eyebrow, description, image_url, status, details,
  data_source, data_status, updated_year, sort_order, verification_status, publication_status
) values
(
  'puncak-tanadoang', 'Puncak Tanadoang', 'Alam', 'Ikon desa wisata',
  'Perbukitan sejuk dengan kabut, sunset, dan pandangan ke laut lepas Pulau Selayar.',
  'https://bontomarannu.com.patikarya.desa.id/assets/gambar/fa8d51ad391005a0cae1eed7461157a3.jpg',
  'Fasilitas perlu dikonfirmasi',
  array['Panorama perbukitan', 'Camping dan ruang terbuka', 'Pemandangan Kota Benteng'],
  'Dossier riset & RIPPARKAB', 'Terverifikasi sebagian', 2026, 10, 'pending', 'published'
),
(
  'hutan-kenari-gojang', 'Hutan Kenari Gojang', 'Agrowisata', 'Hutan & ekonomi lokal',
  'Ekowisata berbasis masyarakat yang mempertemukan pepohonan kenari, aliran air, dan pengetahuan panen tradisional.',
  'https://sulsel.jadesta.com/imgpost/126187.jpg',
  'Aktivitas perlu dikonfirmasi',
  array['Interpretasi hutan', 'Kenari dan hasil alam', 'Edukasi konservasi'],
  'Dossier riset', 'Perlu survei lapangan', 2026, 20, 'pending', 'published'
),
(
  'gantarang-lalang-bata', 'Kampung Tua Gantarang Lalang Bata', 'Sejarah', 'Jejak permukiman tua',
  'Lanskap kampung tua dengan susunan batu, cerita pintu masuk, dan narasi sejarah Gantarang.',
  'https://sulsel.jadesta.com/imgpost/116798.jpg',
  'Dokumentasi perlu dilengkapi',
  array['Sejarah dan arkeologi', 'Jalur kampung', 'Cerita masyarakat'],
  'PPKD Kebudayaan', 'Terverifikasi sebagian', 2026, 30, 'pending', 'published'
),
(
  'masjid-tua-awaluddin', 'Masjid Tua Gantarang', 'Budaya', 'Warisan religi',
  'Masjid bersejarah di Kampung Gantarang Lalang Bata yang perlu dikunjungi dengan hormat pada fungsi ibadahnya.',
  'https://kumparan.com/jejak-jelata/berkunjung-ke-masjid-tua-gantarang-lalang-bata-di-pulau-selayar-1rXC8kXFPiV',
  'Aturan kunjungan perlu dikonfirmasi',
  array['Warisan Islam', 'Arsitektur dan sejarah', 'Etika kunjungan'],
  'PPKD Kebudayaan', 'Perlu konfirmasi', 2026, 40, 'pending', 'published'
),
(
  'pantai-baubere', 'Pantai Babaere', 'Bahari', 'Pesisir Bontomarannu',
  'Pantai yang tercatat dalam rencana pariwisata kabupaten sebagai potensi rekreasi pesisir.',
  'https://turisian.com/wp-content/uploads/2022/08/Puncak-Tanadoang-Selayar.jpg',
  'Nama dan keselamatan perlu diverifikasi',
  array['Bentang pesisir', 'Potensi snorkeling', 'Catatan keselamatan'],
  'RIPPARKAB 2023–2025', 'Perlu verifikasi nama', 2026, 50, 'pending', 'published'
),
(
  'air-terjun-kelong', 'Air Terjun & Sungai Ke''long', 'Alam', 'Jelajah air',
  'Atraksi alam yang tercatat dalam direktori wisata; detail jalur dan kondisi lapangan belum tersedia.',
  'https://sulsel.jadesta.com/imgpost/126187.jpg',
  'Data lapangan belum tersedia',
  array['Jelajah sungai', 'Musim dan debit air', 'Akses perlu survei'],
  'Direktori wisata', 'Data awal', 2026, 60, 'pending', 'published'
)
on conflict (slug) do nothing;

create index if not exists destinations_publication_sort_idx
  on public.destinations (publication_status, sort_order, name);

commit;
