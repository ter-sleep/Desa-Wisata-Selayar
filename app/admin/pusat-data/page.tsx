import { PublicDataCenter } from '@/components/data/public-data-center'
import { getPublicDestinations } from '@/lib/queries/destinations'

export const dynamic = 'force-dynamic'

// Dilindungi oleh app/admin/layout.tsx (requireStaffProfile).
export default async function AdminDataCenterPage() {
  const destinations = await getPublicDestinations()
  return <PublicDataCenter destinations={destinations} embedded />
}
