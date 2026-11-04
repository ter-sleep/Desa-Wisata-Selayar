# DEWIS — Tahap 4: Galeri dan Manajemen Foto

Tahap ini menambahkan pengelolaan dokumentasi foto yang terhubung dengan destinasi dan menayangkannya pada halaman publik.

## Fitur yang ditambahkan

- Upload satu foto per permintaan ke Supabase Storage.
- Format yang diterima: JPEG/JPG, PNG, WebP, dan AVIF.
- Batas ukuran aplikasi: 8 MiB per foto.
- Pemeriksaan MIME type dan magic bytes pada server, bukan hanya atribut `accept` di browser.
- Metadata: caption, alt text, kredit/sumber, urutan tampilan, status publikasi, ukuran file, MIME type, dan foto sampul.
- Maksimal satu foto sampul per destinasi melalui fungsi database yang mengunci baris destinasi.
- Galeri publik menampilkan hanya foto terbit dari destinasi terbit.
- Detail destinasi menampilkan dokumentasi terkait.
- Foto sampul media terbit menggantikan gambar lama pada kartu dan header detail destinasi.
- Menghapus media membersihkan metadata dan file Storage.
- Menghapus destinasi juga mencoba membersihkan file Storage anak sebelum menyelesaikan tindakan.
- Audit log untuk upload, perubahan metadata, dan penghapusan.

## Keamanan Storage

Migration Tahap 4 mengubah bucket `destination-media` dari public menjadi private. Ini penting karena pada bucket public, URL objek dapat dibaca tanpa melewati RLS untuk operasi pengambilan file. Bucket private memungkinkan akses berdasarkan Storage RLS atau signed URL terbatas waktu.

Kebijakan baca Storage:

- Pengunjung hanya boleh meminta signed URL jika baris `destination_media.is_published = true` dan destinasi berstatus `published`.
- Staf (`super_admin`, `admin`, `editor`) dapat membaca foto yang belum terbit dari dashboard.
- Upload dibatasi ke folder pertama berupa UUID destinasi yang ada.
- Upload, update, dan delete hanya untuk staf.

Signed URL yang dibuat aplikasi berlaku 1 jam. URL tersebut merupakan URL sementara, bukan URL publik permanen.

## File penting

- `supabase/migrations/202611040003_gallery_storage.sql`
- `lib/actions/media.ts`
- `lib/queries/media.ts`
- `components/admin/media-upload-form.tsx`
- `components/admin/delete-media-button.tsx`
- `app/admin/galeri/page.tsx`
- `app/galeri/page.tsx`
- `app/destinasi/[slug]/page.tsx`

## Urutan aktivasi

1. Gunakan source code ZIP Tahap 4 sebagai versi kerja terbaru.
2. Pastikan migration Tahap 2 dan Tahap 3 sudah dijalankan.
3. Jalankan `202611040003_gallery_storage.sql` pada Supabase SQL Editor.
4. Periksa bahwa bucket `destination-media` berstatus **Private**.
5. Jalankan `pnpm install` jika dependency belum ada.
6. Jalankan `pnpm typecheck`, `pnpm build`, lalu `pnpm dev`.
7. Login sebagai staf dan buka `/admin/galeri`.
8. Upload foto uji di bawah 8 MiB. Mulai dengan status Draft.
9. Pastikan foto Draft tidak muncul di `/galeri`, lalu ubah menjadi Published.
10. Jadikan foto sebagai sampul dan periksa kartu beranda serta halaman detail destinasi.
11. Uji hapus foto dan pastikan metadata serta objek Storage hilang.

## Catatan migrasi bucket

Perubahan bucket dari public ke private dapat membuat URL publik lama yang pernah disimpan di luar aplikasi tidak lagi dapat digunakan. Pada database DEWIS sebelumnya, foto eksternal lama disimpan pada `destinations.image_url`, bukan pada bucket `destination-media`; URL eksternal tersebut tetap menjadi fallback sampai ada foto cover baru yang dipublikasikan.

Jangan mengunggah foto yang tidak memiliki izin penggunaan. Isi kolom kredit/sumber secara eksplisit. Untuk konten yang memerlukan persetujuan pemilik atau masyarakat, tahan dalam status Draft sampai izin diperoleh.

## Keterbatasan saat ini

- Dashboard memuat maksimum 200 media terbaru; pagination dapat ditambahkan saat jumlah foto meningkat.
- Galeri publik menampilkan maksimum 120 foto.
- Upload dilakukan satu file per permintaan untuk menjaga ukuran request dan penanganan kegagalan tetap sederhana.
- Tidak ada resize/thumbnail otomatis. Untuk produksi dengan foto beresolusi besar, tahap optimasi gambar dapat ditambahkan.
- URL bertanda tangan berlaku 1 jam. Cache objek juga dibatasi 1 jam; halaman dirender dinamis agar URL baru dapat dibuat saat halaman diminta. Link yang sudah diterbitkan tidak bisa dicabut satu per satu dan mungkin masih dapat diakses melalui cache sampai masa cache berakhir. File yang sudah diunduh pengunjung tentu tidak dapat ditarik kembali.
- Migrasi Supabase dan uji integrasi nyata harus dilakukan di proyek Supabase milik pemilik website.
