'use client'

import dynamic from 'next/dynamic'
import { useState, type ChangeEvent } from 'react'
import { Crosshair, MapPin, Save } from 'lucide-react'
import { LoadingStatus } from '@/components/loading-status'
import { saveDestinationCoordinates } from '@/lib/actions/gps'

const CoordinatePickerMap = dynamic(
  () => import('@/components/admin/coordinate-picker-map').then((module) => module.CoordinatePickerMap),
  { ssr: false, loading: () => <LoadingStatus className="gps-picker-map-loading">Memuat peta pemilih koordinat...</LoadingStatus> },
)

type Props = {
  id: string
  updatedAt: string
  latitude: number | null
  longitude: number | null
  accuracyMeters: number | null
  source: string | null
  method: string | null
}

function formatCoordinate(value: number | null) {
  return value === null ? '' : String(value)
}

export function GpsCoordinateForm({ id, updatedAt, latitude: initialLat, longitude: initialLng, accuracyMeters, source, method }: Props) {
  const [latitude, setLatitude] = useState(formatCoordinate(initialLat))
  const [longitude, setLongitude] = useState(formatCoordinate(initialLng))
  const [accuracy, setAccuracy] = useState(accuracyMeters === null ? '' : String(accuracyMeters))
  const [coordinateMethod, setCoordinateMethod] = useState(method || '')
  const [coordinateSource, setCoordinateSource] = useState(source || '')
  const [geoMessage, setGeoMessage] = useState('')

  function useDeviceLocation() {
    setGeoMessage('')
    if (!('geolocation' in navigator)) {
      setGeoMessage('Browser ini tidak mendukung geolocation.')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(7))
        setLongitude(position.coords.longitude.toFixed(7))
        setAccuracy(position.coords.accuracy.toFixed(1))
        setCoordinateMethod('device_gps')
        setCoordinateSource('GPS perangkat saat survei lapangan')
        setGeoMessage(`Lokasi berhasil diambil dengan perkiraan akurasi ±${Math.round(position.coords.accuracy)} meter.`)
      },
      (error) => {
        const messages: Record<number, string> = {
          1: 'Izin lokasi ditolak. Aktifkan izin lokasi pada browser lalu coba lagi.',
          2: 'Lokasi perangkat tidak tersedia. Periksa GPS atau koneksi perangkat.',
          3: 'Permintaan lokasi melewati batas waktu. Coba lagi di area terbuka.',
        }
        setGeoMessage(messages[error.code] || 'Lokasi perangkat gagal diambil.')
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    )
  }

  function selectMapPoint(lat: number, lng: number) {
    setLatitude(lat.toFixed(7))
    setLongitude(lng.toFixed(7))
    setAccuracy('')
    setCoordinateMethod('map_pin')
    setCoordinateSource('Titik dipilih manual pada peta OpenStreetMap')
    setGeoMessage('Titik peta dipilih. Periksa kembali posisi sebelum menyimpan.')
  }

  return (
    <form action={saveDestinationCoordinates} className="admin-form gps-coordinate-form">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="updated_at" value={updatedAt} />
      <div className="gps-method-actions">
        <button type="button" className="admin-button admin-button-primary" onClick={useDeviceLocation}>
          <Crosshair size={15} /> Gunakan GPS perangkat
        </button>
        <span>GPS hanya diminta setelah tombol ditekan. Gunakan HTTPS atau localhost.</span>
      </div>

      {geoMessage && <div className="admin-form-success gps-live-message" role="status">{geoMessage}</div>}

      <div className="admin-form-grid gps-fields-grid">
        <label className="admin-field">
          <span>Latitude <b>*</b></span>
          <input name="latitude" type="number" step="any" min="-90" max="90" required value={latitude} onChange={(event: ChangeEvent<HTMLInputElement>) => setLatitude(event.target.value)} placeholder="Contoh: -6.0790200" />
        </label>
        <label className="admin-field">
          <span>Longitude <b>*</b></span>
          <input name="longitude" type="number" step="any" min="-180" max="180" required value={longitude} onChange={(event: ChangeEvent<HTMLInputElement>) => setLongitude(event.target.value)} placeholder="Contoh: 120.5293700" />
        </label>
        <label className="admin-field">
          <span>Akurasi GPS (meter)</span>
          <input name="gps_accuracy_m" type="number" min="0" max="100000" step="0.1" value={accuracy} onChange={(event: ChangeEvent<HTMLInputElement>) => setAccuracy(event.target.value)} placeholder="Kosongkan jika tidak tersedia" />
          <small>Nilai ini berasal dari perangkat; untuk pin manual biarkan kosong.</small>
        </label>
        <label className="admin-field">
          <span>Metode pencatatan</span>
          <select name="coordinate_method" required value={coordinateMethod} onChange={(event: ChangeEvent<HTMLSelectElement>) => setCoordinateMethod(event.target.value)}>
            <option value="">Pilih metode pencatatan</option>
            <option value="device_gps">GPS perangkat</option>
            <option value="map_pin">Pin manual pada peta</option>
            <option value="external_reference">Referensi eksternal / dokumen</option>
          </select>
        </label>
        <label className="admin-field admin-field-full">
          <span>Sumber / catatan pengambilan koordinat <b>*</b></span>
          <input name="coordinate_source" minLength={5} maxLength={300} required value={coordinateSource} onChange={(event: ChangeEvent<HTMLInputElement>) => setCoordinateSource(event.target.value)} placeholder="Contoh: Survei lapangan 4 November 2026 menggunakan GPS ponsel" />
          <small>Catat siapa/sumber, cara, dan konteks pengambilan. Jangan menuliskan perkiraan sebagai hasil survei.</small>
        </label>
      </div>

      <div className="gps-selected-coordinate" aria-live="polite">
        <MapPin size={17} />
        <span><strong>Titik yang akan disimpan</strong><small>{latitude && longitude ? `${latitude}, ${longitude}` : 'Belum ada titik yang dipilih'}</small></span>
      </div>

      <div className="gps-picker-heading">
        <div><strong>Pilih titik secara manual</strong><small>Geser dan zoom peta, lalu klik tepat pada lokasi destinasi.</small></div>
      </div>
      <CoordinatePickerMap
        latitude={latitude && Number.isFinite(Number(latitude)) ? Number(latitude) : null}
        longitude={longitude && Number.isFinite(Number(longitude)) ? Number(longitude) : null}
        onSelect={selectMapPoint}
      />

      <div className="admin-form-actions gps-form-actions">
        <button type="submit" className="admin-button admin-button-primary"><Save size={15} /> Simpan koordinat sebagai menunggu verifikasi</button>
      </div>
    </form>
  )
}
