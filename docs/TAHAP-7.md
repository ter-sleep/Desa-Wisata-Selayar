# Tahap 7 — Pemeriksaan kualitas

## Pemeriksaan lokal

Pemeriksaan berikut dijalankan pada 5 November 2026 tanpa kredensial Supabase hosted atau akses ke database produksi:

| Pemeriksaan | Hasil |
|---|---|
| `pnpm install --frozen-lockfile` | Berhasil; build script `esbuild` diizinkan secara eksplisit di konfigurasi pnpm. |
| `pnpm lint` | Berhasil tanpa warning. |
| `pnpm typecheck` | Berhasil. |
| `pnpm test` | Berhasil: 7 unit test, 12 test/subtest database, 2 test pengaman integrasi, 7 test diagnostik dan startup CI, serta 1 smoke test HTTP lokal. |
| `pnpm build` | Berhasil dengan environment Supabase belum dikonfigurasi. |
| Smoke test HTTP | 16 rute/ikon publik merespons 200, 8 rute admin mengarahkan ke login, dan destinasi tidak dikenal merespons 404. |
| Pemeriksaan browser dasar | Katalog/search, keadaan peta kosong, dan error formulir kontak tanpa konfigurasi bekerja. Pada lebar 375, 768, dan 1280 px, lima halaman publik tidak menunjukkan overflow horizontal; label input/alt gambar dan menu responsif diperiksa secara dasar. |
| Integrasi Supabase lokal di GitHub Actions | Berhasil: 9 test/subtest menjalankan Auth, PostgREST, dan Storage pada stack Docker sementara. Pengujian mencakup akun dan role, RLS, RPC, status, metadata pemrosesan, GPS, upload, signed URL, sampul, dan penghapusan Storage. |

Test database memakai PostgreSQL terisolasi melalui PGlite, dengan fixture minimal untuk schema Auth dan Storage. Seluruh migration 001–007 dijalankan secara lokal, termasuk skenario upgrade data GPS lama dan pemeliharaan data pemrosesan historis. Test memeriksa RLS, role aktif/tidak aktif, pembatasan data pengunjung, RPC, constraint/foreign key, transisi status, atribusi GPS, dan kebijakan media. Test ini terpisah dari integrasi layanan Supabase lokal dan bukan uji deployment hosted.

Job integrasi menjalankan Supabase CLI 3.0.0 pada runner sementara, menerapkan migration, dan membuat akun acak melalui Auth lokal. Kegagalan startup yang dikenali sebagai masalah kesiapan layanan atau koneksi dicoba ulang sekali setelah stack sementara dibersihkan, kecuali ada indikasi kesalahan migration, ruang disk, port, atau arsitektur image; kegagalan lain tetap menghentikan job. Diagnostik hanya menampilkan kategori aman, bukan log layanan mentah. URL, key, dan data uji berasal dari stack lokal; tidak ada kredensial hosted atau migration produksi yang digunakan. File status disimpan secara privat dan dibersihkan, dan test menolak proyek ter-link, endpoint selain `127.0.0.1`, serta redirect keluar. Uji hosted tetap diperlukan karena konfigurasi dan data proyek pemilik dapat berbeda.

Pada stack tersebut, test HTTP juga mengirim formulir Next.js dan memeriksa sesi login/logout, penolakan visitor/nonaktif, CRUD destinasi, upload/hapus/sampul media, penyimpanan dan verifikasi GPS, reservasi/kontak, serta perubahan status oleh staf. Test ini tidak menjalankan JavaScript browser, GPS perangkat, atau interaksi peta.

Unit test mencakup tanggal kalender, nomor WhatsApp, transisi status, kelengkapan metadata GPS, signature format gambar, dan pesan loading/error. Scan statis pada test database memastikan migration tidak memuat `DROP TABLE`, `TRUNCATE`, atau `DELETE FROM`; pemeriksaan ini tidak membuktikan setiap upgrade data aman tanpa tinjauan operator.

Smoke test otomatis menjalankan server Next.js lokal tanpa konfigurasi Supabase dan memeriksa redirect admin serta status 404 destinasi. Server test tidak memakai kredensial atau menyentuh database.

## Perbaikan integritas pemrosesan reservasi dan pesan

Migration `202611050007_visitor_processing_integrity.sql` mengganti kedua fungsi trigger tanpa mengubah baris historis, aturan transisi, RLS, atau grant kolom. Transisi valid menetapkan pemroses dari `auth.uid()` dan timestamp dari `now()` PostgreSQL; identitas lain, timestamp lampau/masa depan, dan nilai NULL dari client tidak dipercaya. Tanpa transisi, perubahan atau pengosongan `processed_by`/`processed_at` ditolak. Server Actions tidak lagi mengirim kedua kolom tersebut dan tetap memakai pemeriksaan status/versi untuk mencegah update kedaluwarsa.

Regression test PGlite dan PostgREST mencakup **kedua tabel**, Editor/Admin/Super Admin, pemalsuan identitas/waktu dengan atau tanpa transisi, pengosongan metadata, transisi tidak valid, metadata yang tidak berubah, catatan reservasi, kolom nonoperasional, serta penolakan anon/visitor/staf nonaktif. Test upgrade membandingkan seluruh baris sebelum/sesudah migration, termasuk timestamp historis dan metadata tidak lengkap. Penghapusan akun/profil pemroses ditolak agar foreign key lama `ON DELETE SET NULL` tidak menghilangkan atribusi; penonaktifan akun adalah jalur pencabutan akses.

Test HTTP Server Actions memeriksa status, catatan, atribusi dan waktu database setelah pemrosesan, serta memastikan submit kedaluwarsa tidak mengubah hasil. Integrasi hanya memakai stack lokal disposable pada runner, bukan proyek hosted atau produksi. Metadata ini menyimpan pemroses terakhir; `audit_logs` aplikasi tetap best effort, bukan riwayat transisi database yang lengkap.

## Perbaikan penting

- Tipe RPC sampul dan error TypeScript yang menghalangi build diperbaiki.
- Editor dapat mengedit konten destinasi terverifikasi, tetapi tidak dapat memalsukan review GPS; penyimpanan ulang titik kembali ke `pending`.
- Data GPS lama tanpa metadata review lengkap tidak menghasilkan marker publik.
- Validasi nomor WhatsApp dan tanggal diperketat; perubahan GPS, reservasi, dan pesan menolak versi formulir yang sudah kedaluwarsa.
- Kesalahan signed URL, pengaturan kontak, logout, dan pembersihan media tidak lagi disamarkan sebagai keberhasilan/data kosong.
- Metadata favicon yang mengarah ke file tidak tersedia diganti ikon yang tersedia; kontrol navigasi mempunyai atribut aksesibilitas.
- GitHub Actions menjalankan lint, typecheck, test, build, dan integrasi layanan Supabase lokal.

## Pembaruan antarmuka dan miniatur Selayar

Pembaruan ini menambahkan identitas UKM BAHASA Universitas Muhammadiyah Makassar di header/footer, logo lokal yang lebih menonjol, warna bagian yang dibedakan, tema siang/malam, serta Indonesia/English. Halaman publik, login, formulir, metadata, dan ekspor CSV mengikuti bahasa pilihan. Konten CMS baru tetap dalam bahasa penulis bila belum ada dalam katalog terjemahan.

Peta kini memakai miniatur Three.js bergaya diorama sebagai pilihan pertama dan satelit Leaflet sebagai pilihan kedua. Siluet geografis serta batas Desa Bontomarannu/Kecamatan Bontomanai berasal dari snapshot BIG Juni 2026. Status batas desa tetap **Batas Indikatif**; relief, pohon, dan rumah hanya ilustrasi. Tidak ada migration, perubahan data historis, atau koordinat destinasi baru yang dibuat oleh pembaruan UI.

| Pemeriksaan pembaruan UI | Hasil |
|---|---|
| `pnpm lint` | Berhasil tanpa warning ESLint. |
| `pnpm typecheck` | Berhasil. |
| `pnpm test:unit` | 20 test berhasil, termasuk katalog bahasa, logo, geometri/identitas BIG, urutan koordinat, serta kartu miniatur dengan dan tanpa GPS. |
| `pnpm test:db` | 21 test/subtest berhasil; aturan role, metadata pemrosesan, GPS, Storage, dan pemeliharaan data historis tetap berlaku. |
| `pnpm test:http` | 1 smoke test berhasil: 15 rute berbahasa Inggris, branding, cookie SSR, redirect admin, error/404, tiga logo lokal, dan keutuhan empat aset data/provenance. |
| `pnpm build` | Production build berhasil tanpa konfigurasi Supabase hosted. |
| Browser peta | Rotasi, zoom dengan rasio 0,8, putaran otomatis/berhenti, reset kamera, fokus desa, dan tampilan kepulauan bekerja pada scene WebGL sebenarnya. Satelit memuat citra dan tiga path batas administratif. |
| Tema, bahasa, dan posisi | Tema mengubah material tanpa mereset kamera; label/kontrol berubah bahasa. Posisi perangkat simulasi tetap tersedia antar-mode dan tidak menghasilkan pin destinasi; pengulangan lokasi tidak menggandakan label. |
| Responsive | 16 kombinasi kedua mode pada viewport browsing-context 320, 375, 768, dan 1440 px, dalam Indonesia/siang dan English/malam, tidak memiliki overflow horizontal. Ukuran judul kartu miniatur tetap 29 px. |
| Pemulihan | HTTP 503 aset wilayah menampilkan error dan retry berhasil. WebGL2 yang dinonaktifkan menawarkan satelit. Kehilangan konteks grafis menonaktifkan kontrol; retry mempertahankan kamera dengan satu canvas tanpa duplikasi label. |
| Supabase services | Berhasil di GitHub Actions: 9 test/subtest integrasi nyata pada stack sementara, termasuk Server Actions dan metadata pemrosesan kedua tabel pengunjung. Docker tidak tersedia pada host Windows ini; bukan pengujian proyek hosted. |

Commit implementasi `29b4efe42c840a09cbfaf455eea9da766e23092b` juga lulus kedua job pada [Quality checks #42050400265](https://github.com/ter-sleep/Desa-Wisata-Selayar/actions/runs/42050400265): lint, typecheck, production build, dan total **51 test** (20 unit + 21 database/config/startup + 1 HTTP + 9 integrasi Supabase), tanpa failure atau skip. Perubahan hanya dipush ke `feature/dewis-stage-6-baseline`; tidak ada perubahan `main`, merge PR, atau deployment oleh sesi ini.

Harness unit `tsx` pada proyek CommonJS menampilkan deprecation warning Three.js untuk pemuatan CommonJS; test tetap berhasil. Source renderer memakai import ES module dan production bundle Next.js berhasil. Tinjau kompatibilitas harness saat meningkatkan Three.js; warning ini tidak disembunyikan.

Pemeriksaan browser memakai data lokal dan posisi perangkat simulasi yang terisolasi, bukan mengukur GPS lapangan. Tidak ada fixture koordinat yang dimasukkan ke katalog produksi. Ini bukan benchmark FPS, audit aksesibilitas lengkap, atau uji perangkat mobile fisik. Pemilik masih perlu memastikan hak penggunaan logo/data, kebenaran konten CMS, dan konfigurasi hosted sebelum deployment.

## Masih memerlukan konfigurasi dan uji hosted

- Buat proyek Supabase nonproduksi, isi URL/Publishable key, terapkan migration yang belum ada, dan sediakan akun aktif untuk masing-masing role.
- Uji login/logout, CRUD, media, GPS perangkat/pin, reservasi/kontak, status, dan pengaturan kontak pada deployment yang memakai proyek nonproduksi tersebut.
- Uji akses API langsung untuk anon, visitor, Editor, Admin, dan Super Admin pada proyek hosted, termasuk kebijakan Storage dan masa berlaku signed URL.
- Periksa responsive pada perangkat nyata, keyboard/screen reader, seluruh loading/error state, performa jaringan, ukuran gambar, dan beban query dengan data nyata; belum ada benchmark atau pengujian perangkat lengkap.
- Pantau dukungan ESLint: versi 9 yang dipakai untuk pengembangan sudah tidak didukung upstream, sementara beberapa plugin dalam konfigurasi Next.js saat ini masih membatasi peer dependency sampai versi 9. Tingkatkan setelah kombinasi plugin mendukung ESLint 10.
- Tetapkan nomor/alamat resmi, bukti koordinat, hak penggunaan foto, kebijakan privasi/retensi, dan prosedur penghapusan. Tambahkan anti-abuse yang juga melindungi RPC langsung.
- Verifikasi deployment secara terpisah. Tidak ada migration produksi atau deployment yang dijalankan selama pemeriksaan lokal ini.
