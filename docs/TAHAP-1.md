# Tahap 1 — Persiapan dan Refactoring

## Perubahan yang dilakukan

1. Identitas package diubah menjadi `dewis-bontomarannu`; ditambahkan script `typecheck` dan `check`.
2. Persyaratan runtime Node.js dicatat (`>=20.9.0`) dan versi pengembangan disarankan melalui `.nvmrc` (22).
3. Build Next.js tidak lagi mengabaikan kesalahan TypeScript.
4. `.env.example` ditambahkan untuk persiapan Supabase dan `.gitignore` diperbaiki agar file contoh tetap terlacak.
5. README ditambahkan untuk instalasi, perintah pemeriksaan, struktur proyek, konfigurasi, dan catatan data.
6. Data destinasi diberi field koordinat opsional dan metadata katalog; seluruh koordinat awal tetap `null` karena belum ada bukti koordinat GPS terverifikasi dalam source.
7. Pusat Data menggunakan `slug` kanonis dari registry destinasi, bukan membuat slug dari nama tampilan.
8. Peta hanya menampilkan marker dari koordinat yang berstatus `verified`; peta menampilkan keterangan saat belum ada koordinat terverifikasi.
9. Template CSV inventaris GPS disediakan agar petugas dapat mencatat koordinat, akurasi, sumber, tanggal, dan petugas verifikasi.

## Belum dikerjakan pada tahap ini

- Membuat proyek dan tabel Supabase.
- Implementasi login, session, role, dan Row Level Security.
- Dashboard admin dan CRUD.
- Upload foto ke object storage.
- Alur reservasi dan pesan pengunjung.
- Mengisi koordinat GPS resmi hasil survei lapangan.

## Validasi

Jalankan `pnpm install`, `pnpm typecheck`, lalu `pnpm build` pada lingkungan yang memiliki akses registry paket. Jika ditemukan error TypeScript setelah build checks diaktifkan, perbaiki error tersebut sebelum melanjutkan ke Tahap 2.
