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
      <section className="section village-docs" aria-labelledby="village-docs-heading">
        <div className="section-heading">
          <div>
            <p className="eyebrow">{t('Dokumentasi desa')}</p>
            <h2 id="village-docs-heading">{t('Peta dan struktur')}<br /><em>{t('Desa Bontomarannu.')}</em></h2>
          </div>
        </div>
        <div className="village-docs-grid">
          <figure className="village-doc village-doc-wide">
            <a href="/images/desa/peta-desa-bontomarannu.webp" target="_blank" rel="noreferrer" aria-label={t('Buka gambar ukuran penuh: Peta Desa Bontomarannu')}>
              <img src="/images/desa/peta-desa-bontomarannu.webp" width={1280} height={959} loading="lazy" alt={t('Peta Desa Bontomarannu yang menampilkan batas dusun, aliran sungai, jalan, permukiman, hutan, dan pesisir timur.')} />
            </a>
            <figcaption>
              <strong>{t('Peta Desa Bontomarannu')}</strong>
              <span>{t('Kecamatan Bontomanai, Kabupaten Kepulauan Selayar, Sulawesi Selatan. Skala 1:28.000.')}</span>
              <small>{t('Dokumentasi peta yang terpasang di desa.')}</small>
            </figcaption>
          </figure>
          <figure className="village-doc">
            <a href="/images/desa/keterangan-peta-desa.webp" target="_blank" rel="noreferrer" aria-label={t('Buka gambar ukuran penuh: Keterangan peta desa')}>
              <img src="/images/desa/keterangan-peta-desa.webp" width={960} height={1280} loading="lazy" alt={t('Keterangan peta Desa Bontomarannu beserta simbol fasilitas dan titik wisata.')} />
            </a>
            <figcaption>
              <strong>{t('Keterangan peta')}</strong>
              <span>{t('Simbol fasilitas desa, lokasi wisata, dan sumber data peta.')}</span>
            </figcaption>
          </figure>
          <figure className="village-doc">
            <a href="/images/desa/struktur-pemerintah-desa.webp" target="_blank" rel="noreferrer" aria-label={t('Buka gambar ukuran penuh: Struktur organisasi pemerintah desa')}>
              <img src="/images/desa/struktur-pemerintah-desa.webp" width={960} height={1279} loading="lazy" alt={t('Bagan struktur organisasi pemerintah Desa Bontomarannu.')} />
            </a>
            <figcaption>
              <strong>{t('Struktur organisasi pemerintah desa')}</strong>
              <span>{t('Bagan perangkat desa yang terpasang di kantor desa.')}</span>
              <small>{t('Susunan perangkat dapat berubah; pastikan pada pemerintah desa.')}</small>
            </figcaption>
          </figure>
        </div>
        <div className="village-facts">
          <div>
            <h3>{t('Dusun pada peta')}</h3>
            <ul>
              <li>Gojang Utara</li>
              <li>Gojang Selatan</li>
              <li>Golek</li>
              <li>Bontomarannu</li>
              <li>{t('Gantarang (nama lengkap pada peta kurang terbaca)')}</li>
            </ul>
          </div>
          <div>
            <h3>{t('Titik penting pada legenda peta')}</h3>
            <ul>
              <li>Puncak Tanadoang Camp Ground</li>
              <li>{t('Areal Hutan Seribu Kenari')}</li>
              <li>Masjid Awaluddin Dato Ribandang</li>
              <li>Pantai Timur &amp; Pantai Timur Galiaho</li>
              <li>{t('Jembatan Tana Tappu dan Anjungan')}</li>
              <li>Kaburu’na Dato Ribandang, Pakojokkang, Possi Tanah, Ta’ra Lisak Bangkeng</li>
            </ul>
          </div>
        </div>
        <Notice>{t('Sumber yang tercantum pada papan peta: Satu Data Indonesia (Badan Informasi Geospasial) dan Google Earth Pro. Nama dan lokasi perlu diverifikasi bersama pemerintah desa.')}</Notice>
      </section>
    </main>
    <Footer />
  </>
}
