'use client'

import dynamic from 'next/dynamic'
import type { MapPoint } from './tourism-map'

const TourismMap = dynamic(() => import('./tourism-map').then((module) => module.TourismMap), { ssr: false, loading: () => <div className="map-loading">Memuat citra satelit...</div> })

export function TourismMapLoader({ points }: { points: MapPoint[] }) {
  return <TourismMap points={points} />
}
