import { PublicDataCenter } from '@/components/data/public-data-center'
import { getPublicDestinations } from '@/lib/queries/destinations'
import { Header, Footer } from '@/components/site'

export const dynamic = 'force-dynamic'

export default async function DataCenterPage() {
  const destinations = await getPublicDestinations()
  return <><Header /><PublicDataCenter destinations={destinations} /><Footer /></>
}
