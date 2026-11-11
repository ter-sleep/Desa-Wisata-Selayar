import { Footer, Header, DestinationDirectory, PageIntro } from '@/components/site'
import { getPublicDestinations } from '@/lib/queries/destinations'
import { getTranslator } from '@/lib/site-preferences'

export const dynamic = 'force-dynamic'

export default async function DestinasiPage() {
  const [destinations, { t }] = await Promise.all([getPublicDestinations(), getTranslator()])
  return <div className="directory-page"><Header /><main><PageIntro eyebrow="02 — Jelajahi kawasan" title={<>{t('Tempat untuk')} <em>{t('ditemukan.')}</em></>} text="Dari puncak berkabut hingga jejak kampung tua, temukan tempat-tempat yang membentuk cerita Bontomarannu." /><DestinationDirectory destinations={destinations} /></main><Footer /></div>
}
