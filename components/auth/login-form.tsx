'use client'

import Link from 'next/link'
import { signIn } from '@/app/login/actions'

const errorMessages: Record<string, string> = {
  setup: 'Supabase belum dikonfigurasi. Isi variabel pada .env.local dan jalankan migration database.',
  'invalid-input': 'Masukkan email dan kata sandi.',
  'invalid-credentials': 'Email atau kata sandi tidak cocok.',
  unauthorized: 'Akun ini belum memiliki akses pengelola atau sedang dinonaktifkan.',
  'sign-out': 'Logout belum berhasil. Silakan coba kembali dari dashboard.',
}

export function LoginForm({ error, status, configured }: { error?: string; status?: string; configured: boolean }) {
  const message = error ? errorMessages[error] ?? 'Login tidak dapat diproses.' : null

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-brand" aria-label="Kembali ke beranda">
          <span className="brand-mark">B</span>
          <span>Bontomarannu<small>Desa Wisata · Selayar</small></span>
        </Link>

        <div className="auth-heading">
          <p className="eyebrow">AREA PENGELOLA</p>
          <h1>Masuk ke dashboard</h1>
          <p>Gunakan akun pengelola yang telah dibuat oleh Super Admin.</p>
        </div>

        {message && <div className="auth-alert" role="alert">{message}</div>}
        {status === 'signed-out' && <div className="auth-success" role="status">Anda telah keluar dari dashboard.</div>}

        {!configured ? (
          <div className="auth-setup-note">
            <strong>Konfigurasi belum tersedia.</strong>
            <p>Salin <code>.env.example</code> menjadi <code>.env.local</code>, lalu isi Project URL dan Publishable Key dari Supabase.</p>
          </div>
        ) : (
          <form action={signIn} className="auth-form">
            <label htmlFor="email">Email</label>
            <input id="email" name="email" type="email" autoComplete="username" placeholder="nama@email.com" required />

            <label htmlFor="password">Kata sandi</label>
            <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Masukkan kata sandi" required minLength={8} />

            <button type="submit" className="auth-submit">Masuk</button>
          </form>
        )}

        <Link href="/" className="auth-back">← Kembali ke website publik</Link>
      </section>
      <p className="auth-footnote">Akses terbatas untuk pengelola Desa Wisata Bontomarannu.</p>
    </main>
  )
}
