'use client'

import Link from 'next/link'
import { Component, useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, ArrowRight, Compass, Copy, Globe2, Minus, Mountain, Pause, Play, Plus, RotateCcw, RotateCw } from 'lucide-react'
import { LoadingStatus } from '@/components/loading-status'
import { useSitePreferences } from '@/components/site-preferences'
import { translate, type Message } from '@/lib/i18n'
import { directionsUrl, type MapPoint, type Position } from '@/lib/map-data'
import { createMiniatureScene, type CameraPose } from '@/lib/miniature-scene'
import { geographySources, geometryBounds, type TourismGeography } from '@/lib/tourism-geography'

type Props = {
  geography: TourismGeography
  points: MapPoint[]
  selected: MapPoint | null
  userPosition: Position | null
  focusPosition: Position | null
  focusSequence: number
  areaSequence: number
  onSelect: (slug: string) => void
  onFocusArea: () => void
}

function MiniatureUnavailable({ onRetry, contextLost = false }: { onRetry: () => void; contextLost?: boolean }) {
  const { t } = useSitePreferences()
  return (
    <div className="miniature-fallback" role="alert">
      <Mountain size={36} />
      <p>{t(contextLost ? 'Konteks grafis miniatur terputus. Coba lagi untuk memulihkan tampilan atau gunakan peta satelit.' : 'Miniatur 3D tidak dapat ditampilkan. Browser memerlukan dukungan WebGL2. Gunakan peta satelit atau coba lagi.')}</p>
      <button type="button" className="button button-dark" onClick={onRetry}>{t('Coba lagi')}</button>
    </div>
  )
}

class MiniatureBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: Error) { console.error('The 3D miniature could not initialize.', error.message) }
  render() {
    return this.state.failed ? <MiniatureUnavailable onRetry={() => this.setState({ failed: false })} /> : this.props.children
  }
}

function MiniatureRenderer({ geography, points, selected, userPosition, focusPosition, focusSequence, areaSequence, onSelect, onFocusArea }: Props) {
  const { language, theme, t, content } = useSitePreferences()
  const container = useRef<HTMLDivElement>(null)
  const scene = useRef<ReturnType<typeof createMiniatureScene> | null>(null)
  const camera = useRef<CameraPose | null>(null)
  const [retry, setRetry] = useState(0)
  const [loaded, setLoaded] = useState<number | null>(null)
  const [failed, setFailed] = useState<number | null>(null)
  const [autoRotate, setAutoRotate] = useState(false)
  const [copied, setCopied] = useState<{ slug: string; message: Message } | null>(null)
  const ready = loaded === retry && failed !== retry
  const bounds = geometryBounds(geography.archipelago.geometry)
  const userOutside = Boolean(userPosition && (userPosition[0] < bounds.south - .1 || userPosition[0] > bounds.north + .1 ||
    userPosition[1] < bounds.west - .1 || userPosition[1] > bounds.east + .1))

  useEffect(() => {
    if (!container.current) return
    let active = true
    const miniature = createMiniatureScene(container.current, geography, {
      onSelect, onArea: onFocusArea,
      onReady() { if (active) setLoaded(retry) },
      onContextLost() { if (active) { console.error('The 3D miniature lost its WebGL context.'); setFailed(retry) } },
    }, camera.current)
    scene.current = miniature
    return () => {
      active = false
      camera.current = miniature.getCameraState()
      miniature.dispose()
      scene.current = null
    }
  }, [geography, onSelect, onFocusArea, retry])

  useEffect(() => { scene.current?.setTheme(theme) }, [theme, geography, retry])
  useEffect(() => { scene.current?.setPoints(points) }, [points, geography, retry])
  useEffect(() => { scene.current?.setSelected(selected?.slug || null) }, [selected?.slug, points, geography, retry])
  useEffect(() => { scene.current?.setAutoRotate(autoRotate) }, [autoRotate, geography, retry])
  useEffect(() => { scene.current?.setRegionLabel(translate(language, 'Desa Bontomarannu')) }, [language, geography, retry])
  useEffect(() => {
    scene.current?.setUserPosition(userOutside ? null : userPosition, translate(language, 'Lokasi Anda'))
  }, [userPosition, userOutside, language, geography, retry])
  useEffect(() => {
    if (!focusPosition) return
    if (userOutside && userPosition && focusPosition[0] === userPosition[0] && focusPosition[1] === userPosition[1]) return
    scene.current?.focus(focusPosition)
  }, [focusPosition, focusSequence, userOutside, userPosition])
  useEffect(() => { if (areaSequence > 0) scene.current?.focusArea() }, [areaSequence, geography])

  async function copyCoordinates(point: MapPoint) {
    try {
      await navigator.clipboard.writeText(`${point.position[0]}, ${point.position[1]}`)
      setCopied({ slug: point.slug, message: 'Koordinat disalin.' })
    } catch (error) {
      console.error('Verified map coordinates could not be copied.', error instanceof Error ? error.message : 'Clipboard request failed.')
      setCopied({ slug: point.slug, message: 'Koordinat tidak dapat disalin. Gunakan nilai latitude dan longitude yang ditampilkan.' })
    }
  }

  function adjacent(direction: number) {
    const index = points.findIndex((point) => point.slug === selected?.slug)
    const next = points[(index + direction + points.length) % points.length]
    if (next) onSelect(next.slug)
  }

  return (
    <div className="miniature-shell">
      <div className="miniature-stage">
        <div className="miniature-surface">
          <div ref={container} className="miniature-viewport" role="region" aria-label={t('Miniatur ilustratif Kepulauan Selayar')} data-miniature-ready={ready} />
          {!ready && failed !== retry && <LoadingStatus className="miniature-loading">{t('Memuat miniatur 3D...')}</LoadingStatus>}
          {failed === retry && <MiniatureUnavailable contextLost onRetry={() => setRetry((value) => value + 1)} />}
          <p className="miniature-help">{t('Drag untuk memutar · Scroll untuk zoom · Klik pin terverifikasi')}</p>
          <div className="miniature-legend"><span><i className="legend-boundary" />{t('Desa Bontomarannu')}</span><span><i className="legend-district" />{t('Batas Kecamatan Bontomanai')}</span><span><i className="legend-landscape" />{t('Visualisasi ilustratif')}</span></div>
        </div>
        <aside className="miniature-info" aria-label={t(selected ? 'Lokasi terpilih' : 'Wilayah fokus')}>
          <div className="miniature-info-heading">
            <span>{t(selected ? 'Lokasi terpilih' : 'Wilayah fokus')}</span>
            {points.length > 1 && <div>
              <button type="button" aria-label={t('Destinasi sebelumnya')} onClick={() => adjacent(-1)}><ArrowLeft size={15} /></button>
              <button type="button" aria-label={t('Destinasi selanjutnya')} onClick={() => adjacent(1)}><ArrowRight size={15} /></button>
            </div>}
          </div>
          <p className="eyebrow">{selected ? content(selected.category) : t('Kecamatan Bontomanai')}</p>
          <h2>{selected?.name || t('Desa Bontomarannu')}</h2>
          <p>{selected ? content(selected.description) : t('Jelajahi Pulau Selayar dan fokuskan tampilan pada Desa Bontomarannu di Kecamatan Bontomanai.')}</p>
          {selected ? (
            <>
              <small className="miniature-information-status"><Compass size={13} />{t('GPS terverifikasi')}</small>
              <code className="miniature-coordinates">{selected.position[0]}, {selected.position[1]}</code>
              <div className="miniature-info-actions">
                <a className="button button-dark" href={directionsUrl(selected.position)} target="_blank" rel="noreferrer">{t('Petunjuk arah')} ↗</a>
                <button type="button" onClick={() => copyCoordinates(selected)}><Copy size={13} />{t('Salin koordinat')}</button>
              </div>
              {copied?.slug === selected.slug && <p role="status" className="miniature-copy-status">{t(copied.message)}</p>}
              <Link className="text-link" href={`/destinasi/${encodeURIComponent(selected.slug)}`}>{t('Buka halaman destinasi')} ↗</Link>
            </>
          ) : (
            <>
              <small className="miniature-information-status"><Compass size={13} />{content(geography.village.status || '')}</small>
              <p className="miniature-gps-pending">{t('Belum ada pin destinasi; koordinat GPS masih menunggu verifikasi.')}</p>
              <div className="miniature-info-actions">
                <button type="button" className="button button-dark" disabled={!ready} onClick={onFocusArea}>{t('Fokus desa')}</button>
                <Link href="/destinasi">{t('Jelajahi destinasi')} ↗</Link>
              </div>
            </>
          )}
          <p className="miniature-source">{t('Data BIG · Juni 2026')}<br />{t('Batas desa bersifat indikatif, bukan penetapan batas hukum.')}</p>
        </aside>
      </div>
      <div className="miniature-controls" role="group" aria-label={t('Kontrol miniatur')}>
        <button type="button" disabled={!ready} data-action="rotate" aria-label={t('Putar sudut pandang')} onClick={() => scene.current?.rotate()}><RotateCw size={17} /></button>
        <button type="button" disabled={!ready} data-action="zoom-in" aria-label={t('Perbesar miniatur')} onClick={() => scene.current?.zoom(.8)}><Plus size={17} /></button>
        <button type="button" disabled={!ready} data-action="zoom-out" aria-label={t('Perkecil miniatur')} onClick={() => scene.current?.zoom(1.25)}><Minus size={17} /></button>
        <button type="button" disabled={!ready} data-action="auto-rotate" aria-pressed={autoRotate} aria-label={t(autoRotate ? 'Hentikan putaran' : 'Putar otomatis')} onClick={() => setAutoRotate((value) => !value)}>{autoRotate ? <Pause size={17} /> : <Play size={17} />}</button>
        <button type="button" disabled={!ready} data-action="reset" aria-label={t('Atur ulang tampilan')} onClick={() => { setAutoRotate(false); scene.current?.setAutoRotate(false); scene.current?.reset() }}><RotateCcw size={17} /></button>
        <button type="button" disabled={!ready} data-action="islands" onClick={() => scene.current?.showIslands()}><Globe2 size={16} />{t('Lihat kepulauan')}</button>
      </div>
      {userOutside && <p className="map-location-message" role="status">{t('Lokasi Anda di luar cakupan miniatur. Gunakan peta satelit untuk melihat posisi perangkat.')}</p>}
      <p className="miniature-disclaimer">{t('Bentuk wilayah mengikuti data BIG. Pohon, relief, dan bangunan adalah ilustrasi, bukan data survei.')} <a href={geographySources.village.service} target="_blank" rel="noreferrer">{t('Sumber data')} ↗</a></p>
    </div>
  )
}

export function MiniatureMap(props: Props) {
  return <MiniatureBoundary><MiniatureRenderer {...props} /></MiniatureBoundary>
}
