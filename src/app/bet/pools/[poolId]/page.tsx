import { PoolDetailView } from '@/components/bet/PoolDetailView'

export default async function PoolDetailPage({
  params,
}: {
  params: Promise<{ poolId: string }>
}) {
  const { poolId } = await params
  return <PoolDetailView poolId={poolId} />
}
