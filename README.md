# DEWIS — Desa Wisata Bontomarannu

Website informasi dan promosi Desa Wisata Bontomarannu, Kepulauan Selayar. Proyek ini menggunakan Next.js App Router, React, TypeScript, Tailwind CSS, Leaflet, dan Supabase (PostgreSQL/Auth/Storage) sebagai backend terintegrasi.

## Persyaratan

- Node.js 20.9 atau lebih baru (disarankan Node.js 22)
- pnpm sesuai versi yang dicantumkan pada `package.json` (`pnpm@12.3.4`)
- Proyek Supabase untuk login, database, dan dashboard pengelola

## Menjalankan secara lokal

```bash
corepack enable
corepack pnpm install --no-frozen-lockfile
corepack pnpm dev
```

Buka http://localhost:3000.

## Pemeriksaan kode

```bash
corepack pnpm typecheck
corepack pnpm build
```

## Konfigurasi Supabase

Salin `.env.example` menjadi `.env.local`, lalu isi Project URL dan Publishable key dari Supabase Dashboard:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Jangan pernah menaruh `service_role` atau secret key pada variabel berawalan `NEXT_PUBLIC_`. Tahap 2 menggunakan Publishable key bersama kebijakan Row Level Security (RLS).

## Urutan database

Jalankan migration melalui Supabase Dashboard → SQL Editor secara berurutan:

1. `supabase/migrations/202611040001_initial_schema.sql` — tabel, role, Auth profile, RLS, indeks, dan bucket media.
2. `supabase/migrations/202611040002_seed_existing_destinations.sql` — memindahkan enam destinasi dari katalog statis lama ke database.
3. `supabase/migrations/202611040003_gallery_storage.sql` — metadata media, bucket privat, Storage RLS, dan fungsi pengaturan foto sampul.
4. `supabase/migrations/202611040004_gps_management.sql` — metadata pengambilan koordinat, pemeriksaan GPS, dan pengaman perubahan status verifikasi.

Kemudian:

1. Buat pengguna awal melalui Authentication → Users.
2. Promosikan UUID akun pengelola utama menjadi `super_admin` sesuai instruksi pada `docs/TAHAP-2.md`.
3. Salin URL dan Publishable key ke `.env.local`.
4. Masuk melalui `/login`; dashboard berada pada `/admin`.

## Modul yang tersedia

- `/` — website publik dan destinasi unggulan dari database.
- `/destinasi` — direktori destinasi terpublikasi.
- `/destinasi/[slug]` — detail destinasi dari database.
- `/peta` — marker hanya untuk koordinat GPS terverifikasi.
- `/pusat-data` — ringkasan data publik dan unduhan CSV.
- `/login` — autentikasi pengelola.
- `/admin` — ringkasan dashboard.
- `/admin/destinasi` — daftar dan pengelolaan CRUD destinasi.
- `/admin/destinasi/baru` — tambah destinasi.
- `/admin/destinasi/[id]/edit` — edit destinasi.
- `/admin/galeri` — unggah foto, atur caption/alt text/kredit, publikasi, urutan, sampul, dan hapus media.
- `/admin/peta` — daftar koordinat destinasi dan status verifikasi GPS.
- `/admin/peta/[id]` — ambil GPS perangkat, pilih pin di peta, simpan sumber/akurasi, dan verifikasi koordinat.

## Dokumentasi

- `docs/TAHAP-1.md` — persiapan dan refactoring.
- `docs/TAHAP-2.md` — Supabase, migration, RLS, dan akun Super Admin.
- `docs/TAHAP-3.md` — CRUD destinasi, migrasi data, dan integrasi halaman publik.
- `docs/TAHAP-4.md` — media library, upload, signed URL, dan migrasi bucket privat.
- `docs/TAHAP-5.md` — pengelolaan GPS, pemeriksaan koordinat, dan peta publik.
- `docs/template-koordinat-gps.csv` — inventaris koordinat GPS hasil survei.

## Struktur utama

- `app/` — halaman publik, login, dan dashboard.
- `components/` — komponen antarmuka.
- `lib/actions/` — Server Actions untuk perubahan data.
- `lib/queries/` — query data server-side.
- `lib/supabase/` — browser/server client dan pembaruan sesi.
- `lib/auth/` — pemeriksaan profil dan hak akses.
- `supabase/migrations/` — skema, kebijakan RLS, dan seed data.
- `lib/site-data.ts` — katalog statis lama untuk fallback saat Supabase belum dikonfigurasi.

## Status pengembangan

- Tahap 1: persiapan dan refactoring.
- Tahap 2: fondasi database PostgreSQL, autentikasi, role, RLS, Storage, login, dan dashboard awal.
- Tahap 3: CRUD destinasi, migrasi data awal, dan integrasi data publik.
- Tahap 4: upload foto, metadata media, pengaturan foto sampul, galeri publik, dan Storage privat dengan signed URL.
- Tahap 5: manajemen koordinat GPS, verifikasi administrator, dan peta publik dengan jarak garis lurus serta tautan petunjuk arah.
- Tahap 6: reservasi dan kontak pengunjung.

## Catatan

Enam data destinasi awal dimasukkan sebagai `published` untuk menjaga konten publik lama tetap muncul setelah beralih ke database. Status koordinat tetap `pending` dan latitude/longitude tetap kosong sampai diverifikasi. Operator harus memeriksa kebenaran teks, gambar, sumber, serta status publikasi sebelum dipakai sebagai informasi operasional.


## Tahap 6 — Reservasi dan kontak pengunjung

Tahap 6 menambahkan formulir reservasi publik, kode booking, pengelolaan status reservasi, formulir kontak, daftar pesan pengunjung, tautan tindak lanjut WhatsApp/email, dan pengaturan nomor WhatsApp/alamat publik.

### Rute baru
- `/reservasi` — formulir permintaan kunjungan.
- `/kontak` — formulir pesan dan tombol WhatsApp resmi jika nomor telah diatur.
- `/kebijakan-privasi` — penjelasan penggunaan data formulir.
- `/admin/reservasi` — pengelolaan reservasi dan konfirmasi manual.
- `/admin/pesan` — pengelolaan pesan pengunjung.
- `/admin/pengaturan` — pengaturan WhatsApp dan alamat publik.

### Migration
Jalankan `supabase/migrations/202611040005_reservations_and_contact.sql` setelah migration Tahap 2 sampai Tahap 5. Migration ini menambahkan kolom persetujuan privasi, mengunci insert tabel reservasi langsung untuk publik, dan menyediakan RPC `submit_public_reservation` yang mengembalikan kode booking tanpa memberikan hak baca data reservasi kepada pengunjung.

### Catatan operasional
- Reservasi menggunakan konfirmasi manual; tidak ada pembayaran online atau notifikasi WhatsApp otomatis.
- Nomor WhatsApp dan alamat publik harus diisi Admin/Super Admin melalui `/admin/pengaturan`.
- Formulir menggunakan honeypot dasar. Untuk deployment publik, tambahkan rate limiting dan CAPTCHA/Turnstile sesuai risiko trafik.
- Tetapkan jangka waktu retensi dan prosedur penghapusan data pengunjung sebelum peluncuran produksi.
- `privacy_consent_at` mencatat waktu persetujuan dari server.
- RPC reservasi dan kontak berjalan dengan hak terkontrol; publik tidak memperoleh akses SELECT ke data pengunjung.
- Trigger database memvalidasi perpindahan status reservasi/pesan dan hak UPDATE staf dibatasi ke kolom operasional.
