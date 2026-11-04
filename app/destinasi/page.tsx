import { Footer, Header, DestinationDirectory, PageIntro } from '@/components/site'
import { getPublicDestinations } from '@/lib/queries/destinations'

export const dynamic = 'force-dynamic'

export default async function DestinasiPage() {
  const destinations = await getPublicDestinations()
  return <div className="directory-page"><Header/><PageIntro eyebrow="02 — Jelajahi kawasan" title={<>Tempat untuk <em>ditemukan.</em></>} text="Dari puncak berkabut hingga jejak kampung tua, temukan tempat-tempat yang membentuk cerita Bontomarannu."/><DestinationDirectory destinations={destinations}/><Footer/></div>
}
