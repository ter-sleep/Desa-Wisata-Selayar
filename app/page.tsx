import Link from 'next/link'
import { ArrowDown, ArrowUpRight, Compass, Leaf, Map, Sparkles } from 'lucide-react'
import { DestinationCard, Footer, Header, Notice } from '@/components/site'
import { getPublicDestinations } from '@/lib/queries/destinations'
import { getTranslator } from '@/lib/site-preferences'

export const dynamic = 'force-dynamic'

export default async function Home() {
  const [destinations, { t }] = await Promise.all([getPublicDestinations(), getTranslator()])
  return (
    <div>
      <Header />
      <main>
        <section className="hero">
          <div className="hero-image" />
          <div className="hero-overlay" />
          <div className="hero-location">{t('Alam. Cerita. Kehidupan.')}</div>
          <div className="hero-content">
            <p className="kicker">{t('Desa wisata · Kepulauan Selayar')}</p>
            <h1>{t('Temukan sisi lain')}<br /><em>{t('Selayar.')}</em></h1>
            <p className="hero-lede">{t('Di antara puncak yang berkabut, hutan kenari, dan jejak Gantarang—Bontomarannu mengundang Anda untuk berjalan lebih pelan.')}</p>
            <div className="hero-actions">
              <Link href="/destinasi" className="button button-light">{t('Jelajahi destinasi')} <ArrowUpRight size={17} /></Link>
              <Link href="/profil" className="plain-link">{t('Kenali desa')} <ArrowDown size={16} /></Link>
            </div>
          </div>
          <div className="hero-caption"><span>01 / 06</span><span>Puncak Tanadoang</span><span className="caption-line" /></div>
        </section>
        <section className="section intro-section">
          <div className="section-kicker">{t('01 — Sebuah pengantar')}</div>
          <div className="intro-grid">
            <h2>{t('Alam, sejarah,')}<br /><em>{t('dan kehidupan')}</em><br />{t('yang berakar.')}</h2>
            <div>
              <p className="large-copy">{t('Bontomarannu adalah tempat di mana lanskap perbukitan bertemu dengan hutan, pesisir, dan warisan Gantarang.')}</p>
              <p className="muted-copy">{t('Kami menyusun informasi ini untuk membantu Anda mengenal desa, menemukan tempat yang bermakna, dan berkunjung dengan rasa hormat kepada alam serta masyarakat.')}</p>
              <Link href="/profil" className="text-link dark">{t('Lebih banyak tentang Bontomarannu')} <ArrowUpRight size={15} /></Link>
            </div>
          </div>
        </section>
        <section className="section destinations-section">
          <div className="section-heading">
            <div><p className="eyebrow">{t('02 — Jelajahi kawasan')}</p><h2>{t('Tempat untuk')}<br /><em>{t('ditemukan.')}</em></h2></div>
            <Link href="/destinasi" className="text-link dark">{t('Lihat semua destinasi')} <ArrowUpRight size={15} /></Link>
          </div>
          <div className="featured-grid">{destinations.slice(0, 3).map((destination, index) => <DestinationCard key={destination.slug} destination={destination} featured={index === 0} />)}</div>
        </section>
        <section className="pillars">
          <div className="section section-heading">
            <div><p className="eyebrow light">{t('03 — Cara kami bercerita')}</p><h2>{t('Empat cara melihat')}<br /><em>{t('Bontomarannu.')}</em></h2></div>
          </div>
          <div className="pillar-grid">
            <div><Leaf /><span>01</span><h3>{t('Alam')}</h3><p>{t('Puncak, hutan, sungai, dan pesisir untuk dijelajahi.')}</p></div>
            <div><Map /><span>02</span><h3>{t('Sejarah')}</h3><p>{t('Jejak Gantarang dan warisan yang terus dirawat.')}</p></div>
            <div><Sparkles /><span>03</span><h3>{t('Budaya')}</h3><p>{t('Tradisi, cerita, dan pengetahuan yang hidup.')}</p></div>
            <div><Compass /><span>04</span><h3>{t('Masyarakat')}</h3><p>{t('Pengalaman yang tumbuh bersama warga lokal.')}</p></div>
          </div>
        </section>
        <section className="section planning">
          <div className="planning-card">
            <div>
              <p className="eyebrow">{t('04 — Sebelum berangkat')}</p>
              <h2>{t('Datang dengan')}<br /><em>{t('rasa ingin tahu.')}</em></h2>
              <p>{t('Informasi fasilitas, tarif, jam operasional, dan kontak diperbarui setelah mendapat konfirmasi pengelola.')}</p>
              <Link href="/panduan-berkunjung" className="button button-dark">{t('Panduan berkunjung')} <ArrowUpRight size={17} /></Link>
            </div>
            <div className="planning-aside"><span className="big-number">13</span><span className="aside-label">{t('km dari Benteng')}<br /><small>{t('perkiraan dari sumber riset')}</small></span></div>
          </div>
          <Notice>{t('Beberapa informasi di website ini masih menunggu verifikasi lapangan.')}</Notice>
        </section>
      </main>
      <Footer />
    </div>
  )
}
