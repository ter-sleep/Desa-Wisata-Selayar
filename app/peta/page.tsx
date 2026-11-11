import { Footer, Header, PageIntro } from '@/components/site'
import { TourismMapLoader } from '@/components/tourism-map-loader'
import { toMapPoints } from '@/lib/map-data'
import { getPublicDestinations } from '@/lib/queries/destinations'
import { getTranslator } from '@/lib/site-preferences'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const [destinations, { t }] = await Promise.all([getPublicDestinations(), getTranslator()])
  const points = toMapPoints(destinations)

  return (
    <>
      <Header />
      <main>
      <PageIntro
        eyebrow="10 — Peta jelajah"
        title={<>{t('Lihat desa dari')}<br /><em>{t('atas.')}</em></>}
        text="Jelajahi miniatur ilustratif Kepulauan Selayar atau citra satelit dengan batas Desa Bontomarannu di Kecamatan Bontomanai. Pin destinasi hanya muncul setelah GPS diverifikasi."
      />
      <section className="section map-page">
        <TourismMapLoader points={points} />
      </section>
      </main>
      <Footer />
    </>
  )
}
