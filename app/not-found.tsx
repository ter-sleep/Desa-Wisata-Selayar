import Link from 'next/link'
import { getTranslator } from '@/lib/site-preferences'

export default async function NotFound() {
  const { t } = await getTranslator()
  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">{t('Halaman tidak ditemukan')}</p>
        <div className="auth-heading">
          <h1>{t('Halaman belum tersedia.')}</h1>
          <p>{t('Alamat mungkin berubah atau destinasi belum dipublikasikan.')}</p>
        </div>
        <Link href="/" className="button button-dark">{t('Kembali ke beranda')}</Link>
      </section>
    </main>
  )
}
