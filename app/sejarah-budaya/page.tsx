import { Footer, Header, PageIntro, Notice } from '@/components/site'
import { getTranslator } from '@/lib/site-preferences'

export default async function Page() {
  const { t } = await getTranslator()
  return <>
    <Header />
    <main>
      <PageIntro eyebrow="05 — Warisan" title={<>{t('Telusuri jejak')}<br /><em>{t('Gantarang.')}</em></>} text="Sejarah, religi, dan budaya di Bontomarannu tidak berdiri sendiri. Ia hidup dalam lanskap, cerita lisan, dan cara masyarakat merawat tempat." />
      <section className="section content-section">
        <div className="story-grid">
          <article><p className="eyebrow">{t('Kampung tua')}</p><h2>Gantarang Lalang Bata</h2><p>{t('RIPPARKAB mencatat kampung tua, susunan batu, dan cerita tentang pintu-pintu masuk Gantarang. Narasi sejarah perlu dibaca sebagai dokumentasi sumber dan dilengkapi suara masyarakat.')}</p></article>
          <article><p className="eyebrow">{t('Seni pertunjukan')}</p><h2>Pakarena Gantarang</h2><p>{t('PPKD 2022 mendeskripsikan Pakarena Gantarang sebagai kesenian tari Selayar yang memiliki sejarah panjang. Detail pelaku, bentuk pertunjukan, dan izin dokumentasi perlu dikonfirmasi.')}</p></article>
          <article><p className="eyebrow">{t('Warisan religi')}</p><h2>Masjid Tua Gantarang</h2><p>{t('Catatan tentang Masjid Tua Gantarang perlu disampaikan dengan hormat pada fungsi ibadah, pengurus, jamaah, dan bagian-bagian yang tidak untuk dipublikasikan.')}</p></article>
        </div>
        <Notice>{t('Sejarah tertulis, cerita lisan, dan kepercayaan lokal dibedakan dalam penulisan.')}</Notice>
      </section>
    </main>
    <Footer />
  </>
}
