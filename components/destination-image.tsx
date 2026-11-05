'use client'

import { useState } from 'react'

const FALLBACK_IMAGE = '/images/destination-placeholder.svg'

type DestinationImageProps = {
  src: string
  alt: string
  className?: string
  loading?: 'eager' | 'lazy'
}

export function DestinationImage(props: DestinationImageProps) {
  return <ImageWithFallback key={props.src} {...props} />
}

function ImageWithFallback({
  src,
  alt,
  className,
  loading = 'lazy',
}: DestinationImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src || FALLBACK_IMAGE)

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
