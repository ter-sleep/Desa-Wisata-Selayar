import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { DestinationForm } from '@/components/admin/destination-form'
import { requireStaffProfile } from '@/lib/auth/permissions'

type SearchParams = Promise<{ error?: string }>

export default async function NewDestinationPage({ searchParams }: { searchParams: SearchParams }) {
  await requireStaffProfile()
  const params = await searchParams

  return (
    <div className="admin-dashboard">
      <Link href="/admin/destinasi" className="admin-back-link"><ArrowLeft size={15} /> Kembali ke data destinasi</Link>
      <section className="admin-page-heading admin-form-heading">
        <div><p className="eyebrow">DATA DESTINASI</p><h1>Tambah destinasi</h1><p>Isi informasi dasar. Simpan sebagai draft bila data belum siap dipublikasikan.</p></div>
      </section>
      <DestinationForm error={params.error} />
    </div>
  )
}
