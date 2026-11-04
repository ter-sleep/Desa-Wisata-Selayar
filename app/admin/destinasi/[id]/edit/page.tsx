import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { DestinationForm } from '@/components/admin/destination-form'
import { requireStaffProfile } from '@/lib/auth/permissions'
import { createClient } from '@/lib/supabase/server'

type Props = {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}

export const dynamic = 'force-dynamic'

export default async function EditDestinationPage({ params, searchParams }: Props) {
  await requireStaffProfile()
  const [{ id }, query] = await Promise.all([params, searchParams])
  const supabase = await createClient()
  const { data, error } = await supabase.from('destinations').select('*').eq('id', id).maybeSingle()

  if (error) throw new Error(`Gagal memuat destinasi: ${error.message}`)
  if (!data) notFound()

  const initial = {
    id: data.id,
    slug: data.slug,
    name: data.name,
    category: data.category,
    eyebrow: data.eyebrow || '',
    description: data.description,
    image: data.image_url || '',
    imageUrl: data.image_url,
    status: data.status,
    details: data.details || [],
    dataSource: data.data_source || '',
    dataStatus: data.data_status || 'Perlu verifikasi',
    updatedYear: data.updated_year || new Date(data.updated_at).getFullYear(),
    sortOrder: data.sort_order,
    publicationStatus: data.publication_status,
  }

  return (
    <div className="admin-dashboard">
      <Link href="/admin/destinasi" className="admin-back-link"><ArrowLeft size={15} /> Kembali ke data destinasi</Link>
      <section className="admin-page-heading admin-form-heading">
        <div><p className="eyebrow">DATA DESTINASI</p><h1>Edit destinasi</h1><p>Perbarui informasi {data.name}. Perubahan akan tampil di website jika statusnya Published.</p></div>
      </section>
      <DestinationForm initial={initial} error={query.error} />
    </div>
  )
}
