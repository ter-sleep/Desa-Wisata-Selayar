import Link from 'next/link'
import { createDestination, updateDestination } from '@/lib/actions/destinations'
import type { PublicationStatus } from '@/types/database'

type DestinationFormValues = {
  id?: string
  slug?: string
  name?: string
  category?: string
  eyebrow?: string | null
  description?: string
  image?: string | null
  imageUrl?: string | null
  status?: string
  details?: string[]
  dataSource?: string | null
  dataStatus?: string
  updatedYear?: number | string | null
  sortOrder?: number | null
  publicationStatus?: PublicationStatus
}

const categories = ['Alam', 'Agrowisata', 'Sejarah', 'Budaya', 'Bahari', 'Edukasi', 'Lainnya']

export function DestinationForm({
  initial,
  error,
}: {
  initial?: DestinationFormValues
  error?: string
}) {
  const isEdit = Boolean(initial?.id)
  const action = isEdit ? updateDestination : createDestination

  return (
    <form action={action} className="admin-form">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      {error && <div className="admin-form-alert" role="alert">{error}</div>}

      <div className="admin-form-grid">
        <label className="admin-field">
          <span>Nama destinasi <b>*</b></span>
          <input name="name" required minLength={2} maxLength={160} defaultValue={initial?.name || ''} placeholder="Contoh: Puncak Tanadoang" />
        </label>
        <label className="admin-field">
          <span>Slug URL</span>
          <input name="slug" maxLength={180} defaultValue={initial?.slug || ''} placeholder="puncak-tanadoang" />
          <small>Kosongkan untuk membuat slug otomatis dari nama destinasi.</small>
        </label>
        <label className="admin-field">
          <span>Kategori <b>*</b></span>
          <select name="category" required defaultValue={initial?.category || 'Alam'}>
            {categories.map((category) => <option value={category} key={category}>{category}</option>)}
          </select>
        </label>
        <label className="admin-field">
          <span>Eyebrow / label singkat</span>
          <input name="eyebrow" maxLength={120} defaultValue={initial?.eyebrow || ''} placeholder="Ikon desa wisata" />
        </label>
        <label className="admin-field admin-field-full">
          <span>Deskripsi <b>*</b></span>
          <textarea name="description" maxLength={5000} rows={5} defaultValue={initial?.description || ''} placeholder="Jelaskan karakter dan daya tarik destinasi." required />
        </label>
        <label className="admin-field admin-field-full">
          <span>URL gambar utama</span>
          <input name="image_url" type="text" defaultValue={initial?.imageUrl || initial?.image || ''} placeholder="https://..." />
          <small>Gunakan URL HTTP(S) atau path lokal. Foto sampul juga dapat diatur melalui menu Galeri.</small>
        </label>
        <label className="admin-field">
          <span>Status informasi</span>
          <input name="status" maxLength={160} defaultValue={initial?.status || 'Informasi perlu dikonfirmasi'} />
        </label>
        <label className="admin-field">
          <span>Urutan tampil</span>
          <input name="sort_order" type="number" min="0" max="100000" defaultValue={initial?.sortOrder ?? 100} />
          <small>Angka lebih kecil ditampilkan lebih dahulu pada katalog dan beranda.</small>
        </label>
        <label className="admin-field">
          <span>Tahun pembaruan</span>
          <input name="updated_year" type="number" min="1900" max="2200" defaultValue={initial?.updatedYear || new Date().getFullYear()} />
        </label>
        <label className="admin-field">
          <span>Sumber data</span>
          <input name="data_source" maxLength={300} defaultValue={initial?.dataSource || ''} placeholder="Sumber dokumen / survei" />
        </label>
        <label className="admin-field">
          <span>Status kesiapan data</span>
          <input name="data_status" maxLength={160} defaultValue={initial?.dataStatus || 'Perlu verifikasi'} />
        </label>
        <label className="admin-field admin-field-full">
          <span>Detail / daya tarik (satu item per baris)</span>
          <textarea name="details" rows={4} defaultValue={initial?.details?.join('\n') || ''} placeholder={'Panorama perbukitan\nJalur trekking\nRuang terbuka'} />
        </label>
        <label className="admin-field">
          <span>Status publikasi</span>
          <select name="publication_status" defaultValue={initial?.publicationStatus || 'draft'}>
            <option value="draft">Draft — belum tampil publik</option>
            <option value="published">Published — tampil di website</option>
            <option value="archived">Archived — diarsipkan</option>
          </select>
        </label>
      </div>

      {isEdit && (
        <div className="admin-coordinate-note">
          <strong>Data koordinat GPS tidak diubah pada formulir ini.</strong>
          <span>Gunakan menu GPS untuk mengelola dan memverifikasi titik berdasarkan sumber yang dapat diperiksa.</span>
        </div>
      )}

      <div className="admin-form-actions">
        <Link href="/admin/destinasi" className="admin-button admin-button-secondary">Batal</Link>
        <button type="submit" className="admin-button admin-button-primary">{isEdit ? 'Simpan perubahan' : 'Simpan destinasi'}</button>
      </div>
    </form>
  )
}
