# Arsitektur DEWIS

## Alur dan batas kepercayaan

Next.js App Router merender halaman publik dan dashboard. Server Actions memvalidasi input dan memakai Supabase client berbasis cookie pengguna; Proxy memperbarui sesi, sedangkan layout dan setiap operasi sensitif memeriksa profil aktif di server. PostgreSQL tetap menerapkan izin SQL, RLS, constraint, dan trigger untuk permintaan langsung ke API, bukan hanya permintaan dari antarmuka.

- `app/` berisi rute publik, login, dan dashboard; `components/` menyediakan UI dan peta.
- `lib/actions/` berisi mutasi; `lib/queries/` membaca data; `lib/supabase/` membuat client browser/server.
- `lib/visitor-rules.ts`, `lib/gps-rules.ts`, dan `lib/media-rules.ts` memusatkan aturan yang dipakai UI/server.
- `supabase/migrations/` mendefinisikan tabel, relasi, RLS, Storage, dan RPC; `tests/` menguji aturan dan migration.

CI menguji migration dan API melalui stack Supabase lokal sementara, dengan Auth, PostgREST, dan Storage yang berjalan sebagai layanan sebenarnya. Akun uji dan kredensial berasal dari stack tersebut; runner tidak terhubung ke proyek hosted. Pengaman test menolak endpoint selain loopback IPv4, proyek yang ter-link, dan redirect ke luar origin lokal. File status stack mengandung kredensial lokal dan harus dirahasiakan serta dibersihkan.

Tanpa environment Supabase, katalog statis lama menjadi fallback tampilan; formulir tidak menyimpan data, login dinonaktifkan, dan tidak ada marker GPS yang dibuat dari perkiraan. Jika Supabase sudah dikonfigurasi tetapi query gagal, kesalahan tidak diperlakukan sebagai data kosong yang valid.

## Preferensi publik dan renderer peta

`lib/i18n.ts` menyediakan katalog Indonesia/English bertipe dan terjemahan exact-match untuk teks editorial. `lib/site-preferences.ts` membaca cookie di server, sedangkan `components/site-preferences.tsx` menyinkronkan bahasa, tema, dan atribut dokumen di client. Cookie `dewis-language` dan `dewis-theme` dibatasi ke nilai yang didukung, berlaku satu tahun, `SameSite=Lax`, serta `Secure` pada HTTPS. Tema tanpa pilihan eksplisit mengikuti sistem. Root layout menginisialisasi tema sebelum hidrasi; halaman 404 tetap memakai translator server agar konten pemulihan hadir dalam respons HTTP awal.

Pergantian bahasa tidak mengubah rute. Konten CMS yang tidak dikenali katalog tetap dalam bahasa penulis; aplikasi tidak mengirim teks ke layanan terjemahan. Dashboard operasional tidak diterjemahkan secara menyeluruh, sementara halaman publik dan login mendukung kedua bahasa.

`lib/map-data.ts` menyaring DTO destinasi menjadi titik publik terverifikasi, menyediakan filter, Haversine, dan URL petunjuk arah bersama. `components/tourism-map.tsx` mempertahankan pencarian, kategori, seleksi, serta posisi perangkat di antara kedua mode. Target kamera terpisah dari posisi perangkat sehingga memilih destinasi tidak menghilangkan jarak.

`lib/tourism-geography.ts` memuat snapshot GeoJSON lokal dan memvalidasi identitas/kode wilayah serta geometri. GeoJSON memakai urutan longitude/latitude; posisi aplikasi memakai latitude/longitude; proyeksi miniatur memakai timur sebagai X dan utara sebagai Z negatif. Snapshot tidak membuat koordinat destinasi dan tidak mengubah tabel database. Batas Desa Bontomarannu bersifat indikatif; batas kecamatan berasal dari Bontomanai. Provenance dan ketentuan pemakaian dicatat di `public/maps/sources.json`.

`components/satellite-map.tsx` memakai Leaflet, tile Esri/OpenStreetMap, dan dua geometri batas administratif. `components/miniature-map.tsx` dimuat secara lazy dan mengelola lifecycle `lib/miniature-scene.ts`: Three.js/OrbitControls, siluet geografis, relief/vegetasi/bangunan ilustratif, serta label HTML yang aksesibel. Pin dan tindakan koordinat hanya berasal dari titik terverifikasi; label pusat wilayah bukan pin wisata.

Tema dan bahasa diperbarui tanpa membangun ulang kamera miniatur. Observer menghentikan animasi di luar viewport. Cleanup melepaskan kontrol, observer, buffer, material, tekstur, shadow, konteks WebGL, serta label; retry setelah kehilangan konteks mempertahankan kamera. Kegagalan geometri, sumber data, citra, atau WebGL memiliki pesan pemulihan yang eksplisit. Lokasi pengunjung hanya berada di memori browser, tetapi tile satelit dapat mengungkap area viewport kepada penyedia; tautan petunjuk arah membuka Google Maps atas pilihan pengunjung.

## Autentikasi dan role

Profil baru dari Auth dimulai sebagai `visitor`. Akun harus aktif dan memiliki role staf untuk masuk ke dashboard. Akun awal dibuat oleh pemilik dan dipromosikan secara eksplisit sesuai `docs/TAHAP-2.md`; aplikasi belum menyediakan UI manajemen role.

| Operasi | Super Admin | Admin | Editor | Visitor/anon |
|---|---|---|---|---|
| Baca konten publik terbit | Ya | Ya | Ya | Ya |
| Buat/edit destinasi dan media | Ya | Ya | Ya | Tidak |
| Hapus destinasi | Ya | Ya | Tidak | Tidak |
| Usulkan/ubah GPS | Ya | Ya | Ya | Tidak |
| Verifikasi/tolak GPS | Ya | Ya | Tidak | Tidak |
| Baca/proses reservasi dan pesan | Ya | Ya | Ya | Tidak |
| Ubah kontak publik | Ya | Ya | Tidak | Tidak |
| Ubah role/status profil | Ya | Tidak | Tidak | Tidak |
| Kirim reservasi/kontak melalui RPC | Ya | Ya | Ya | Ya |

RLS tidak memberi pengunjung hak baca reservasi atau pesan. Sejak migration 007, kedua trigger memastikan transisi status yang valid lalu menetapkan `processed_by` dari `auth.uid()` dan `processed_at` dari `now()` PostgreSQL, bukan payload client. Transisi tanpa identitas terautentikasi ditolak. Metadata tersebut tidak dapat diubah atau dikosongkan jika status tidak berubah; perubahan catatan reservasi tetap diizinkan. Server Actions hanya mengirim status/catatan dan mempertahankan pemeriksaan versi `updated_at`.

Migration 007 hanya mengganti fungsi trigger yang sudah terpasang, tanpa backfill, perubahan RLS/grant, atau perubahan baris historis. Karena foreign key pemroses sebelumnya memakai `ON DELETE SET NULL`, penghapusan profil pemroses kini ditolak oleh pengaman metadata; nonaktifkan akun staf dengan `is_active = false` untuk mencabut akses tanpa kehilangan atribusi.

Nomor WhatsApp baru divalidasi pada server dan database. Audit log aplikasi bersifat **best effort**: kegagalan insert dicatat pada log server dan tidak membatalkan operasi utama; perubahan langsung melalui API tidak otomatis menghasilkan entri audit yang setara. Perbaikan ini mengamankan metadata pemrosesan terakhir, bukan menambahkan riwayat setiap transisi.

## Storage, GPS, dan data pengunjung

Bucket `destination-media` privat. Staf mengelola media; pengunjung hanya mendapat akses untuk foto terbit pada destinasi terbit. Signed URL berlaku satu jam dan dapat tetap berlaku setelah publikasi dibatalkan hingga kedaluwarsa. Metadata atau objek yang gagal dibersihkan dilaporkan untuk penanganan operator. Upload dibatasi 8 MiB dan diperiksa MIME serta signature dasarnya; belum ada pemindaian malware atau konversi gambar.

Marker publik hanya dibuat untuk destinasi terbit dengan koordinat, status `verified`, dan identitas/waktu verifikasi serta review yang lengkap. Setiap penyimpanan ulang koordinat mengembalikan status ke `pending`. Titik awal tampilan peta admin hanyalah pusat viewport, tidak otomatis disimpan sebagai koordinat destinasi.

Formulir GPS, reservasi, dan pesan membawa `updated_at` yang dilihat pengelola. Server menolak perubahan jika data telah diperbarui, termasuk saat perubahan terjadi bersamaan dengan penyimpanan. Perubahan langsung melalui API harus menerapkan pemeriksaan versi sendiri.

Reservasi dibuat `pending` dan memperoleh kode booking; konfirmasi dilakukan manual. Pesan kontak dan reservasi tidak mendukung pembayaran, notifikasi otomatis, atau penentuan kapasitas. Honeypot Server Action bukan perlindungan terhadap pemanggilan RPC langsung: proteksi anti-abuse dan kebijakan retensi masih harus ditentukan dan diterapkan sebelum peluncuran.

## Data GPS lama

Migration 004 yang belum diterapkan menyalin `verified_at`/`verified_by` ke kolom review hanya jika nilai sumber memang ada. Baris lama yang tidak lengkap tidak dihapus atau diberi identitas fiktif. Constraint review dipasang `NOT VALID` dan dicoba divalidasi; jika masih ada baris lama yang tidak cocok, migration memberikan peringatan dan validasi perlu diselesaikan setelah review. Marker dari baris `verified` yang belum lengkap tidak ditampilkan aplikasi.

Pada lingkungan Supabase yang diizinkan, operator dapat memeriksa status constraint dan kandidat data:

```sql
select convalidated
from pg_constraint
where conrelid = 'public.destinations'::regclass
  and conname = 'destinations_verification_review_check';

select id, slug, verification_status
from public.destinations
where (verification_status = 'verified' and
       (latitude is null or longitude is null or verified_at is null or verified_by is null
        or reviewed_at is null or reviewed_by is null))
   or (verification_status = 'rejected' and (reviewed_at is null or reviewed_by is null))
   or (verification_status = 'pending' and (verified_at is not null or verified_by is not null));
```

Admin harus meninjau setiap baris berdasarkan bukti sebenarnya. Setelah semua baris sesuai dan pemilik menyetujui perubahan, operator dapat menjalankan `alter table public.destinations validate constraint destinations_verification_review_check;`. Jangan mengubah data produksi tanpa otorisasi. Database yang sudah menerapkan 004 tidak perlu menjalankannya ulang; terapkan 006 sesuai riwayat migration.
