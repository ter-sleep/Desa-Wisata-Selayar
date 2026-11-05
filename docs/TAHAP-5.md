# DEWIS — Tahap 5: Manajemen Koordinat GPS dan Peta Wisata

Tahap ini menambahkan alur pencatatan titik geografis destinasi, pemeriksaan administratif, dan pemanfaatan koordinat terverifikasi pada peta publik.

## Fitur yang ditambahkan

- Daftar seluruh destinasi pada `/admin/peta` dengan ringkasan koordinat, metode, akurasi, status verifikasi, dan status publikasi.
- Halaman detail GPS pada `/admin/peta/[id]`.
- Pengambilan koordinat melalui Geolocation API setelah petugas menekan tombol **Gunakan GPS perangkat**.
- Pemilihan koordinat manual dengan klik pada peta OpenStreetMap.
- Input latitude/longitude manual dan pemilihan sumber: GPS perangkat, pin peta, atau referensi eksternal.
- Pencatatan akurasi GPS (meter), metode, sumber/catatan, waktu pengambilan, dan pengelola yang mencatat.
- Setiap penyimpanan ulang atau perubahan koordinat otomatis mengembalikan status verifikasi ke `pending`.
- Hanya Admin dan Super Admin dapat memverifikasi atau menolak koordinat; Editor hanya dapat mengusulkan/memperbarui koordinat.
- Trigger PostgreSQL mencegah Editor mengubah status/metadata verifikasi melalui REST API langsung, baik pada INSERT maupun UPDATE.
- Audit log untuk pembaruan, verifikasi, penolakan, dan penghapusan koordinat.
- Peta publik hanya menampilkan destinasi yang berstatus `published` serta memiliki koordinat `verified`.
- Informasi akurasi dan sumber ditampilkan pada popup marker.
- Tombol lokasi pengunjung memerlukan persetujuan eksplisit browser. Lokasi pengunjung tidak dikirim ke database.
- Perhitungan jarak garis lurus (Haversine) dari posisi perangkat ke destinasi dan tautan petunjuk arah Google Maps.

## Metadata database tambahan

Migration `202611040004_gps_management.sql` menambahkan:

- `coordinate_method`: `device_gps`, `map_pin`, atau `external_reference`.
- `coordinate_captured_at`: waktu titik direkam.
- `coordinate_updated_by`: pengguna yang mencatat koordinat.
- `verification_note`: catatan pemeriksa.
- `reviewed_at` dan `reviewed_by`: jejak pemeriksaan terakhir, termasuk keputusan ditolak.

Kolom lama `latitude`, `longitude`, `gps_accuracy_m`, `coordinate_source`, `verification_status`, `verified_at`, dan `verified_by` tetap digunakan.

## Keamanan dan aturan verifikasi

1. Latitude harus berada pada rentang -90 sampai 90.
2. Longitude harus berada pada rentang -180 sampai 180.
3. Latitude dan longitude harus diisi berpasangan.
4. Akurasi GPS harus berada pada rentang 0–100.000 meter jika dicatat.
5. Sumber koordinat wajib diisi.
6. Setiap perubahan nilai koordinat, akurasi, metode, atau sumber akan mengatur status menjadi `pending`, mencatat waktu perubahan di database, mencatat akun yang sedang login, dan menghapus jejak verifikasi lama.
7. Status `verified` hanya dapat ditetapkan Admin atau Super Admin dan wajib memiliki catatan waktu serta identitas pemeriksa.
8. Status GPS `verified` saja belum cukup untuk tampil di peta publik: destinasi juga harus `published`, dan identitas serta waktu verifikasi/pemeriksaan harus lengkap.
9. Migration 006 memperbaiki agar Editor tetap dapat mengedit konten biasa pada destinasi terverifikasi dan atribusi pemeriksa ditetapkan dari akun Admin yang aktif.

## Pusat tampilan peta picker

Peta pemilih koordinat menggunakan pusat tampilan awal perkiraan Desa Bontomarannu (`-6.07902, 120.52937`) hanya untuk memudahkan orientasi awal. Nilai ini bukan koordinat destinasi, tidak dipersistenkan ke database, dan bukan pengganti survei lapangan. Rujukan publik: [Katapedia](https://blog.stkippgribl.ac.id/Katapedia/wiki/Bontomarannu%2C_Bontomanai%2C_Kepulauan_Selayar) dan [Kodepos.co.id](https://kodepos.co.id/kodepos/sulawesi-selatan/kabupaten-kepulauan-selayar/bontomanai/bontomarannu) memuat estimasi titik administratif yang sedikit berbeda; karena itu pusat peta hanya berfungsi sebagai area orientasi, bukan titik destinasi yang tervalidasi.

## Urutan aktivasi

1. Gunakan ZIP Tahap 5 sebagai folder kerja terbaru.
2. Pastikan migration Tahap 2 dan Tahap 3 telah dijalankan.
3. Pastikan migration Tahap 4 sudah dijalankan jika menggunakan galeri.
4. Jalankan `supabase/migrations/202611040004_gps_management.sql` pada Supabase SQL Editor.
5. Jalankan migration yang tersisa hingga 006, lalu `pnpm install --frozen-lockfile`.
6. Jalankan `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, lalu `pnpm dev`.
7. Login sebagai staf dan buka `/admin/peta`.
8. Buka salah satu destinasi, pilih koordinat melalui GPS perangkat saat berada di lokasi atau pin peta, lengkapi sumber koordinat, kemudian simpan.
9. Login sebagai Admin/Super Admin untuk memeriksa koordinat dan memberi catatan minimal 5 karakter.
10. Setelah diverifikasi, pastikan destinasi berstatus `published`; barulah marker terlihat pada `/peta`.
11. Uji tombol **Lokasi saya** di peta publik dan periksa tautan petunjuk arah.

## Pengujian yang disarankan

- Tolak input latitude di luar -90..90 dan longitude di luar -180..180.
- Tolak jika salah satu koordinat kosong.
- Tolak akurasi negatif atau lebih dari 100.000 meter.
- Pastikan Editor dapat menyimpan titik tetapi tidak dapat memverifikasi melalui UI maupun update langsung.
- Pastikan perubahan koordinat setelah status verified otomatis menjadi pending.
- Pastikan koordinat pending/rejected tidak menjadi marker publik.
- Pastikan koordinat verified pada destinasi draft/archived tidak menjadi marker publik.
- Pastikan koordinat verified pada destinasi published menjadi marker publik.
- Pastikan lokasi pengunjung hanya dipakai di browser dan tidak tersimpan di database.

## Catatan akurasi dan keterbatasan

- Browser Geolocation API mensyaratkan secure context (HTTPS atau localhost) dan izin pengguna.
- Akurasi yang dilaporkan perangkat merupakan estimasi perangkat, bukan jaminan titik tepat di objek wisata. Lakukan pengukuran di lokasi dan ulangi pengambilan bila akurasi buruk.
- Pemilihan pin manual tidak menghasilkan nilai akurasi; kolom akurasi dibiarkan kosong.
- Jarak pada kartu publik dihitung sebagai jarak garis lurus, bukan jarak jalan, waktu tempuh, atau rute navigasi.
- Petunjuk arah dibuka melalui Google Maps; aplikasi ini belum menghitung rute atau ETA di dalam website.
- Peta dasar memakai tile OpenStreetMap serta citra Esri pada peta publik. Perhatikan atribusi dan ketentuan penggunaan tile masing-masing penyedia saat deployment.
- Migration, build lengkap, dan koneksi Supabase harus diuji pada proyek Supabase serta lingkungan Node.js milik pemilik website.
