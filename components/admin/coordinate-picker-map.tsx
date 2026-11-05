'use client'

import { useEffect } from 'react'
import { CircleMarker, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import type { LatLngExpression, LeafletMouseEvent } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { bontomarannuView } from '@/lib/map-data'

type Props = {
  latitude: number | null
  longitude: number | null
  onSelect: (latitude: number, longitude: number) => void
}

function ClickToSelect({ onSelect }: { onSelect: Props['onSelect'] }) {
  useMapEvents({
    click(event: LeafletMouseEvent) {
      onSelect(event.latlng.lat, event.latlng.lng)
    },
  })
  return null
}

function RecenterSelectedPoint({ latitude, longitude }: { latitude: number | null; longitude: number | null }) {
  const map = useMap()
  useEffect(() => {
    if (latitude !== null && longitude !== null) map.flyTo([latitude, longitude], Math.max(map.getZoom(), 16), { animate: true })
  }, [map, latitude, longitude])
  return null
}

export function CoordinatePickerMap({ latitude, longitude, onSelect }: Props) {
  const selected: LatLngExpression | null =
    latitude !== null && longitude !== null ? [latitude, longitude] : null

  return (
    <div className="gps-picker-map-shell">
      <MapContainer
        center={selected || bontomarannuView}
        zoom={selected ? 17 : 13}
        scrollWheelZoom
        className="gps-picker-map"
        aria-label="Pilih koordinat destinasi dengan mengeklik peta"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickToSelect onSelect={onSelect} />
        <RecenterSelectedPoint latitude={latitude} longitude={longitude} />
        {selected && (
          <CircleMarker
            center={selected}
            radius={10}
            pathOptions={{ color: '#fff', weight: 3, fillColor: '#176b4b', fillOpacity: 0.95 }}
          />
        )}
      </MapContainer>
      <div className="gps-picker-map-hint">Klik titik pada peta untuk memilih koordinat destinasi.</div>
    </div>
  )
}
