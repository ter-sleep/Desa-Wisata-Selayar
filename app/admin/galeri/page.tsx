import Link from 'next/link'
import { ArrowLeft, Images, ImagePlus } from 'lucide-react'
import { DeleteMediaButton } from '@/components/admin/delete-media-button'
import { MediaUploadForm } from '@/components/admin/media-upload-form'
import { updateDestinationMedia } from '@/lib/actions/media'
import { getAdminGalleryData } from '@/lib/queries/media'

export const dynamic = 'force-dynamic'

type SearchParams = Promise<{ status?: string; error?: string }>

const notices: Record<string, string> = {
  uploaded: 'Foto berhasil diunggah.',
  updated: 'Metadata dan pengaturan foto berhasil diperbarui.',
  deleted: 'Foto berhasil dihapus dari galeri dan storage.',
}

function formatBytes(value: number | null) {
  if (!value) return 'Ukuran belum tercatat'
  return value >= 1024 * 1024
    ? `${(value / (1024 * 1024)).toFixed(2)} MB`
    : `${Math.max(1, Math.round(value / 1024))} KB`
}

export default async function AdminGalleryPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, data] = await Promise.all([searchParams, getAdminGalleryData()])

  return (
    <div className="admin-dashboard">
      <section className="admin-page-heading">
        <div>
          <p className="eyebrow">MANAJEMEN KONTEN</p>
          <h1>Galeri dan dokumentasi</h1>
          <p>Unggah foto, kaitkan dengan destinasi, atur keterangan, foto sampul, dan publikasi.</p>
        </div>
        <Link href="/admin/destinasi" className="admin-button admin-button-secondary"><ArrowLeft size={15} /> Data destinasi</Link>
      </section>

      {params.status && notices[params.status] && <div className="admin-form-success" role="status">{notices[params.status]}</div>}
      {params.error && <div className="admin-form-alert" role="alert">{params.error}</div>}

      <section className="admin-list-summary">
        <div><Images size={18} /><span><strong>{data.media.length}</strong> foto termuat pada daftar (maksimal 200)</span></div>
        <span>{data.destinations.length} destinasi tersedia</span>
      </section>

      <section className="admin-media-section">
        <div className="admin-form-heading">
          <p className="eyebrow">TAMBAH DOKUMENTASI</p>
          <h2>Unggah foto baru</h2>
          <p>Pastikan foto merupakan dokumentasi yang boleh digunakan dan cantumkan kredit atau sumbernya.</p>
        </div>
        {data.destinations.length > 0 ? (
          <MediaUploadForm destinations={data.destinations} />
        ) : (
          <div className="admin-setup-warning">Belum ada destinasi. Tambahkan destinasi terlebih dahulu sebelum mengunggah foto.</div>
        )}
      </section>

      <section className="admin-media-section">
        <div className="admin-form-heading">
          <p className="eyebrow">MEDIA LIBRARY</p>
          <h2>Foto yang tersimpan</h2>
          <p>Foto disimpan di bucket privat. Pengunjung hanya menerima signed URL untuk foto yang dipublikasikan.</p>
        </div>

        {data.media.length > 0 ? (
          <div className="admin-media-grid">
            {data.media.map((media) => (
              <article className="admin-media-card" key={media.id}>
                <div className="admin-media-preview">
                  <img src={media.image_url} alt={media.alt_text || media.caption || media.destination_name} />
                  <div className="admin-media-badges">
                    {media.is_cover && <span className="admin-media-badge is-cover">Sampul</span>}
                    <span className={`admin-media-badge ${media.is_published ? 'is-published' : 'is-draft'}`}>
                      {media.is_published ? 'Published' : 'Draft'}
                    </span>
                  </div>
                </div>
                <div className="admin-media-content">
                  <strong>{media.destination_name}</strong>
                  <small>{media.mime_type || 'Format belum tercatat'} · {formatBytes(media.file_size_bytes)}</small>
                  <form action={updateDestinationMedia} className="admin-media-edit-form">
                    <input type="hidden" name="id" value={media.id} />
                    <label className="admin-field">
                      <span>Caption</span>
                      <input name="caption" maxLength={180} defaultValue={media.caption || ''} />
                    </label>
                    <label className="admin-field">
                      <span>Alt text</span>
                      <input name="alt_text" maxLength={250} defaultValue={media.alt_text || ''} />
                    </label>
                    <label className="admin-field">
                      <span>Kredit</span>
                      <input name="credit" maxLength={180} defaultValue={media.credit || ''} />
                    </label>
                    <label className="admin-field">
                      <span>Urutan tampil</span>
                      <input name="sort_order" type="number" min="0" max="100000" defaultValue={media.sort_order} />
                    </label>
                    <label className="media-checkbox"><input type="checkbox" name="is_published" defaultChecked={media.is_published} /> Tampilkan di website publik</label>
                    <label className="media-checkbox"><input type="checkbox" name="is_cover" defaultChecked={media.is_cover} /> Foto sampul destinasi</label>
                    <div className="admin-media-actions">
                      <button type="submit" className="admin-button admin-button-primary">Simpan perubahan</button>
                    </div>
                  </form>
                  <div className="admin-media-delete"><DeleteMediaButton id={media.id} label={media.caption || media.destination_name} /></div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="admin-empty-state">
            <ImagePlus size={27} />
            <strong>Belum ada foto dalam media library.</strong>
            <span>Gunakan formulir di atas untuk mengunggah dokumentasi destinasi.</span>
          </div>
        )}
      </section>
    </div>
  )
}
