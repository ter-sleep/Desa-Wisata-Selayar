'use client'

import dynamic from 'next/dynamic'
import { LoadingStatus } from '@/components/loading-status'
import type { MapPoint } from './tourism-map'

const TourismMap = dynamic(() => import('./tourism-map').then((module) => module.TourismMap), { ssr: false, loading: () => <LoadingStatus className="map-loading">Memuat citra satelit...</LoadingStatus> })

export function TourismMapLoader({ points }: { points: MapPoint[] }) {
  return <TourismMap points={points} />
}
