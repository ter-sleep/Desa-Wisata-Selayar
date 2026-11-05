import Link from 'next/link'
import { ArrowUpRight, Images } from 'lucide-react'
import { Footer, Header, PageIntro, Notice } from '@/components/site'
import { getPublicGalleryMedia } from '@/lib/queries/media'
import { getTranslator } from '@/lib/site-preferences'

export const dynamic = 'force-dynamic'

export default async function GalleryPage() {
  const [media, { t }] = await Promise.all([getPublicGalleryMedia(), getTranslator()])

  return (
    <>
      <Header />
      <main>
      <PageIntro
        eyebrow="07 — Catatan visual"
        title={<>{t('Melihat dengan')}<br /><em>{t('lebih dekat.')}</em></>}
        text="Dokumentasi destinasi Desa Wisata Bontomarannu yang dipublikasikan oleh pengelola, lengkap dengan keterangan dan kredit sumber."
      />
      <section className="section public-gallery-section">
        {media.length > 0 ? (
          <div className="public-gallery-grid">
            {media.map((item) => (
              <figure className="public-gallery-card" key={item.id}>
                <Link href={`/destinasi/${item.destination_slug}`} className="public-gallery-image-link" aria-label={`${t('Lihat destinasi')}: ${item.destination_name}`}>
                  <img src={item.image_url} alt={item.alt_text || item.caption || item.destination_name} loading="lazy" />
                  <span className="public-gallery-overlay"><ArrowUpRight size={20} /></span>
                </Link>
                <figcaption>
                  <span className="eyebrow">{item.destination_name}</span>
                  {item.caption && <strong>{item.caption}</strong>}
                  {item.credit && <small>{t('Kredit:')} {item.credit}</small>}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="gallery-empty">
            <p className="eyebrow">{t('Galeri sedang disiapkan')}</p>
            <h2>{t('Foto asli Bontomarannu')}<br /><em>{t('segera hadir.')}</em></h2>
            <Notice>{t('Galeri akan menampilkan foto setelah pengelola mengunggah dan memublikasikan dokumentasi yang memiliki keterangan serta izin penggunaan yang jelas.')}</Notice>
          </div>
        )}
        <div className="gallery-footnote"><Images size={16} /><span>{t('Foto hanya ditampilkan setelah disetujui untuk publikasi.')}</span></div>
      </section>
      </main>
      <Footer />
    </>
  )
}
