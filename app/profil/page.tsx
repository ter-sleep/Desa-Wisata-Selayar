import { Footer, Header, PageIntro, Notice } from '@/components/site'
import { getTranslator } from '@/lib/site-preferences'

export default async function Page() {
  const { t } = await getTranslator()
  return <>
    <Header />
    <main>
      <PageIntro eyebrow="03 — Tentang desa" title={<>{t('Satu desa,')}<br /><em>{t('banyak cerita.')}</em></>} text="Desa Bontomarannu berada di Kecamatan Bontomanai, Kabupaten Kepulauan Selayar, Sulawesi Selatan. Identitas desa wisata ini dibentuk oleh alam pegunungan, sejarah, budaya, dan kehidupan masyarakat." />
      <section className="section content-section">
        <div className="content-columns">
          <div><p className="eyebrow">{t('Identitas')}</p><h2>{t('Alam pegunungan')}<br /><em>{t('dan sejarah.')}</em></h2></div>
          <div>
            <p className="large-copy">{t('Website ini menjadi pintu masuk untuk mengenal Bontomarannu dengan informasi yang jujur, hangat, dan terus diperbarui.')}</p>
            <p className="muted-copy">{t('Data tentang dusun, fasilitas, tarif, dan kontak akan ditampilkan setelah mendapat konfirmasi dari sumber resmi. Kami tidak ingin membuat pengalaman terlihat lengkap dengan mengorbankan ketepatan.')}</p>
            <Notice>{t('Profil ini menggunakan sumber pemerintah desa dan dokumen perencanaan sebagai rujukan awal.')}</Notice>
          </div>
        </div>
      </section>
    </main>
    <Footer />
  </>
}
