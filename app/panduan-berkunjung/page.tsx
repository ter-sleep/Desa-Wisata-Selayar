import { Footer, Header, PageIntro, Notice } from '@/components/site'
import { getTranslator } from '@/lib/site-preferences'

export default async function Page() {
  const { t } = await getTranslator()
  return <>
    <Header />
    <main>
      <PageIntro eyebrow="04 — Rencanakan perjalanan" title={<>{t('Datang dengan')}<br /><em>{t('persiapan.')}</em></>} text="Gunakan panduan ini sebagai titik awal. Rute, tarif, jam buka, kondisi jalan, dan kontak perlu dikonfirmasi sebelum perjalanan." />
      <section className="section content-section">
        <div className="content-columns">
          <div><p className="eyebrow">{t('Yang perlu diketahui')}</p><h2>{t('Perjalanan yang')}<br /><em>{t('lebih sadar.')}</em></h2></div>
          <div className="guide-list">
            <div><b>01</b><h3>{t('Dari Benteng')}</h3><p>{t('Beberapa sumber menyebut desa berjarak sekitar 13 km dari Benteng. Titik awal dan rute perlu dipastikan kembali.')}</p></div>
            <div><b>02</b><h3>{t('Hormati tempat')}</h3><p>{t('Untuk masjid, kampung tua, dan situs budaya, ikuti arahan pengurus serta minta izin sebelum memotret.')}</p></div>
            <div><b>03</b><h3>{t('Utamakan keselamatan')}</h3><p>{t('Jangan berenang, trekking, atau menjelajah sungai tanpa informasi kondisi terbaru dan pendamping yang memahami medan.')}</p></div>
            <Notice>{t('Belum tersedia kontak reservasi atau tarif yang terverifikasi di paket data saat ini.')}</Notice>
          </div>
        </div>
      </section>
    </main>
    <Footer />
  </>
}
