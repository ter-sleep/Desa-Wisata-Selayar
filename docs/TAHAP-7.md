# Tahap 7 — Pemeriksaan kualitas

## Pemeriksaan lokal

Pemeriksaan berikut dijalankan pada 5 November 2026 tanpa kredensial Supabase hosted atau akses ke database produksi:

| Pemeriksaan | Hasil |
|---|---|
| `pnpm install --frozen-lockfile` | Berhasil; build script `esbuild` diizinkan secara eksplisit di konfigurasi pnpm. |
| `pnpm lint` | Berhasil tanpa warning. |
| `pnpm typecheck` | Berhasil. |
| `pnpm test` | Berhasil: 7 unit test, 10 test/subtest database, 2 test pengaman integrasi, dan 1 smoke test HTTP lokal. |
| `pnpm build` | Berhasil dengan environment Supabase belum dikonfigurasi. |
| Smoke test HTTP | 16 rute/ikon publik merespons 200, 8 rute admin mengarahkan ke login, dan destinasi tidak dikenal merespons 404. |
| Pemeriksaan browser dasar | Katalog/search, keadaan peta kosong, dan error formulir kontak tanpa konfigurasi bekerja. Pada lebar 375, 768, dan 1280 px, lima halaman publik tidak menunjukkan overflow horizontal; label input/alt gambar dan menu responsif diperiksa secara dasar. |
| Integrasi Supabase lokal di GitHub Actions | Berhasil: 7 test/subtest menjalankan Auth, PostgREST, dan Storage pada stack Docker sementara. Pengujian mencakup akun dan role, RLS, RPC, status, GPS, upload, signed URL, sampul, dan penghapusan Storage. |

Test database memakai PostgreSQL terisolasi melalui PGlite, dengan fixture minimal untuk schema Auth dan Storage. Seluruh migration 001–006 dijalankan secara lokal, termasuk skenario upgrade data GPS lama. Test memeriksa RLS, role aktif/tidak aktif, pembatasan data pengunjung, RPC, constraint/foreign key, transisi status, atribusi GPS, dan kebijakan media. Test ini terpisah dari integrasi layanan Supabase lokal dan bukan uji deployment hosted.

Job integrasi menjalankan Supabase CLI 3.0.0 pada runner sementara, menerapkan migration, dan membuat akun acak melalui Auth lokal. URL, key, dan data uji berasal dari stack lokal; tidak ada kredensial hosted atau migration produksi yang digunakan. File status disimpan secara privat dan dibersihkan, dan test menolak proyek ter-link, endpoint selain `127.0.0.1`, serta redirect keluar. Uji hosted tetap diperlukan karena konfigurasi dan data proyek pemilik dapat berbeda.

Pada stack tersebut, test HTTP juga mengirim formulir Next.js dan memeriksa sesi login/logout, penolakan visitor/nonaktif, CRUD destinasi, upload/hapus/sampul media, penyimpanan dan verifikasi GPS, reservasi/kontak, serta perubahan status oleh staf. Test ini tidak menjalankan JavaScript browser, GPS perangkat, atau interaksi peta.

Unit test mencakup tanggal kalender, nomor WhatsApp, transisi status, kelengkapan metadata GPS, signature format gambar, dan pesan loading/error. Scan statis pada test database memastikan migration tidak memuat `DROP TABLE`, `TRUNCATE`, atau `DELETE FROM`; pemeriksaan ini tidak membuktikan setiap upgrade data aman tanpa tinjauan operator.

Smoke test otomatis menjalankan server Next.js lokal tanpa konfigurasi Supabase dan memeriksa redirect admin serta status 404 destinasi. Server test tidak memakai kredensial atau menyentuh database.

## Perbaikan penting

- Tipe RPC sampul dan error TypeScript yang menghalangi build diperbaiki.
- Editor dapat mengedit konten destinasi terverifikasi, tetapi tidak dapat memalsukan review GPS; penyimpanan ulang titik kembali ke `pending`.
- Data GPS lama tanpa metadata review lengkap tidak menghasilkan marker publik.
- Validasi nomor WhatsApp dan tanggal diperketat; perubahan GPS, reservasi, dan pesan menolak versi formulir yang sudah kedaluwarsa.
- Kesalahan signed URL, pengaturan kontak, logout, dan pembersihan media tidak lagi disamarkan sebagai keberhasilan/data kosong.
- Metadata favicon yang mengarah ke file tidak tersedia diganti ikon yang tersedia; kontrol navigasi mempunyai atribut aksesibilitas.
- GitHub Actions menjalankan lint, typecheck, test, build, dan integrasi layanan Supabase lokal.

## Masih memerlukan konfigurasi dan uji hosted

- Buat proyek Supabase nonproduksi, isi URL/Publishable key, terapkan migration yang belum ada, dan sediakan akun aktif untuk masing-masing role.
- Uji login/logout, CRUD, media, GPS perangkat/pin, reservasi/kontak, status, dan pengaturan kontak pada deployment yang memakai proyek nonproduksi tersebut.
- Uji akses API langsung untuk anon, visitor, Editor, Admin, dan Super Admin pada proyek hosted, termasuk kebijakan Storage dan masa berlaku signed URL.
- Periksa responsive pada perangkat nyata, keyboard/screen reader, seluruh loading/error state, performa jaringan, ukuran gambar, dan beban query dengan data nyata; belum ada benchmark atau pengujian perangkat lengkap.
- Pantau dukungan ESLint: versi 9 yang dipakai untuk pengembangan sudah tidak didukung upstream, sementara beberapa plugin dalam konfigurasi Next.js saat ini masih membatasi peer dependency sampai versi 9. Tingkatkan setelah kombinasi plugin mendukung ESLint 10.
- Tetapkan nomor/alamat resmi, bukti koordinat, hak penggunaan foto, kebijakan privasi/retensi, dan prosedur penghapusan. Tambahkan anti-abuse yang juga melindungi RPC langsung.
- Verifikasi deployment secara terpisah. Tidak ada migration produksi atau deployment yang dijalankan selama pemeriksaan lokal ini.
