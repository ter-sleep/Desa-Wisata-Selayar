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

## Perincian batas desa dan referensi Google Maps

Poligon BIG Desa Bontomarannu berbeda dari outline pada referensi Google Maps. Titik tempat pada link (`-6.089094, 120.5394232`) berada di dalam poligon BIG, tetapi bukan pusat viewport URL dan bukan geometri batas. Pencarian pembanding pada layanan BIG 2021 tidak menghasilkan desa yang cocok; OpenStreetMap/Nominatim memberikan titik, bukan poligon batas. Tidak ada tracing screenshot atau penggantian koordinat batas dengan perkiraan.

Penelusuran lanjutan menemukan poligon dengan kode `73.01.04.2008` pada [layanan BIG Administrasi_AR_KelDesa_10K](https://geoservices.big.go.id/rbi/rest/services/BATASWILAYAH/Administrasi_AR_KelDesa_10K/MapServer/0). Atribut sumbernya menyebut **Hasil Delineasi Batas Desa 2019**; poligon tersebut memiliki 148 posisi dan cakupan geografis yang hampir sama dengan snapshot 2026, tetapi tidak membuktikan batas definitif yang baru. Dua layer WFS Kemendagri yang tersedia pada pemeriksaan, [batas desa 2024 dan 2025](https://map.kemendagri.go.id/geoserver/ows?service=WFS&version=1.1.0&request=GetCapabilities), tidak mengembalikan rekaman untuk kode/nama desa maupun titik tempat pada referensi. Hasil ini hanya berlaku untuk layer dan kueri tersebut, bukan pernyataan bahwa data definitif tidak ada.

Sebagai pembanding tambahan, dua salinan ArcGIS berlabel [BPS/ITOS 2020](https://services1.arcgis.com/mLNdQKiKsj5Z5YMN/arcgis/rest/services/idn_adm_bps_20200401_shp/FeatureServer/6) memuat Bontomarannu di Bontomanai, Kepulauan Selayar, dengan kode BPS `ID7301042003`. Bentuknya berbeda di selatan: lintang paling selatan `-6.1035272`, dibanding `-6.095971` pada snapshot BIG 2026. Kode statistik BPS tidak disamakan dengan kode administrasi Kemendagri. Metadata salinan tidak mencantumkan lisensi atau asal secara lengkap, sedangkan unduhan arsip [HDX/OCHA](https://data.humdata.org/api/3/action/package_show?id=cod-ab-idn) dan layanan BPS tidak tersedia saat diperiksa; karena itu salinan ini belum digunakan sebagai pengganti batas BIG. Kueri OpenStreetMap pada area desa juga tidak menghasilkan relasi batas desa.

[Kecamatan Bontomanai Dalam Angka 2026](https://selayarkab.bps.go.id/id/publication/2026/09/28/cc652c8654e141bd67015f57/kecamatan-bontomanai-dalam-angka-2026.html), Tabel 1.1, mencatat luas Bontomarannu untuk 2025 sebesar 25,71 km² dengan sumber Bagian Pemerintah Setda Kabupaten Kepulauan Selayar; luas Bontokoraang dan Kaburu pada tabel tersebut ditandai tidak tersedia. Perhitungan perkiraan luas pada bola dari ring GeoJSON BIG yang dipakai aplikasi menghasilkan sekitar 13,96 km², sehingga kedua angka tidak dapat dianggap sama. Publikasi BPS tidak memberikan koordinat poligon pada tabel tersebut, dan perbedaan angka saja tidak memastikan bentuk mana yang benar atau menjelaskan sebab perbedaannya. Angka ini tidak dipakai untuk mengubah batas atau menafsirkan luas desa tetangga yang tidak tersedia.

[Perda Kabupaten Kepulauan Selayar No. 7 Tahun 2010](https://peraturan.bpk.go.id/Details/49065/perda-kab-selayar-no-7-tahun-2010) Pasal 9 menyebut Bontokoraang dimekarkan dari Bontomarannu dan berbatasan dengan Bontomarannu di utara. Teksnya merujuk peta lampiran, tetapi salinan sembilan halaman yang diperiksa di BPK berakhir pada penutup tanpa peta lampiran. [Perda No. 17 Tahun 2011](https://peraturan.bpk.go.id/Details/49018/perda-kab-selayar-no-17-tahun-2011) Pasal 3 menyebut Bontomarannu di timur Kaburu dan merujuk peta yang akan ditetapkan melalui keputusan bupati. Kedua keterangan ini menambah konteks identitas desa, bukan verifikasi koordinat atau keseluruhan batas. Kueri BIG edisi 2026 menunjukkan vertex bersama dengan Bontokoraang dan Kaburu, tetapi kesamaan sebagian vertex juga tidak membuktikan batas definitif. Rujukan ini tersedia pada peta dalam Indonesia dan English tanpa mengubah geometri.

[Peta RBI BIG Sulawesi 2024 skala 1:5.000](https://geoservices.big.go.id/portal/home/item.html?id=7222de46187848efa7512cc9aade7caf) juga tersedia melalui tautan pembanding pada kedua mode, terpusat di Bontomarannu. Peta dan label desa terlihat tanpa autentikasi pada pemeriksaan browser. Metadata menyebut kompilasi batas sampai Juli 2025, status segmen yang beragam, dan larangan menjadikan peta sebagai acuan pengambilan informasi pada skala yang lebih besar dari 1:5.000. Layer batas publiknya adalah layanan vector tile untuk tampilan, bukan poligon desa terverifikasi yang diimpor ke aplikasi. Layanan MapServer yang tercantum pada [dataset RBI Kepulauan Selayar](https://data.go.id/dataset/dataset/peta-rupabumi-indonesia-skala-1-5-000-kepulauan-selayar-tahun-2024) meminta token saat diperiksa; tidak ada autentikasi yang dihindari.

Pemeriksaan pembanding BIG lulus lint, typecheck, 26 unit test, 21 test database/config/startup, dan 1 smoke test HTTP. Browser memeriksa tautan pada miniatur Indonesia/siang dan satelit English/malam, serta lebar 320, 375, 768, dan 1440 px tanpa overflow horizontal. Kebijakan privasi menjelaskan bahwa peta BIG eksternal hanya dibuka ketika tautannya dipilih.

Pemeriksaan lokal panel rujukan lulus lint, typecheck, 25 unit test, 21 test database/config/startup, dan 1 smoke test HTTP. Browser memeriksa pembukaan panel pada miniatur Indonesia/siang dan satelit English/malam; panel terbuka tanpa overflow pada viewport 320, 375, 768, dan 1440 px. Kebijakan privasi menyebut tautan JDIH BPK yang dibuka hanya ketika dipilih.

Perubahan tampilan menambahkan isian transparan dan garis merah-putih dengan lebar layar tetap pada miniatur, mempertahankan seluruh vertex pada satelit, serta menyediakan tautan pembanding dan penjelasan perbedaan sumber. Kamera awal/Fokus desa menyesuaikan frustum ke seluruh batas pada rasio viewport yang berbeda dengan pandangan utara di atas. Batas kecamatan tetap dibedakan dengan garis putus-putus.

Uji browser pada scene Three.js sebenarnya memeriksa **381 vertex batas**, lebar garis 4 pixel, dan proyeksi kamera pada viewport 320, 375, 768, serta 1440 px: tidak ada vertex di luar frustum atau overflow horizontal. Satelit pada 375 dan 1440 px memuat tiga path batas, garis desa 4 pixel dengan pola `7 5`, serta 380 perintah M/L dan penutupan ring, tanpa overflow. Bahasa English/mode siang juga diperiksa: tautan dan keterangan sumber berubah bahasa, satu canvas miniatur tetap tampil, dan tidak ada overflow. Callback Leaflet diuji dengan input geometri langsung maupun Feature: `onEachFeature` menerima input asli, bukan selalu Feature.

`pnpm check` untuk perincian ini lulus lint, typecheck, production build, dan **45 test lokal** (23 unit + 21 database/config/startup + 1 HTTP), tanpa failure atau skip. Regression tambahan mencakup frustum batas di berbagai rasio viewport, pemisahan titik tempat Google Maps dari viewport/poligon/GPS destinasi, dan callback Leaflet tanpa mutasi input GeoJSON. Integrasi layanan Supabase nyata tetap dijalankan oleh workflow GitHub Actions, bukan proyek hosted.

Commit perincian `510aa36d72d6ac9178f0e4c472b728fb5be70706` lulus [Quality checks #42059989123](https://github.com/ter-sleep/Desa-Wisata-Selayar/actions/runs/42059989123), termasuk lint, typecheck, production build, dan **54 test** (45 lokal + 9 integrasi Supabase sementara), tanpa failure atau skip.

Bentuk batas masih menggunakan snapshot BIG Juni 2026 dengan status **Batas Indikatif**. Penggantian agar mengikuti bentuk lain memerlukan poligon resmi/terverifikasi dari desa atau pemerintah (GeoJSON, KML, atau SHP), provenance, dan status penetapannya. Link pembanding tidak menambah GPS destinasi atau mengubah data database/historis.

## Masih memerlukan konfigurasi dan uji hosted

- Buat proyek Supabase nonproduksi, isi URL/Publishable key, terapkan migration yang belum ada, dan sediakan akun aktif untuk masing-masing role.
- Uji login/logout, CRUD, media, GPS perangkat/pin, reservasi/kontak, status, dan pengaturan kontak pada deployment yang memakai proyek nonproduksi tersebut.
- Uji akses API langsung untuk anon, visitor, Editor, Admin, dan Super Admin pada proyek hosted, termasuk kebijakan Storage dan masa berlaku signed URL.
- Periksa responsive pada perangkat nyata, keyboard/screen reader, seluruh loading/error state, performa jaringan, ukuran gambar, dan beban query dengan data nyata; belum ada benchmark atau pengujian perangkat lengkap.
- Pantau dukungan ESLint: versi 9 yang dipakai untuk pengembangan sudah tidak didukung upstream, sementara beberapa plugin dalam konfigurasi Next.js saat ini masih membatasi peer dependency sampai versi 9. Tingkatkan setelah kombinasi plugin mendukung ESLint 10.
- Tetapkan nomor/alamat resmi, bukti koordinat, hak penggunaan foto, kebijakan privasi/retensi, dan prosedur penghapusan. Tambahkan anti-abuse yang juga melindungi RPC langsung.
- Verifikasi deployment secara terpisah. Tidak ada migration produksi atau deployment yang dijalankan selama pemeriksaan lokal ini.
