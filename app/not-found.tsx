import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">HALAMAN TIDAK DITEMUKAN</p>
        <div className="auth-heading">
          <h1>Halaman belum tersedia.</h1>
          <p>Alamat mungkin berubah atau destinasi belum dipublikasikan.</p>
        </div>
        <Link href="/" className="button button-dark">Kembali ke beranda</Link>
      </section>
    </main>
  )
}
