import { uploadDestinationMedia } from '@/lib/actions/media'
import type { Database } from '@/types/database'

type DestinationOption = Pick<
  Database['public']['Tables']['destinations']['Row'],
  'id' | 'name' | 'publication_status'
>

export function MediaUploadForm({ destinations }: { destinations: DestinationOption[] }) {
  return (
    <form action={uploadDestinationMedia} className="admin-form media-upload-form" encType="multipart/form-data">
      <div className="admin-form-grid">
        <label className="admin-field">
          <span>Destinasi <b>*</b></span>
          <select name="destination_id" required defaultValue="">
            <option value="" disabled>Pilih destinasi</option>
            {destinations.map((destination) => (
              <option key={destination.id} value={destination.id}>
                {destination.name}{destination.publication_status !== 'published' ? ` (${destination.publication_status})` : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          <span>File foto <b>*</b></span>
          <input name="file" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required />
          <small>JPG, PNG, WebP, AVIF. Maksimal 8 MB per file.</small>
        </label>
        <label className="admin-field">
          <span>Caption</span>
          <input name="caption" maxLength={180} placeholder="Keterangan singkat foto" />
        </label>
        <label className="admin-field">
          <span>Teks alternatif (alt text)</span>
          <input name="alt_text" maxLength={250} placeholder="Deskripsi visual untuk aksesibilitas" />
        </label>
        <label className="admin-field admin-field-full">
          <span>Kredit / sumber dokumentasi</span>
          <input name="credit" maxLength={180} placeholder="Nama fotografer, pengelola, atau sumber dan izin" />
        </label>
      </div>
      <div className="media-upload-options">
        <label><input type="checkbox" name="is_published" /> Publikasikan setelah upload</label>
        <label><input type="checkbox" name="is_cover" /> Jadikan foto sampul (wajib dipublikasikan)</label>
      </div>
      <div className="admin-form-actions">
        <button type="submit" className="admin-button admin-button-primary">Unggah foto</button>
      </div>
    </form>
  )
}
