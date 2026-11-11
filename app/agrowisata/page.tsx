import { Footer, Header, PageIntro, Notice } from '@/components/site'
import { getTranslator } from '@/lib/site-preferences'

export default async function Page() {
  const { t } = await getTranslator()
  return <>
    <Header />
    <main>
      <PageIntro eyebrow="06 — Tumbuh bersama" title={<>{t('Dari hutan,')}<br /><em>{t('ke meja.')}</em></>} text="Kenari, cengkeh, vanili, pala, kerajinan, dan kuliner adalah potensi yang menghubungkan lanskap dengan ekonomi masyarakat." />
      <section className="section content-section">
        <div className="content-columns">
          <div><p className="eyebrow">{t('Potensi lokal')}</p><h2>{t('Pengetahuan yang')}<br /><em>{t('bernilai.')}</em></h2></div>
          <div>
            <p className="large-copy">{t('Hutan Kenari Gojang membuka percakapan tentang konservasi, hasil alam, dan pengalaman belajar bersama warga.')}</p>
            <p className="muted-copy">{t('Produk, harga, pelaku usaha, dan aktivitas agrowisata akan dimuat setelah terverifikasi.')}</p>
            <Notice>{t('Belum ada daftar produk dan pelaku UMKM yang terkonfirmasi untuk ditampilkan.')}</Notice>
          </div>
        </div>
      </section>
    </main>
    <Footer />
  </>
}
