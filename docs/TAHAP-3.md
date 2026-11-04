# DEWIS — Tahap 3: CRUD Destinasi dan Integrasi Data

Tahap ini menghubungkan katalog destinasi lama dengan PostgreSQL dan menambahkan modul pengelolaan destinasi pada dashboard.

## 1. Yang ditambahkan

- Halaman admin `/admin/destinasi` untuk membaca seluruh destinasi.
- Form tambah `/admin/destinasi/baru`.
- Form edit `/admin/destinasi/[id]/edit`.
- Server Actions untuk create, update, dan delete.
- Kolom `sort_order` untuk mengatur urutan tampilan katalog secara konsisten.
- Validasi sisi server untuk nama, slug, kategori, deskripsi, URL gambar, tahun, detail, dan status publikasi.
- Pembatasan penghapusan untuk `super_admin` dan `admin`; editor tidak mendapat tombol hapus.
- Penghapusan destinasi dengan reservasi terkait ditolak oleh foreign key `ON DELETE RESTRICT`; arsipkan sebagai gantinya.
- Audit log untuk operasi tambah, edit, dan hapus (best-effort, tidak membatalkan perubahan utama).
- Halaman beranda, direktori, detail, peta, dan Pusat Data membaca data publik dari Supabase jika konfigurasi tersedia.
- Data statis lama dipakai sebagai fallback hanya selama Supabase belum dikonfigurasi.
- Migration seed untuk memindahkan enam entri katalog lama ke database.
- Status GPS semua entri hasil seed tetap `pending`; tidak ada koordinat buatan.

## 2. Urutan migration

Pada proyek Supabase yang sudah menerapkan Tahap 2:

1. Buka Supabase Dashboard → SQL Editor.
2. Buka file `supabase/migrations/202611040002_seed_existing_destinations.sql`.
3. Salin seluruh SQL dan jalankan satu kali.
4. Periksa bahwa enam entri awal tersedia:

```sql
select slug, name, publication_status, verification_status, latitude, longitude
from public.destinations
order by name;
```

Semua entri seed disetel `publication_status = 'published'` agar konten yang sebelumnya tampil dari data statis tetap tersedia pada website publik. `verification_status` tetap `pending`, sementara `latitude` dan `longitude` tetap `NULL` sampai diverifikasi.

Migration menggunakan `ON CONFLICT (slug) DO NOTHING`, sehingga tidak menimpa data destinasi yang mungkin sudah diedit pengelola.

Jika database belum menerapkan Tahap 2, jalankan migration secara berurutan:

1. `202611040001_initial_schema.sql`
2. `202611040002_seed_existing_destinations.sql`

## 3. Hak akses modul destinasi

| Operasi | Super Admin | Admin | Editor |
|---|---:|---:|---:|
| Lihat seluruh destinasi di admin | Ya | Ya | Ya |
| Tambah destinasi | Ya | Ya | Ya |
| Edit informasi | Ya | Ya | Ya |
| Ubah status publikasi | Ya | Ya | Ya |
| Hapus destinasi | Ya | Ya | Tidak |

Aturan ini diterapkan pada antarmuka dan diperiksa ulang oleh RLS di database. Jangan mengandalkan tombol yang disembunyikan sebagai pengamanan tunggal.

## 4. Form destinasi

Field yang dikelola pada Tahap 3:

- Nama, slug, kategori, eyebrow, deskripsi.
- URL gambar utama.
- Status informasi, tahun pembaruan.
- Sumber data dan status kesiapan data.
- Daftar detail/dayatarik.
- Status publikasi `draft`, `published`, atau `archived`.

Koordinat GPS sengaja tidak dimasukkan ke form ini. Data koordinat akan dikelola pada Tahap 5 dengan alur verifikasi khusus.

Untuk gambar, tahap ini menerima URL HTTP(S) atau path lokal. Upload gambar langsung ke Supabase Storage merupakan lingkup Tahap 4.

## 5. Halaman publik yang terhubung

- `/` — menampilkan tiga destinasi teratas dari database.
- `/destinasi` — direktori semua destinasi berstatus `published`.
- `/destinasi/[slug]` — detail berdasarkan slug database.
- `/peta` — hanya menampilkan destinasi yang koordinatnya `verified` dan lengkap.
- `/pusat-data` — daftar dan ringkasan dinamis, serta unduhan CSV untuk hasil filter aktif.

Ketika `.env.local` belum dikonfigurasi, halaman menggunakan katalog fallback lama agar desain tetap dapat dijalankan secara lokal. Setelah Supabase dikonfigurasi, database menjadi sumber data utama. Pastikan kedua migration telah dijalankan sebelum mengaktifkan konfigurasi Supabase pada deployment.

## 6. Uji fungsional yang perlu dilakukan

1. Login memakai akun `super_admin`.
2. Buka `/admin/destinasi`; enam entri seed seharusnya tampil.
3. Tambahkan destinasi baru sebagai `draft`; pastikan belum tampil pada halaman publik.
4. Edit destinasi dan ubah status menjadi `published`; pastikan tampil di `/destinasi`.
5. Ubah menjadi `archived`; pastikan tidak lagi muncul di katalog publik.
6. Coba login menggunakan role `editor`; tombol hapus tidak boleh terlihat.
7. Coba hapus destinasi yang belum memiliki reservasi menggunakan admin; operasi harus berhasil.
8. Coba hapus destinasi yang memiliki reservasi; database harus menolak dan menampilkan instruksi untuk mengarsipkan.
9. Isi slug yang sama dengan destinasi lain; formulir harus menampilkan pesan bahwa slug sudah digunakan.
10. Periksa `/peta`; marker tetap kosong sampai koordinat yang benar diverifikasi.

## 7. Pemeriksaan kode

```bash
corepack pnpm typecheck
corepack pnpm build
```

Pada lingkungan pengerjaan, semua 39 file TS/TSX berhasil diparse tanpa kesalahan sintaks. Build/typecheck penuh belum dapat dijalankan karena `node_modules` tidak tersedia dan Corepack tidak dapat mengunduh pnpm dari registry dalam lingkungan tersebut.

## 8. Batasan yang masih ada

- Upload foto dari komputer belum tersedia; dikerjakan pada Tahap 4.
- Pengelolaan koordinat dan verifikasi GPS belum tersedia; dikerjakan pada Tahap 5.
- Tidak ada pemeriksaan ketersediaan tanggal/kuota reservasi pada tahap ini.
- Validasi URL gambar tidak memverifikasi bahwa URL benar-benar mengarah ke file gambar; operator perlu mengecek gambar sampai modul upload tersedia.
- Proteksi anti-spam/rate limit untuk form publik belum dibangun.
