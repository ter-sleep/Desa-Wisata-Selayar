'use client'

import { Trash2 } from 'lucide-react'
import { deleteDestination } from '@/lib/actions/destinations'

export function DeleteDestinationButton({ id, name }: { id: string; name: string }) {
  return (
    <form action={deleteDestination}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        aria-label={`Hapus ${name}`}
        title="Hapus destinasi"
        onClick={(event) => {
          if (!window.confirm(`Hapus destinasi “${name}”? Tindakan ini tidak dapat dibatalkan.`)) {
            event.preventDefault()
          }
        }}
      >
        <Trash2 size={16} />
      </button>
    </form>
  )
}
