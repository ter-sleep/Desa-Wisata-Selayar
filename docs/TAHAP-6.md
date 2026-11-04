# DEWIS — Tahap 6: Reservasi dan Kontak Pengunjung

## Ringkasan

Tahap 6 menambahkan alur operasional pengunjung di atas fondasi Supabase dari Tahap 2–5. Pengunjung dapat mengirim permintaan reservasi tanpa membuat akun, mengirim pesan kontak, dan menghubungi nomor WhatsApp resmi yang telah diatur pengelola.

Reservasi pada tahap ini **belum merupakan pemesanan instan**. Semua permintaan memiliki status awal `pending` dan harus diperiksa serta dikonfirmasi manual oleh pengelola.

## Rute baru

### Publik
- `/reservasi` — formulir reservasi; menerima query `?destination=<slug>` dari detail destinasi.
- `/kontak` — formulir pesan dan tombol WhatsApp bila nomor resmi telah dikonfigurasi.
- `/kebijakan-privasi` — informasi penggunaan data yang dikirim pengunjung.

### Admin
- `/admin/reservasi` — daftar reservasi terbaru, filter status, catatan pengelola, tautan WhatsApp, dan perubahan status.
- `/admin/pesan` — daftar pesan terbaru, filter status, tautan balas email/WhatsApp, dan status tindak lanjut.
- `/admin/pengaturan` — pengaturan nomor WhatsApp dan alamat publik. Hanya Admin/Super Admin yang dapat menyimpan pengaturan; Editor hanya dapat melihat.

## Migration database

File: `supabase/migrations/202611040005_reservations_and_contact.sql`

Jalankan setelah migration Tahap 2–5 sudah diterapkan. Urutan lengkap pada proyek baru:

1. `202611040001_initial_schema.sql`
2. `202611040002_seed_existing_destinations.sql`
3. `202611040003_gallery_storage.sql`
4. `202611040004_gps_management.sql`
5. `202611040005_reservations_and_contact.sql`

Migration Tahap 6:
- Menambah `privacy_consent_at` pada reservasi dan pesan.
- Mencabut hak INSERT tabel langsung untuk anon/authenticated, termasuk privilege INSERT per kolom yang pernah diberikan pada Tahap 2.
- Membuat RPC `submit_public_reservation(...)` yang memvalidasi data, memeriksa destinasi terbit, menolak tanggal lampau berdasarkan zona waktu Asia/Makassar, menetapkan status `pending`, dan mengembalikan kode booking.
- Membuat RPC `submit_public_contact_message(...)` yang memvalidasi pesan dan merekam waktu persetujuan.
- Membatasi UPDATE reservasi/pesan hanya pada kolom operasional yang dibutuhkan staf.
- Menambahkan trigger PostgreSQL untuk menolak transisi status yang tidak diizinkan meskipun permintaan dikirim langsung melalui API.
- Membatasi EXECUTE kedua RPC hanya untuk role `anon` dan `authenticated`; pengunjung tidak memperoleh hak SELECT data reservasi/pesan.

## Konfigurasi WhatsApp

Setelah menjalankan migration dan login sebagai Admin/Super Admin:

1. Buka `/admin/pengaturan`.
2. Isi nomor WhatsApp dengan format internasional, misalnya `+6281234567890`.
3. Isi alamat publik hanya jika informasinya telah dikonfirmasi.
4. Simpan pengaturan.

Nomor belum diisi secara default karena nomor kontak resmi harus diberikan oleh pengelola. Jangan mengganti nomor dengan nomor pribadi tanpa izin pemiliknya.

## Alur reservasi

1. Pengunjung memilih destinasi yang berstatus `published`.
2. Pengunjung mengisi nama, WhatsApp, tanggal, jumlah peserta, dan persetujuan privasi.
3. Server memvalidasi input, kemudian memanggil RPC database.
4. Database membuat `booking_code` dan menyimpan status awal `pending`.
5. Halaman menampilkan kode booking; tidak menampilkan informasi pribadi dari record lain.
6. Admin memeriksa permintaan di `/admin/reservasi`.
7. Admin membuka WhatsApp dari tautan yang telah disiapkan, menghubungi pengunjung secara manual, lalu memperbarui status.

Transisi status yang diizinkan:
- `pending` → `confirmed`, `rejected`, atau `cancelled`.
- `confirmed` → `cancelled` atau `completed`.
- `rejected`, `cancelled`, dan `completed` merupakan status terminal pada antarmuka saat ini.

Belum ada pemeriksaan kapasitas otomatis, slot waktu, pembayaran, ataupun notifikasi WhatsApp otomatis.

## Alur kontak

1. Pengunjung mengisi nama dan pesan, dengan email/telepon opsional.
2. Persetujuan pemrosesan data wajib dicentang.
3. Server memanggil RPC dan pesan tersimpan sebagai `new`.
4. Staf membaca pesan di `/admin/pesan`.
5. Staf membalas melalui aplikasi email/WhatsApp, kemudian mencatat status tindak lanjut.

Transisi pesan:
- `new` → `read` atau `archived`.
- `read` → `replied` atau `archived`.
- `replied` → `archived`.
- `archived` → `read` (dibuka kembali).

## Keamanan dan privasi

- Formulir publik memakai Server Actions, validasi server, honeypot dasar, dan RPC database.
- Pengunjung tidak mendapatkan hak baca atas tabel reservasi atau pesan.
- Status awal dan waktu pemrosesan ditetapkan database/server, bukan dari input browser.
- Pembaruan status hanya tersedia untuk staf yang telah lolos pemeriksaan role.
- Aktivitas status dan pengaturan dicatat ke `audit_logs` sebagai upaya pencatatan pendukung.
- Kebijakan privasi di dalam aplikasi merupakan naskah awal operasional. Pengelola perlu meninjau kontak pengendali data, tujuan rinci, dasar pemrosesan, jangka waktu retensi, dan prosedur permintaan/penghapusan data sebelum website dipublikasikan.
- Honeypot hanya mengurangi spam sederhana. Sebelum peluncuran publik, tambahkan rate limiting di edge/platform dan CAPTCHA atau Turnstile sesuai kebutuhan.

## Cara menjalankan

```bash
corepack pnpm install --no-frozen-lockfile
corepack pnpm dev
```

Buka `http://localhost:3000`. Pastikan `.env.local` berisi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Pemeriksaan lokal:

```bash
corepack pnpm typecheck
corepack pnpm build
```

## Checklist uji manual

1. Admin mengatur nomor WhatsApp dan alamat publik.
2. Nomor muncul pada halaman `/kontak` dan tautan WhatsApp mengarah ke `wa.me` dengan nomor yang benar.
3. Reservasi tanpa persetujuan privasi ditolak.
4. Reservasi dengan tanggal lampau ditolak.
5. Destinasi Draft/Archived tidak muncul pada opsi reservasi.
6. Reservasi valid menghasilkan kode booking dan berstatus `pending`.
7. Pengunjung anonim tidak dapat membaca daftar reservasi atau pesan melalui API tabel.
8. Admin dapat mengonfirmasi atau menolak permintaan pending.
9. Perubahan status yang tidak diizinkan ditolak server.
10. Pesan kontak valid muncul pada `/admin/pesan`.
11. Editor tidak dapat menyimpan pengaturan WhatsApp/alamat.
12. Pesan/reservasi dapat ditindaklanjuti melalui WhatsApp/email secara manual.
