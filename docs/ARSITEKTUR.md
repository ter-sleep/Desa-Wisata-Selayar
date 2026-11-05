# Arsitektur DEWIS

## Alur dan batas kepercayaan

Next.js App Router merender halaman publik dan dashboard. Server Actions memvalidasi input dan memakai Supabase client berbasis cookie pengguna; Proxy memperbarui sesi, sedangkan layout dan setiap operasi sensitif memeriksa profil aktif di server. PostgreSQL tetap menerapkan izin SQL, RLS, constraint, dan trigger untuk permintaan langsung ke API, bukan hanya permintaan dari antarmuka.

- `app/` berisi rute publik, login, dan dashboard; `components/` menyediakan UI dan peta.
- `lib/actions/` berisi mutasi; `lib/queries/` membaca data; `lib/supabase/` membuat client browser/server.
- `lib/visitor-rules.ts`, `lib/gps-rules.ts`, dan `lib/media-rules.ts` memusatkan aturan yang dipakai UI/server.
- `supabase/migrations/` mendefinisikan tabel, relasi, RLS, Storage, dan RPC; `tests/` menguji aturan dan migration.

CI menguji migration dan API melalui stack Supabase lokal sementara, dengan Auth, PostgREST, dan Storage yang berjalan sebagai layanan sebenarnya. Akun uji dan kredensial berasal dari stack tersebut; runner tidak terhubung ke proyek hosted. Pengaman test menolak endpoint selain loopback IPv4, proyek yang ter-link, dan redirect ke luar origin lokal. File status stack mengandung kredensial lokal dan harus dirahasiakan serta dibersihkan.

Tanpa environment Supabase, katalog statis lama menjadi fallback tampilan; formulir tidak menyimpan data, login dinonaktifkan, dan tidak ada marker GPS yang dibuat dari perkiraan. Jika Supabase sudah dikonfigurasi tetapi query gagal, kesalahan tidak diperlakukan sebagai data kosong yang valid.

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

RLS tidak memberi pengunjung hak baca reservasi atau pesan. Trigger memastikan transisi status yang valid dan mencatat akun pemroses. Nomor WhatsApp baru divalidasi pada server dan database. Audit log aplikasi bersifat **best effort**: kegagalan insert dicatat pada log server dan tidak membatalkan operasi utama; perubahan langsung melalui API tidak otomatis menghasilkan entri audit yang setara.

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
