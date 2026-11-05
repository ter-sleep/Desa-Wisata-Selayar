'use client'

import dynamic from 'next/dynamic'
import { LoadingStatus } from '@/components/loading-status'
import { useSitePreferences } from '@/components/site-preferences'
import type { MapPoint } from '@/lib/map-data'

function MapLoading() {
  const { t } = useSitePreferences()
  return <LoadingStatus className="map-loading">{t('Memuat peta interaktif...')}</LoadingStatus>
}

const TourismMap = dynamic(() => import('./tourism-map').then((module) => module.TourismMap), { ssr: false, loading: MapLoading })

export function TourismMapLoader({ points }: { points: MapPoint[] }) {
  return <TourismMap points={points} />
}
