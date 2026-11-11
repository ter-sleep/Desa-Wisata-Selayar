'use client'

import Link from 'next/link'
import { signIn } from '@/app/login/actions'
import { useSitePreferences } from '@/components/site-preferences'
import type { Message } from '@/lib/i18n'

const errorMessages: Record<string, Message> = {
  setup: 'Supabase belum dikonfigurasi. Isi variabel pada .env.local dan jalankan migration database.',
  'invalid-input': 'Masukkan email dan kata sandi.',
  'invalid-credentials': 'Email atau kata sandi tidak cocok.',
  unauthorized: 'Akun ini belum memiliki akses pengelola atau sedang dinonaktifkan.',
  'sign-out': 'Logout belum berhasil. Silakan coba kembali dari dashboard.',
}

export function LoginForm({ error, status, configured }: { error?: string; status?: string; configured: boolean }) {
  const { t } = useSitePreferences()
  const message = error ? errorMessages[error] ?? 'Login tidak dapat diproses.' : null

  return (
    <main className="auth-page">
      <section className="auth-card">
        <Link href="/" className="auth-brand" aria-label={t('Kembali ke beranda')}>
          <span className="brand-mark">B</span>
          <span>Bontomarannu<small>{t('Desa Wisata · Selayar')}</small></span>
        </Link>

        <div className="auth-heading">
          <p className="eyebrow">{t('Area pengelola')}</p>
          <h1>{t('Masuk ke dashboard')}</h1>
          <p>{t('Gunakan akun pengelola yang telah dibuat oleh Super Admin.')}</p>
        </div>

        {message && <div className="auth-alert" role="alert">{t(message)}</div>}
        {status === 'signed-out' && <div className="auth-success" role="status">{t('Anda telah keluar dari dashboard.')}</div>}

        {!configured ? (
          <div className="auth-setup-note">
            <strong>{t('Konfigurasi belum tersedia.')}</strong>
            <p>{t('Salin')} <code>.env.example</code> {t('menjadi')} <code>.env.local</code>, {t('lalu isi Project URL dan Publishable Key dari Supabase.')}</p>
          </div>
        ) : (
          <form action={signIn} className="auth-form">
            <label htmlFor="email">{t('Email')}</label>
            <input id="email" name="email" type="email" autoComplete="username" placeholder="nama@email.com" required />

            <label htmlFor="password">{t('Kata sandi')}</label>
            <input id="password" name="password" type="password" autoComplete="current-password" placeholder={t('Masukkan kata sandi')} required minLength={8} />

            <button type="submit" className="auth-submit">{t('Masuk')}</button>
          </form>
        )}

        <Link href="/" className="auth-back">← {t('Kembali ke website publik')}</Link>
      </section>
      <p className="auth-footnote">{t('Akses terbatas untuk pengelola Desa Wisata Bontomarannu.')}</p>
    </main>
  )
}
