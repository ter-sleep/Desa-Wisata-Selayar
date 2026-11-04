'use client'

import { useEffect, useState } from 'react'

const FALLBACK_IMAGE = '/images/destination-placeholder.svg'

export function DestinationImage({
  src,
  alt,
  className,
  loading = 'lazy',
}: {
  src: string
  alt: string
  className?: string
  loading?: 'eager' | 'lazy'
}) {
  const [currentSrc, setCurrentSrc] = useState(src || FALLBACK_IMAGE)

  useEffect(() => {
    setCurrentSrc(src || FALLBACK_IMAGE)
  }, [src])

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={className}
      loading={loading}
      onError={() => {
        if (currentSrc !== FALLBACK_IMAGE) setCurrentSrc(FALLBACK_IMAGE)
      }}
    />
  )
}
