# DEWIS — Tahap 2: Database dan Autentikasi

Tahap ini menyiapkan integrasi Supabase untuk aplikasi Next.js 16 App Router.

> Dokumen ini menjelaskan fondasi Tahap 2. Kondisi akhir memerlukan seluruh migration 001–007: bucket menjadi privat pada 003, reservasi/kontak publik memakai RPC sejak 005, dan metadata pemrosesan ditetapkan database sejak 007. Lihat README untuk urutan terkini.

## Yang ditambahkan

- `@supabase/supabase-js` dan `@supabase/ssr` pada `package.json`.
- Browser client, server client, dan Proxy untuk penyegaran sesi berbasis cookie.
- Halaman login `/login` menggunakan email dan password.
- Server Action untuk login dan logout.
- Pemeriksaan klaim sesi, profil, status aktif, dan role pada server.
- Area `/admin` yang hanya bisa dibuka oleh `super_admin`, `admin`, dan `editor`.
- Dashboard awal yang membaca jumlah destinasi, media, reservasi, dan pesan.
- Migration PostgreSQL, RLS, helper role, trigger profil, indeks, dan bucket Storage.

## 1. Instal dependensi

Pada folder proyek, jalankan:

```bash
pnpm install --frozen-lockfile
```

Lockfile sudah mencakup dependency Supabase. Gunakan Node.js 22+ dan pnpm versi pada `package.json`.

## 2. Buat proyek Supabase

1. Buka https://supabase.com/dashboard.
2. Buat proyek baru dan simpan password database di tempat yang aman.
3. Buka **Project Settings → API** (atau panel **Connect** pada dashboard proyek).
4. Salin **Project URL** dan **Publishable key**.
5. Pada root proyek, salin `.env.example` menjadi `.env.local`.
6. Isi nilai berikut:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxxxxxx
```

Publishable key boleh digunakan oleh aplikasi browser karena semua akses tabel dibatasi oleh RLS. Jangan menaruh `service_role` atau secret key pada variabel `NEXT_PUBLIC_`.

## 3. Terapkan migration database

1. Pada Supabase Dashboard, buka **SQL Editor**.
2. Pilih **New query**.
3. Buka file `supabase/migrations/202611040001_initial_schema.sql` dari proyek ini.
4. Salin seluruh isi file ke SQL Editor.
5. Jalankan sekali pada proyek Supabase yang masih baru.

Migration membuat tabel:

- `profiles`
- `destinations`
- `destination_media`
- `reservations`
- `contact_messages`
- `site_settings`
- `audit_logs`

Migration juga membuat enum `app_role`, trigger pembuat profil otomatis ketika akun Auth dibuat, fungsi pembaca role yang aman untuk RLS, kebijakan RLS, indeks, dan bucket Storage `destination-media`.

Jalankan verifikasi berikut pada SQL Editor setelah migration:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'profiles', 'destinations', 'destination_media', 'reservations',
    'contact_messages', 'site_settings', 'audit_logs'
  )
order by table_name;

select id, name, public, file_size_limit
from storage.buckets
where id = 'destination-media';
```

Hasil yang diharapkan adalah tujuh tabel dan satu bucket `destination-media`.

## 4. Siapkan akun Super Admin pertama

Registrasi publik sebaiknya dinonaktifkan. Akun pengelola dibuat secara terkontrol dari Supabase Dashboard.

1. Buka **Authentication → Users**.
2. Pilih **Add user** dan buat akun email/password untuk pengelola utama.
3. Salin UUID pengguna yang baru dibuat.
4. Di SQL Editor, jalankan perintah berikut dengan UUID yang benar:

```sql
update public.profiles
set role = 'super_admin',
    is_active = true,
    full_name = 'Nama Pengelola Utama'
where id = 'GANTI_DENGAN_UUID_AUTH_USER';
```

Trigger migration seharusnya membuat baris `profiles` dengan role awal `visitor`. Query di atas mempromosikan satu akun yang dipilih secara eksplisit. Jangan mempromosikan semua akun.

Role yang disediakan:

| Role | Kewenangan dasar |
|---|---|
| `super_admin` | Pengelolaan seluruh sistem, role, dan pengaturan |
| `admin` | Pengelolaan operasional dan data pengelola |
| `editor` | Pengelolaan konten destinasi dan media serta pemrosesan pesan/reservasi |
| `visitor` | Tidak memperoleh akses dashboard |

Setelah itu buka `/login` pada website dan masuk menggunakan akun tersebut.

## 5. Jalankan aplikasi

```bash
pnpm dev
```

Alamat lokal:

- Website publik: http://localhost:3000
- Login pengelola: http://localhost:3000/login
- Dashboard: http://localhost:3000/admin

Pemeriksaan kode:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## 6. Pemeriksaan keamanan dasar

- Pastikan registrasi publik tidak dibuka untuk umum.
- Pastikan hanya akun yang ditentukan menjadi `super_admin`, `admin`, atau `editor`.
- Coba akses `/admin` dalam keadaan logout; seharusnya diarahkan ke `/login`.
- Login dengan akun `visitor`; akun harus ditolak dari dashboard.
- Coba baca tabel `reservations` sebagai `anon`; operasi select harus ditolak/tidak mengembalikan data.
- Uji RPC reservasi publik setelah migration 005–006; insert tabel langsung harus ditolak dan status awal harus `pending`.
- Uji pembacaan destinasi sebagai `anon`; hanya baris `publication_status = 'published'` yang terlihat.
- Pastikan `.env.local` tidak masuk ke Git.

## Catatan keamanan dan batasan

- Kunci `service_role` sengaja tidak digunakan. Aplikasi menggunakan publishable key dan RLS.
- Migration 001 semula membuat bucket public; migration 003 menjadikannya private dan membatasi akses media terbit. Jangan menyimpan dokumen identitas, file internal, atau media rahasia pada bucket ini.
- Formulir reservasi dan kontak sudah mempunyai batasan kolom serta status awal di database, tetapi proteksi anti-spam/rate-limit dan CAPTCHA belum dibuat. Itu perlu ditambahkan sebelum website dibuka untuk trafik publik.
- Tahap ini belum mengimplementasikan UI CRUD destinasi, upload gambar, pengelolaan reservasi, maupun manajemen role dari dashboard. Hal tersebut masuk tahap pengembangan fitur berikutnya.
- Data destinasi statis belum otomatis dimigrasikan. Pemindahan data dilakukan setelah field dan data sumber diperiksa pada Tahap 3 agar konten yang belum terverifikasi tidak ikut dipublikasikan.
- Kredensial Supabase tidak disertakan pada ZIP. Pengujian koneksi real membutuhkan Project URL dan Publishable key milik pemilik proyek.
