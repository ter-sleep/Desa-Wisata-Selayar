import Link from 'next/link'
import { ArrowUpRight, Images } from 'lucide-react'
import { Footer, Header, PageIntro, Notice } from '@/components/site'
import { getPublicGalleryMedia } from '@/lib/queries/media'

export const dynamic = 'force-dynamic'

export default async function GalleryPage() {
  const media = await getPublicGalleryMedia()

  return (
    <>
      <Header />
      <PageIntro
        eyebrow="07 — Catatan visual"
        title={<>Melihat dengan<br /><em>lebih dekat.</em></>}
        text="Dokumentasi destinasi Desa Wisata Bontomarannu yang dipublikasikan oleh pengelola, lengkap dengan keterangan dan kredit sumber."
      />
      <section className="section public-gallery-section">
        {media.length > 0 ? (
          <div className="public-gallery-grid">
            {media.map((item) => (
              <figure className="public-gallery-card" key={item.id}>
                <Link href={`/destinasi/${item.destination_slug}`} className="public-gallery-image-link" aria-label={`Lihat ${item.destination_name}`}>
                  <img src={item.image_url} alt={item.alt_text || item.caption || item.destination_name} loading="lazy" />
                  <span className="public-gallery-overlay"><ArrowUpRight size={20} /></span>
                </Link>
                <figcaption>
                  <span className="eyebrow">{item.destination_name}</span>
                  {item.caption && <strong>{item.caption}</strong>}
                  {item.credit && <small>Kredit: {item.credit}</small>}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="gallery-empty">
            <p className="eyebrow">Galeri sedang disiapkan</p>
            <h2>Foto asli Bontomarannu<br /><em>segera hadir.</em></h2>
            <Notice>Galeri akan menampilkan foto setelah pengelola mengunggah dan memublikasikan dokumentasi yang memiliki keterangan serta izin penggunaan yang jelas.</Notice>
          </div>
        )}
        <div className="gallery-footnote"><Images size={16} /><span>Foto hanya ditampilkan setelah disetujui untuk publikasi.</span></div>
      </section>
      <Footer />
    </>
  )
}
