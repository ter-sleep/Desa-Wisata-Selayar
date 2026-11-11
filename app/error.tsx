'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { useSitePreferences } from '@/components/site-preferences'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useSitePreferences()
  useEffect(() => {
    console.error('Halaman gagal dimuat.', { digest: error.digest })
  }, [error])

  return (
    <div className="auth-page">
      <section className="auth-card" role="alert">
        <p className="eyebrow">{t('Layanan sementara terganggu')}</p>
        <div className="auth-heading">
          <h1>{t('Halaman belum dapat dimuat.')}</h1>
          <p>{t('Data belum dapat diambil. Coba kembali beberapa saat lagi atau hubungi pengelola.')}</p>
        </div>
        <div className="auth-form">
          <button type="button" className="auth-submit" onClick={reset}>{t('Coba lagi')}</button>
        </div>
        <Link href="/" className="auth-back">{t('Kembali ke beranda')}</Link>
      </section>
    </div>
  )
}
