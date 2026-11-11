import { Footer, Header, PageIntro, Notice } from '@/components/site'
import { getTranslator } from '@/lib/site-preferences'

export default async function Page() {
  const { t } = await getTranslator()
  return <>
    <Header />
    <main>
      <PageIntro eyebrow="09 — Informasi" title={<>{t('Cerita yang')}<br /><em>{t('terus tumbuh.')}</em></>} text="Berita, agenda, dan pengumuman akan ditampilkan setelah tersedia dari sumber resmi desa atau pengelola." />
      <section className="section">
        <div className="gallery-empty">
          <p className="eyebrow">{t('Belum ada publikasi')}</p>
          <h2>{t('Informasi terverifikasi')}<br /><em>{t('segera hadir.')}</em></h2>
          <Notice>{t('Kami tidak membuat jadwal acara atau berita yang belum dikonfirmasi.')}</Notice>
        </div>
      </section>
    </main>
    <Footer />
  </>
}
