'use client'

import { Fragment, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import {
  Circle,
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  ZoomControl,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

export type MapPoint = {
  slug: string
  name: string
  category: string
  description: string
  position: [number, number]
  status: string
  accuracyMeters?: number
  coordinateSource?: string
}

type Position = [number, number]

function RecenterMap({ position }: { position: Position | null }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, Math.max(map.getZoom(), 14), { animate: true, duration: 0.7 })
  }, [map, position])
  return null
}

function MapActions({
  position,
  onLocate,
  onFocus,
  onError,
}: {
  position: Position | null
  onLocate: (position: Position) => void
  onFocus: () => void
  onError: (message: string) => void
}) {
  const map = useMap()

  function locateUser() {
    onError('')
    if (!navigator.geolocation) {
      onError('Browser tidak mendukung geolocation.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (result) => {
        const next: Position = [result.coords.latitude, result.coords.longitude]
        onLocate(next)
        map.flyTo(next, 15, { animate: true })
      },
      (error) => {
        const message = error.code === 1
          ? 'Izin lokasi ditolak. Aktifkan izin lokasi pada browser.'
          : error.code === 2
            ? 'Lokasi perangkat tidak tersedia.'
            : 'Permintaan lokasi melewati batas waktu. Coba lagi di area terbuka.'
        onError(message)
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  }

  return (
    <div className="map-actions">
      <button type="button" onClick={() => { onFocus(); if (position) map.flyTo(position, 15, { animate: true }) }}>
        Fokus titik
      </button>
      <button type="button" onClick={locateUser}>Lokasi saya</button>
    </div>
  )
}

function haversineKm(from: Position, to: Position) {
  const toRad = (value: number) => (value * Math.PI) / 180
  const earthRadiusKm = 6371.0088
  const dLat = toRad(to[0] - from[0])
  const dLng = toRad(to[1] - from[1])
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRad(from[0])) * Math.cos(toRad(to[0])) * Math.sin(dLng / 2) ** 2
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function directionsUrl(position: Position) {
  return `https://www.google.com/maps/dir/?api=1&destination=${position[0]},${position[1]}`
}

export function TourismMap({ points }: { points: MapPoint[] }) {
  const [active, setActive] = useState(0)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('Semua')
  const [userPosition, setUserPosition] = useState<Position | null>(null)
  const [locationMessage, setLocationMessage] = useState('')

  const categories = useMemo<string[]>(
    () => ['Semua', ...Array.from(new Set(points.map((point: MapPoint) => point.category)))],
    [points],
  )

  const visiblePoints = points.filter(
    (point) =>
      (category === 'Semua' || point.category === category) &&
      point.name.toLowerCase().includes(query.toLowerCase()),
  )

  const selected = visiblePoints[active] ?? visiblePoints[0] ?? null
  const focusPosition = userPosition || selected?.position || null

  return (
    <div className="tourism-map-wrap">
      <div className="map-toolbar">
        <div>
          <span className="eyebrow">Peta jelajah</span>
          <strong>Desa wisata Bontomarannu</strong>
          <p className="map-subtitle">Lokasi destinasi berdasarkan koordinat GPS yang telah diverifikasi pengelola.</p>
        </div>
        <span className="map-live"><i /> Peta interaktif</span>
      </div>

      <div className="map-filterbar">
        <label htmlFor="map-search">
          Cari titik wisata
          <input id="map-search" value={query} onChange={(event: ChangeEvent<HTMLInputElement>) => { setQuery(event.target.value); setActive(0) }} placeholder="Contoh: Puncak..." />
        </label>
        <label htmlFor="map-category">
          Kategori
          <select id="map-category" value={category} onChange={(event: ChangeEvent<HTMLSelectElement>) => { setCategory(event.target.value); setActive(0) }}>
            {categories.map((item: string) => <option key={item}>{item}</option>)}
          </select>
        </label>
        <span className="map-result">{visiblePoints.length} dari {points.length} titik terverifikasi</span>
      </div>

      {locationMessage && <p className="map-location-message" role="status">{locationMessage}</p>}

      <div className="tourism-map-grid">
        {points.length > 0 ? (
          <div className="leaflet-shell">
            <MapContainer
              center={selected?.position || points[0].position}
              zoom={11}
              scrollWheelZoom
              zoomControl={false}
              className="leaflet-map"
              aria-label="Peta destinasi wisata Bontomarannu"
            >
              <TileLayer
                attribution="&copy; Esri, Maxar, Earthstar Geographics"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              />
              <TileLayer
                attribution="&copy; OpenStreetMap contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                opacity={0.18}
              />
              <ZoomControl position="bottomright" />
              <RecenterMap position={focusPosition} />
              <MapActions
                position={selected?.position || points[0].position}
                onLocate={setUserPosition}
                onFocus={() => setUserPosition(null)}
                onError={setLocationMessage}
              />

              {visiblePoints.map((point, index) => (
                <Fragment key={point.slug}>
                  {point.accuracyMeters && point.accuracyMeters > 0 && point.accuracyMeters <= 5000 && (
                    <Circle
                      center={point.position}
                      radius={point.accuracyMeters}
                      pathOptions={{ color: '#f6c453', weight: 1, fillColor: '#f6c453', fillOpacity: 0.12 }}
                    />
                  )}
                  <CircleMarker
                    center={point.position}
                    radius={point === selected ? 13 : 9}
                    pathOptions={{
                      color: point === selected ? '#f6c453' : '#fff6d7',
                      fillColor: point === selected ? '#f6c453' : '#173d32',
                      fillOpacity: 0.95,
                      weight: 3,
                    }}
                    eventHandlers={{ click: () => setActive(index) }}
                  >
                    <Tooltip permanent direction="top" offset={[0, -8]} opacity={0.96} className="map-pin-label">{point.name}</Tooltip>
                    <Popup>
                      <div className="map-popup">
                        <span className="eyebrow">{point.category}</span>
                        <strong>{point.name}</strong>
                        <p>{point.description}</p>
                        <small>{point.status} · GPS terverifikasi{point.accuracyMeters ? ` · akurasi ±${Math.round(point.accuracyMeters)} m` : ''}</small>
                        {point.coordinateSource && <small>Sumber: {point.coordinateSource}</small>}
                        <a href={`/destinasi/${point.slug}`}>Buka halaman destinasi ↗</a>
                        <a href={directionsUrl(point.position)} target="_blank" rel="noreferrer">Petunjuk arah ↗</a>
                      </div>
                    </Popup>
                  </CircleMarker>
                </Fragment>
              ))}

              {userPosition && (
                <CircleMarker center={userPosition} radius={8} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2879ca', fillOpacity: 1 }}>
                  <Tooltip permanent direction="top">Lokasi Anda</Tooltip>
                </CircleMarker>
              )}
            </MapContainer>
            <div className="map-overlay-badge"><span>GPS VERIFIED</span><b>Klik pin untuk menjelajah</b><small>Petunjuk arah tersedia pada detail setiap titik.</small></div>
            <div className="map-credit">Citra satelit Esri · overlay jalan OpenStreetMap</div>
          </div>
        ) : (
          <div className="map-pending" role="status">
            <strong>Koordinat GPS belum tersedia</strong>
            <p>Belum ada destinasi dengan koordinat GPS terverifikasi. Peta akan menampilkan marker setelah pengelola memasukkan dan memvalidasi titik lokasi lapangan.</p>
          </div>
        )}
      </div>

      {points.length > 0 && (
        <section className="map-destination-list" aria-label="Daftar destinasi dengan GPS terverifikasi">
          <div className="map-destination-list-heading"><strong>Destinasi terverifikasi</strong><span>{userPosition ? 'Jarak dihitung dari lokasi perangkat Anda' : 'Aktifkan Lokasi saya untuk menghitung jarak'}</span></div>
          <div className="map-destination-cards">
            {visiblePoints.map((point) => {
              const distance = userPosition ? haversineKm(userPosition, point.position) : null
              return (
                <article className="map-destination-card" key={point.slug}>
                  <div><span>{point.category}</span><strong>{point.name}</strong><small>{point.accuracyMeters ? `Akurasi GPS ±${Math.round(point.accuracyMeters)} m` : 'Akurasi GPS tidak dicatat'}</small></div>
                  <div className="map-destination-card-actions">
                    {distance !== null && <b>{distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}</b>}
                    <a href={directionsUrl(point.position)} target="_blank" rel="noreferrer">Petunjuk arah ↗</a>
                  </div>
                </article>
              )
            })}
          </div>
          {visiblePoints.length === 0 && <p className="map-empty">Tidak ada destinasi yang sesuai dengan pencarian atau kategori ini.</p>}
        </section>
      )}
      <p className="gps-distance-disclaimer">Jarak ditampilkan sebagai jarak garis lurus berdasarkan perhitungan koordinat, bukan estimasi jarak atau waktu perjalanan melalui jalan.</p>
    </div>
  )
}
