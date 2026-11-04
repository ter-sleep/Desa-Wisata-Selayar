import { PublicDataCenter } from '@/components/data/public-data-center'
import { getPublicDestinations } from '@/lib/queries/destinations'

export const dynamic = 'force-dynamic'

export default async function DataCenterPage() {
  const destinations = await getPublicDestinations()
  return <PublicDataCenter destinations={destinations} />
}
