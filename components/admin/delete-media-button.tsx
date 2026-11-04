import { deleteDestinationMedia } from '@/lib/actions/media'
import { Trash2 } from 'lucide-react'

export function DeleteMediaButton({ id, label }: { id: string; label: string }) {
  return (
    <form action={deleteDestinationMedia}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="admin-button admin-button-danger" aria-label={`Hapus ${label}`}>
        <Trash2 size={15} /> Hapus
      </button>
    </form>
  )
}
