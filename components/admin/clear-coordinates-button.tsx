'use client'

import { Trash2 } from 'lucide-react'
import type { MouseEvent } from 'react'
import { clearDestinationCoordinates } from '@/lib/actions/gps'

export function ClearCoordinatesButton({ id }: { id: string }) {
  return (
    <form action={clearDestinationCoordinates} className="gps-clear-form">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="admin-button admin-button-danger"
        onClick={(event: MouseEvent<HTMLButtonElement>) => {
          if (!window.confirm('Hapus koordinat destinasi ini? Marker publik akan dihilangkan.')) event.preventDefault()
        }}
      >
        <Trash2 size={14} /> Hapus koordinat tersimpan
      </button>
    </form>
  )
}
