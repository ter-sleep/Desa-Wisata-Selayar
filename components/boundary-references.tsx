'use client'

import { useSitePreferences } from '@/components/site-preferences'
import { geographySources } from '@/lib/tourism-geography'

export function BoundaryReferences() {
  const { t } = useSitePreferences()

  return (
    <aside className="map-boundary-comparison" aria-label={t('Rujukan batas wilayah')}>
      <p>{t('Batas desa dari BIG dapat berbeda dari outline Google Maps. Referensi Google Maps tidak digunakan untuk menggambar ulang batas atau menetapkan GPS destinasi.')}</p>
      <div className="map-boundary-reference-links">
        <a href={geographySources.reference.url} target="_blank" rel="noreferrer">{t('Bandingkan di Google Maps')} ↗</a>
        <a href={geographySources.detailedMapReference.url} target="_blank" rel="noreferrer">{t('Lihat peta BIG 1:5.000')} ↗</a>
      </div>
      <p className="map-boundary-scale-note">{t('Peta RBI BIG skala 1:5.000 adalah pembanding, bukan verifikasi poligon ini. Status segmen batas beragam; peta ini tidak dapat menjadi acuan pengambilan informasi pada skala lebih besar dari 1:5.000.')}</p>
      <details className="map-boundary-details">
        <summary>{t('Riwayat batas desa')}</summary>
        <p>{t('Perda Kabupaten Kepulauan Selayar No. 7 Tahun 2010 menyebut Bontokoraang dimekarkan dari Bontomarannu dan menempatkan Bontomarannu di utara Bontokoraang. Perda No. 17 Tahun 2011 menyebut Bontomarannu di sebelah timur Kaburu.')}</p>
        <p>{t('Keterangan tersebut tidak menentukan koordinat garis batas pada peta ini. Poligon yang ditampilkan tetap bersumber dari BIG dan bersifat indikatif.')}</p>
        <div className="map-boundary-reference-links">
          <a href={geographySources.legalReferences.bontokoraang.url} target="_blank" rel="noreferrer">{t('Perda No. 7/2010 · Pasal 9')} ↗</a>
          <a href={geographySources.legalReferences.kaburu.url} target="_blank" rel="noreferrer">{t('Perda No. 17/2011 · Pasal 3')} ↗</a>
        </div>
      </details>
    </aside>
  )
}
