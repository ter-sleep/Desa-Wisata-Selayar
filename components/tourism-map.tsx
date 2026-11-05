'use client'

import dynamic from 'next/dynamic'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Box, LocateFixed, Satellite } from 'lucide-react'
import { directionsUrl, filterMapPoints, haversineKm, type MapPoint, type Position } from '@/lib/map-data'
import type { Message } from '@/lib/i18n'
import { useSitePreferences } from '@/components/site-preferences'
import { LoadingStatus } from '@/components/loading-status'
import { SatelliteMap } from '@/components/satellite-map'
import { loadTourismGeography, type TourismGeography } from '@/lib/tourism-geography'

export type { MapPoint } from '@/lib/map-data'

function MiniatureLoading() {
  const { t } = useSitePreferences()
  return <LoadingStatus className="map-loading">{t('Memuat miniatur 3D...')}</LoadingStatus>
}

const MiniatureMap = dynamic(() => import('./miniature-map').then((module) => module.MiniatureMap), { ssr: false, loading: MiniatureLoading })
type GeographyState = { kind: 'loading' } | { kind: 'ready'; data: TourismGeography } | { kind: 'error' }

export function TourismMap({ points }: { points: MapPoint[] }) {
  const { t, content, language } = useSitePreferences()
  const [view, setView] = useState<'miniature' | 'satellite'>('miniature')
  const [geography, setGeography] = useState<GeographyState>({ kind: 'loading' })
  const [geographyRetry, setGeographyRetry] = useState(0)
  const [activeSlug, setActiveSlug] = useState<string | null>(null)
  const [focusSequence, setFocusSequence] = useState(0)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Semua')
  const [userPosition, setUserPosition] = useState<Position | null>(null)
  const [focusTarget, setFocusTarget] = useState<'area' | 'destination' | 'user'>('area')
  const [areaSequence, setAreaSequence] = useState(0)
  const [locationError, setLocationError] = useState<Message | null>(null)
  const [locating, setLocating] = useState(false)
  const categories = useMemo(() => ['Semua', ...Array.from(new Set(points.map((point) => point.category)))], [points])
  const visiblePoints = useMemo(() => filterMapPoints(points, query, category), [points, query, category])
  const selected = visiblePoints.find((point) => point.slug === activeSlug) || visiblePoints[0] || null
  const focusPoint = focusTarget === 'user' ? userPosition : focusTarget === 'destination' ? selected?.position : null
  const latitude = focusPoint?.[0]
  const longitude = focusPoint?.[1]
  const focusPosition = useMemo<Position | null>(() =>
    latitude === undefined || longitude === undefined ? null : [latitude, longitude],
  [latitude, longitude])
  const selectPoint = useCallback((slug: string) => { setActiveSlug(slug); setFocusTarget('destination'); setFocusSequence((value) => value + 1) }, [])
  const focusArea = useCallback(() => { setFocusTarget('area'); setAreaSequence((value) => value + 1) }, [])

  useEffect(() => {
    const controller = new AbortController()
    loadTourismGeography(controller.signal).then((data) => {
      if (!controller.signal.aborted) setGeography({ kind: 'ready', data })
    }).catch((error) => {
      if (controller.signal.aborted) return
      console.error('The tourism boundaries could not be loaded.', error instanceof Error ? error.message : 'Boundary request failed.')
      setGeography({ kind: 'error' })
    })
    return () => controller.abort()
  }, [geographyRetry])

  function locateUser() {
    setLocationError(null)
    if (!navigator.geolocation) {
      setLocationError('Browser tidak mendukung geolocation.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (result) => {
        setUserPosition([result.coords.latitude, result.coords.longitude])
        setFocusTarget('user')
        setFocusSequence((value) => value + 1)
        setLocating(false)
      },
      (error) => {
        setLocationError(error.code === 1
          ? 'Izin lokasi ditolak. Aktifkan izin lokasi pada browser.'
          : error.code === 2 ? 'Lokasi perangkat tidak tersedia.' : 'Permintaan lokasi melewati batas waktu. Coba lagi di area terbuka.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  }

  return (
    <div className="tourism-map-wrap">
      <div className="map-toolbar">
        <div>
          <span className="eyebrow">{t('Peta jelajah')}</span>
          <strong>{t('Desa wisata Bontomarannu')}</strong>
          <p className="map-subtitle">{t('Miniatur ilustratif dan citra satelit dengan batas Desa Bontomarannu dan Kecamatan Bontomanai.')}</p>
        </div>
        <div className="map-view-switch" role="group" aria-label={t('Pilihan tampilan peta')}>
          <button type="button" aria-pressed={view === 'miniature'} onClick={() => setView('miniature')}><Box size={18} /> {t('Miniatur 3D')}</button>
          <button type="button" aria-pressed={view === 'satellite'} onClick={() => setView('satellite')}><Satellite size={17} /> {t('Satelit 2D')}</button>
        </div>
      </div>
      <div className="map-filterbar">
        <label htmlFor="map-search">{t('Cari titik wisata')}<input id="map-search" value={query} onChange={(event) => { setQuery(event.target.value); setActiveSlug(null); setFocusTarget('destination') }} placeholder={t('Contoh: Puncak...')} /></label>
        <label htmlFor="map-category">{t('Kategori')}<select id="map-category" value={category} onChange={(event) => { setCategory(event.target.value); setActiveSlug(null); setFocusTarget('destination') }}>{categories.map((item) => <option key={item} value={item}>{content(item)}</option>)}</select></label>
        <span className="map-result" role="status">{t('{visible} dari {total} titik terverifikasi', { visible: visiblePoints.length, total: points.length })}</span>
      </div>
      {locationError && <p className="map-location-message" role="status">{t(locationError)}</p>}
      <div className="tourism-map-grid">
        <div className="map-stage">
          {geography.kind === 'ready' && (
            <div className="map-actions">
              <button type="button" onClick={focusArea}>{t('Fokus wilayah')}</button>
              <button type="button" disabled={!selected} onClick={() => { if (selected) selectPoint(selected.slug) }}>{t('Fokus titik')}</button>
              <button type="button" disabled={locating} aria-busy={locating} onClick={locateUser}><LocateFixed size={14} /> {t('Lokasi saya')}</button>
            </div>
          )}
          {geography.kind === 'loading' && <LoadingStatus className="map-loading">{t('Memuat batas wilayah...')}</LoadingStatus>}
          {geography.kind === 'error' && <div className="map-data-error" role="alert"><p>{t('Data batas wilayah gagal dimuat. Periksa koneksi atau coba lagi.')}</p><button type="button" className="button button-dark" onClick={() => { setGeography({ kind: 'loading' }); setGeographyRetry((value) => value + 1) }}>{t('Coba lagi')}</button></div>}
          {geography.kind === 'ready' && (view === 'miniature'
            ? <MiniatureMap geography={geography.data} points={visiblePoints} selected={selected} userPosition={userPosition} focusPosition={focusPosition} focusSequence={focusSequence} areaSequence={areaSequence} onSelect={selectPoint} onFocusArea={focusArea} />
            : <SatelliteMap geography={geography.data} points={visiblePoints} selected={selected} userPosition={userPosition} focusPosition={focusPosition} focusSequence={focusSequence} areaSequence={areaSequence} onSelect={selectPoint} />)}
        </div>
        {points.length === 0 && <p className="map-area-note" role="status">{t('Tampilan kawasan saja; belum ada pin destinasi terverifikasi.')}</p>}
      </div>
      {points.length > 0 && (
        <section className="map-destination-list" aria-label={t('Daftar destinasi dengan GPS terverifikasi')}>
          <div className="map-destination-list-heading"><strong>{t('Destinasi terverifikasi')}</strong><span>{t(userPosition ? 'Jarak dihitung dari lokasi perangkat Anda' : 'Aktifkan Lokasi saya untuk menghitung jarak')}</span></div>
          <div className="map-destination-cards">
            {visiblePoints.map((point) => {
              const distance = userPosition ? haversineKm(userPosition, point.position) : null
              return (
                <article className={selected?.slug === point.slug ? 'map-destination-card selected' : 'map-destination-card'} key={point.slug}>
                  <button type="button" className="map-destination-select" aria-pressed={selected?.slug === point.slug} onClick={() => selectPoint(point.slug)}>
                    <span>{content(point.category)}</span><strong>{point.name}</strong>
                    <small>{point.accuracyMeters ? t('Akurasi GPS ±{accuracy} m', { accuracy: Math.round(point.accuracyMeters) }) : t('Akurasi GPS tidak dicatat')}</small>
                  </button>
                  <div className="map-destination-card-actions">
                    {distance !== null && <b>{distance < 1 ? `${Math.round(distance * 1000)} m` : `${new Intl.NumberFormat(language, { maximumFractionDigits: 1 }).format(distance)} km`}</b>}
                    <a href={directionsUrl(point.position)} target="_blank" rel="noreferrer">{t('Petunjuk arah')} ↗</a>
                  </div>
                </article>
              )
            })}
          </div>
          {visiblePoints.length === 0 && <p className="map-empty" role="status">{t('Tidak ada titik yang cocok. Coba kata kunci atau kategori lain.')}</p>}
        </section>
      )}
      <p className="gps-distance-disclaimer">{t('Jarak ditampilkan sebagai jarak garis lurus berdasarkan perhitungan koordinat, bukan estimasi jarak atau waktu perjalanan melalui jalan.')}</p>
    </div>
  )
}
