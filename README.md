# DEWIS — Desa Wisata Bontomarannu

Website informasi dan promosi Desa Wisata Bontomarannu, Kepulauan Selayar. Proyek ini menggunakan Next.js App Router, React, TypeScript, Tailwind CSS, Leaflet, dan Supabase (PostgreSQL/Auth/Storage) sebagai backend terintegrasi.

## Persyaratan

- Node.js 22 atau lebih baru (dependency Supabase saat ini memerlukan Node.js 22)
- pnpm sesuai versi yang dicantumkan pada `package.json` (`pnpm@12.3.4`)
- Proyek Supabase untuk login, database, dan dashboard pengelola

## Menjalankan secara lokal

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Buka http://localhost:3000.
Pada PowerShell Windows yang memblokir skrip `.ps1`, gunakan `pnpm.cmd` sebagai pengganti `pnpm`.

## Pemeriksaan kode

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

GitHub Actions juga menjalankan `pnpm test:supabase` terhadap layanan Auth, PostgREST, dan Storage lokal yang bersifat sementara, termasuk pengiriman formulir dan sesi aplikasi melalui HTTP. Pengujian ini terpisah dari `pnpm test`: diperlukan Docker, Supabase CLI 3.0.0, serta stack lokal yang tidak terhubung ke proyek hosted.

Untuk menjalankannya sendiri, siapkan **stack disposable** dengan migration proyek, simpan output `supabase status -o json` sebagai file UTF-8 tanpa BOM yang hanya dapat dibaca pengguna saat ini, lalu arahkan `DEWIS_SUPABASE_STATUS_FILE` ke file tersebut sebelum menjalankan `pnpm test:supabase`. File status dan output `supabase start` mengandung kredensial lokal: jangan tampilkan, bagikan, atau commit; hapus file status setelah selesai. Pengujian menolak proyek yang ter-link, endpoint selain `127.0.0.1`, dan redirect keluar. Perintah `supabase stop --no-backup` menghapus volume data lokal proyek, jadi jangan gunakan pada stack yang berisi data yang ingin dipertahankan.

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
5. `supabase/migrations/202611040005_reservations_and_contact.sql` — RPC reservasi/kontak, persetujuan privasi, dan transisi status.
6. `supabase/migrations/202611040006_stage_7_hardening.sql` — validasi nomor, koreksi izin GPS, dan atribusi pemeriksa.

Terapkan setiap migration **sekali dan berurutan** pada proyek baru. Untuk database yang telah memiliki riwayat migration, terapkan hanya versi yang belum dijalankan; jangan mengulang migration awal. Jangan jalankan migration terhadap produksi tanpa persetujuan dan cadangan yang sesuai.

Saat migration 004 belum pernah diterapkan pada database lama, ia mempertahankan baris GPS lama dan hanya menyalin identitas pemeriksa yang memang sudah tercatat. Jika PostgreSQL memberi peringatan bahwa constraint review belum tervalidasi, Admin harus memeriksa ulang data lama sebelum deployment. Cara pemeriksaan ada di [dokumentasi arsitektur](docs/ARSITEKTUR.md#data-gps-lama).

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
- `/reservasi`, `/kontak`, dan `/kebijakan-privasi` — permintaan kunjungan, pesan, dan informasi privasi.
- `/admin/reservasi`, `/admin/pesan`, dan `/admin/pengaturan` — tindak lanjut pengunjung dan informasi kontak publik.

## Dokumentasi

- `docs/TAHAP-1.md` — persiapan dan refactoring.
- `docs/TAHAP-2.md` — Supabase, migration, RLS, dan akun Super Admin.
- `docs/TAHAP-3.md` — CRUD destinasi, migrasi data, dan integrasi halaman publik.
- `docs/TAHAP-4.md` — media library, upload, signed URL, dan migrasi bucket privat.
- `docs/TAHAP-5.md` — pengelolaan GPS, pemeriksaan koordinat, dan peta publik.
- `docs/TAHAP-6.md` — reservasi dan kontak pengunjung.
- `docs/ARSITEKTUR.md` — arsitektur, batas kepercayaan, role, dan migrasi GPS lama.
- `docs/TAHAP-7.md` — hasil pemeriksaan dan integrasi yang masih memerlukan Supabase.
- `docs/template-koordinat-gps.csv` — inventaris koordinat GPS hasil survei.

## Struktur utama

- `app/` — halaman publik, login, dan dashboard.
- `components/` — komponen antarmuka.
- `lib/actions/` — Server Actions untuk perubahan data.
- `lib/queries/` — query data server-side.
- `lib/supabase/` — browser/server client dan pembaruan sesi.
- `lib/auth/` — pemeriksaan profil dan hak akses.
- `supabase/migrations/` — skema, kebijakan RLS, dan seed data.
- `tests/` — unit test, uji PostgreSQL terisolasi, dan integrasi layanan Supabase lokal.
- `.github/workflows/quality.yml` — lint, typecheck, test, build, dan integrasi Supabase sementara pada GitHub Actions.
- `lib/site-data.ts` — katalog statis lama untuk fallback saat Supabase belum dikonfigurasi.

## Status pengembangan

- Tahap 1: persiapan dan refactoring.
- Tahap 2: fondasi database PostgreSQL, autentikasi, role, RLS, Storage, login, dan dashboard awal.
- Tahap 3: CRUD destinasi, migrasi data awal, dan integrasi data publik.
- Tahap 4: upload foto, metadata media, pengaturan foto sampul, galeri publik, dan Storage privat dengan signed URL.
- Tahap 5: manajemen koordinat GPS, verifikasi administrator, dan peta publik dengan jarak garis lurus serta tautan petunjuk arah.
- Tahap 6: reservasi dan kontak pengunjung.
- Tahap 7: pemeriksaan kualitas, hardening, dan pengujian layanan Supabase lokal; pengujian proyek hosted dan deployment masih memerlukan konfigurasi pemilik.

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
Jalankan migration 005 setelah migration 001–004 dan lanjutkan dengan migration 006. RPC `submit_public_reservation` mengembalikan kode booking tanpa memberikan hak baca data reservasi kepada pengunjung.

### Catatan operasional
- Reservasi menggunakan konfirmasi manual; tidak ada pembayaran online atau notifikasi WhatsApp otomatis.
- Nomor WhatsApp dan alamat publik harus diisi Admin/Super Admin melalui `/admin/pengaturan`.
- Formulir menggunakan honeypot dasar. Untuk deployment publik, tambahkan rate limiting dan CAPTCHA/Turnstile sesuai risiko trafik.
- Tetapkan jangka waktu retensi dan prosedur penghapusan data pengunjung sebelum peluncuran produksi.
- `privacy_consent_at` mencatat waktu persetujuan dari server.
- RPC reservasi dan kontak berjalan dengan hak terkontrol; publik tidak memperoleh akses SELECT ke data pengunjung.
- Trigger database memvalidasi perpindahan status reservasi/pesan dan hak UPDATE staf dibatasi ke kolom operasional.

## Deployment

1. Gunakan Node.js 22+ dan `pnpm install --frozen-lockfile`, lalu jalankan `pnpm check`.
2. Pada proyek Supabase **nonproduksi**, terapkan migration yang belum ada dan uji akun serta kebijakan sesuai `docs/TAHAP-7.md`.
3. Isi Project URL dan Publishable key pada environment deployment, tanpa `service_role` atau secret key di variabel publik.
4. Setelah konfigurasi, konten, izin foto, kebijakan privasi, dan hasil uji disetujui pemilik, deploy build Next.js ke platform yang mendukung Server Actions.
5. Pastikan HTTPS aktif untuk login dan Geolocation API. Deployment belum dilakukan oleh perubahan ini.

Nomor resmi, alamat, koordinat lapangan, jangka retensi data, proteksi spam/rate limiting, dan prosedur penghapusan data harus ditetapkan pemilik sebelum peluncuran. Pengujian layanan Supabase lokal tidak menggantikan uji Auth, RLS, Storage, dan alur pengunjung pada proyek hosted dan lingkungan deployment yang disetujui pemilik.
