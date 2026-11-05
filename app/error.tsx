'use client'

import Link from 'next/link'
import { useEffect } from 'react'

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('Halaman gagal dimuat.', { digest: error.digest })
  }, [error])

  return (
    <div className="auth-page">
      <section className="auth-card" role="alert">
        <p className="eyebrow">LAYANAN SEMENTARA TERGANGGU</p>
        <div className="auth-heading">
          <h1>Halaman belum dapat dimuat.</h1>
          <p>Data belum dapat diambil. Coba kembali beberapa saat lagi atau hubungi pengelola.</p>
        </div>
        <div className="auth-form">
          <button type="button" className="auth-submit" onClick={reset}>Coba lagi</button>
        </div>
        <Link href="/" className="auth-back">Kembali ke beranda</Link>
      </section>
    </div>
  )
}
