import { Footer, Header, PageIntro } from '@/components/site'
import { TourismMapLoader } from '@/components/tourism-map-loader'
import type { MapPoint } from '@/components/tourism-map'
import { getPublicDestinations } from '@/lib/queries/destinations'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const destinations = await getPublicDestinations()
  // Only verified field coordinates may become public map markers.
  // Coordinates must never be inferred from array order, generated offsets, or a viewport center.
  const points: MapPoint[] = destinations.flatMap((destination) => {
  const coordinates = destination.coordinates

  if (!coordinates || coordinates.verificationStatus !== 'verified') {
    return []
  }

  return [{
    slug: destination.slug,
    name: destination.name,
    category: destination.category,
    description: destination.description,
    status: destination.status,
    position: [coordinates.latitude, coordinates.longitude] as [number, number],
    accuracyMeters: coordinates.accuracyMeters,
    coordinateSource: coordinates.source,
  }]
  })

  return (
    <>
      <Header />
      <PageIntro
        eyebrow="10 — Peta jelajah"
        title={<>Lihat desa dari<br /><em>atas.</em></>}
        text="Peta interaktif untuk membaca sebaran titik wisata Bontomarannu. Marker hanya ditampilkan setelah koordinat GPS destinasi diverifikasi."
      />
      <main className="section map-page">
        <TourismMapLoader points={points} />
      </main>
      <Footer />
    </>
  )
}
