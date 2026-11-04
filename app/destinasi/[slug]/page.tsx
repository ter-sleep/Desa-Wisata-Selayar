import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, ArrowUpRight, MapPin, Navigation } from 'lucide-react'
import { getPublicDestinationBySlug } from '@/lib/queries/destinations'
import { getPublicMediaForDestination } from '@/lib/queries/media'
import { Footer, Header, Notice } from '@/components/site'
import { DestinationImage } from '@/components/destination-image'
export const dynamic = 'force-dynamic'
export default async function DetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const destination = await getPublicDestinationBySlug(slug)
  if (!destination) notFound()
  const destinationMedia = await getPublicMediaForDestination(destination.slug)
  const supplementalMedia = destinationMedia.filter((item) => !item.is_cover)

  return (
    <div>
      <Header />
      <main className="detail-page">
        <div className="detail-hero">
          <DestinationImage src={destination.image} alt={destination.name} loading="eager" />
          <div className="detail-hero-overlay" />
          <div className="detail-title">
            <p className="kicker">{destination.category} · {destination.eyebrow}</p>
            <h1>{destination.name}</h1>
          </div>
        </div>
        <div className="detail-content">
          <Link href="/destinasi" className="back-link">
            <ArrowLeft size={15} /> Kembali ke destinasi
          </Link>
          <div className="detail-grid">
            <div>
              <p className="eyebrow">Tentang tempat ini</p>
              <p className="detail-lede">{destination.description}</p>
              <p className="body-copy">
                Bontomarannu menyimpan lanskap dan cerita yang perlu dilihat dengan konteks. Halaman ini merangkum informasi awal dari sumber riset terbuka; detail kunjungan, akses, fasilitas, dan aktivitas masih menunggu verifikasi langsung bersama pengelola dan masyarakat.
              </p>
              <div className="detail-list">
                {destination.details.map((item) => <span key={item}>{item}</span>)}
              </div>
            </div>
            <aside>
              <p className="eyebrow">Status informasi</p>
              <p className="status-copy">{destination.status}</p>
              <Notice>Pastikan informasi terbaru sebelum berangkat.</Notice>
            </aside>
          </div>
          {destination.coordinates && (
            <section className="detail-gps-card" aria-label="Lokasi GPS terverifikasi">
              <div>
                <p className="eyebrow"><MapPin size={13} /> LOKASI GPS TERVERIFIKASI</p>
                <strong>{destination.coordinates.latitude.toFixed(7)}, {destination.coordinates.longitude.toFixed(7)}</strong>
                <small>{destination.coordinates.accuracyMeters ? `Akurasi pencatatan ±${Math.round(destination.coordinates.accuracyMeters)} meter` : 'Nilai akurasi GPS tidak dicatat'} · {destination.coordinates.source}</small>
              </div>
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${destination.coordinates.latitude},${destination.coordinates.longitude}`} target="_blank" rel="noreferrer"><Navigation size={15} /> Petunjuk arah</a>
            </section>
          )}
          {supplementalMedia.length > 0 && (
            <section className="detail-gallery" aria-label={`Dokumentasi ${destination.name}`}>
              <div>
                <p className="eyebrow">DOKUMENTASI</p>
                <h2>Potret <em>destinasi.</em></h2>
              </div>
              <div className="detail-gallery-grid">
                {supplementalMedia.map((item) => (
                  <figure key={item.id}>
                    <img src={item.image_url} alt={item.alt_text || item.caption || destination.name} loading="lazy" />
                    {(item.caption || item.credit) && (
                      <figcaption>
                        {item.caption && <strong>{item.caption}</strong>}
                        {item.credit && <small>Kredit: {item.credit}</small>}
                      </figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </section>
          )}
          <div className="detail-action-row">
            <Link href={`/reservasi?destination=${encodeURIComponent(destination.slug)}`} className="button button-dark">
              Ajukan reservasi <ArrowUpRight size={16} />
            </Link>
            <Link href="/panduan-berkunjung" className="button button-outline">Baca panduan berkunjung</Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
