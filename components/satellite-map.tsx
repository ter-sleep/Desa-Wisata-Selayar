'use client'

import { Fragment, useEffect, useState } from 'react'
import { Circle, CircleMarker, GeoJSON, MapContainer, Popup, TileLayer, Tooltip, useMap, ZoomControl } from 'react-leaflet'
import { directionsUrl, satelliteTiles, type MapPoint, type Position } from '@/lib/map-data'
import { useSitePreferences } from '@/components/site-preferences'
import { geometryBounds, geometryCenter, preserveBoundaryDetail, type TourismGeography } from '@/lib/tourism-geography'
import 'leaflet/dist/leaflet.css'

function RecenterMap({ position, focusSequence }: { position: Position | null; focusSequence: number }) {
  const map = useMap()
  useEffect(() => {
    if (!position) return
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    map.flyTo(position, Math.max(map.getZoom(), 14), { animate, duration: .7 })
  }, [map, position, focusSequence])
  return null
}

function FocusRegion({ geography, areaSequence }: { geography: TourismGeography; areaSequence: number }) {
  const map = useMap()
  useEffect(() => {
    const bounds = geometryBounds(geography.village.geometry)
    map.fitBounds([[bounds.south, bounds.west], [bounds.north, bounds.east]], { padding: [35, 35], maxZoom: 14, animate: false })
  }, [map, geography, areaSequence])
  return null
}

function PopupAccessibility() {
  const map = useMap()
  const { t } = useSitePreferences()
  useEffect(() => {
    const localize = () => {
      map.getContainer().querySelectorAll('.leaflet-popup-close-button').forEach((button) => {
        button.setAttribute('aria-label', t('Tutup informasi lokasi'))
        button.setAttribute('title', t('Tutup informasi lokasi'))
      })
    }
    localize()
    map.on('popupopen', localize)
    return () => { map.off('popupopen', localize) }
  }, [map, t])
  return null
}

export function SatelliteMap({
  geography,
  points,
  selected,
  userPosition,
  focusPosition,
  focusSequence,
  areaSequence,
  onSelect,
}: {
  geography: TourismGeography
  points: MapPoint[]
  selected: MapPoint | null
  userPosition: Position | null
  focusPosition: Position | null
  focusSequence: number
  areaSequence: number
  onSelect: (slug: string) => void
}) {
  const { t, content, language } = useSitePreferences()
  const [imageryFailed, setImageryFailed] = useState(false)
  const [tileRetry, setTileRetry] = useState(0)
  function tileError() {
    console.error('A satellite map imagery tile could not be loaded.')
    setImageryFailed(true)
  }
  return (
    <div className="leaflet-shell">
      <MapContainer center={geometryCenter(geography.village.geometry)} zoom={12} maxZoom={18} scrollWheelZoom zoomControl={false} className="leaflet-map" aria-label={t('Peta destinasi wisata Bontomarannu')}>
        <TileLayer key={`satellite-${tileRetry}`} attribution="&copy; Esri, Maxar, Earthstar Geographics" url={satelliteTiles} eventHandlers={{ tileerror: tileError }} />
        <TileLayer key={`roads-${tileRetry}`} attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" opacity={.18} eventHandlers={{ tileerror: tileError }} />
        <ZoomControl key={language} position="bottomright" zoomInTitle={t('Perbesar peta')} zoomOutTitle={t('Perkecil peta')} />
        <GeoJSON data={geography.district.geometry} onEachFeature={preserveBoundaryDetail} style={{ color: '#f5dca3', weight: 2, dashArray: '7 5', fillOpacity: .03 }} />
        <GeoJSON data={geography.village.geometry} onEachFeature={preserveBoundaryDetail} style={{ color: '#fff9e9', weight: 8, opacity: .98, fillOpacity: 0 }} />
        <GeoJSON data={geography.village.geometry} onEachFeature={preserveBoundaryDetail} style={{ color: '#e76350', weight: 4, dashArray: '7 5', opacity: 1, fillColor: '#e76350', fillOpacity: .12 }}>
          <Tooltip permanent direction="center" className="map-region-label">{t('Desa Bontomarannu')}</Tooltip>
        </GeoJSON>
        <FocusRegion geography={geography} areaSequence={areaSequence} />
        <PopupAccessibility />
        <RecenterMap position={focusPosition} focusSequence={focusSequence} />
        {points.map((point) => (
          <Fragment key={point.slug}>
            {point.accuracyMeters && point.accuracyMeters > 0 && point.accuracyMeters <= 5000 && <Circle center={point.position} radius={point.accuracyMeters} pathOptions={{ color: '#f6c453', weight: 1, fillColor: '#f6c453', fillOpacity: .12 }} />}
            <CircleMarker
              center={point.position}
              radius={point.slug === selected?.slug ? 13 : 9}
              pathOptions={{ color: point.slug === selected?.slug ? '#f6c453' : '#fff6d7', fillColor: point.slug === selected?.slug ? '#f6c453' : '#173d32', fillOpacity: .95, weight: 3 }}
              eventHandlers={{ click: () => onSelect(point.slug) }}
            >
              <Tooltip permanent direction="top" offset={[0, -8]} opacity={.96} className="map-pin-label">{point.name}</Tooltip>
              <Popup>
                <div className="map-popup">
                  <span className="eyebrow">{content(point.category)}</span>
                  <strong>{point.name}</strong>
                  <p>{content(point.description)}</p>
                  <small>{content(point.status)} · {t('GPS terverifikasi')}{point.accuracyMeters ? ` · ${t('akurasi ±{accuracy} m', { accuracy: Math.round(point.accuracyMeters) })}` : ''}</small>
                  {point.coordinateSource && <small>{t('Sumber')}: {content(point.coordinateSource)}</small>}
                  <a href={`/destinasi/${encodeURIComponent(point.slug)}`}>{t('Buka halaman destinasi')} ↗</a>
                  <a href={directionsUrl(point.position)} target="_blank" rel="noreferrer">{t('Petunjuk arah')} ↗</a>
                </div>
              </Popup>
            </CircleMarker>
          </Fragment>
        ))}
        {userPosition && (
          <CircleMarker center={userPosition} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2879ca', fillOpacity: 1 }}>
            <Tooltip permanent direction="top">{t('Lokasi Anda')}</Tooltip>
          </CircleMarker>
        )}
      </MapContainer>
      <div className="map-overlay-badge"><span>{t('Batas wilayah')}</span><b>{t('Desa Bontomarannu')}</b><small>{t('Batas indikatif Desa Bontomarannu')}</small></div>
      <div className="map-credit">{t('Citra satelit Esri · overlay jalan OpenStreetMap')}</div>
      {imageryFailed && <div className="satellite-warning" role="alert"><span>{t('Sebagian citra peta satelit gagal dimuat. Periksa koneksi atau coba lagi.')}</span><button type="button" onClick={() => { setImageryFailed(false); setTileRetry((value) => value + 1) }}>{t('Coba lagi')}</button></div>}
      <div className="boundary-legend"><span><i className="legend-boundary" />{t('Desa Bontomarannu')}</span><span><i className="legend-district" />{t('Batas Kecamatan Bontomanai')}</span><small>{t('Data BIG · Juni 2026')}. {t('Batas desa bersifat indikatif, bukan penetapan batas hukum.')}</small></div>
    </div>
  )
}
