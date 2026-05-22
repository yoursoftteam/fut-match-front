'use client'

import { useSearchParams } from "next/navigation"
import MatchDetails from '@/components/MatchDetails'

export default function MatchPageClient({ matchId }: { matchId: string }) {
  const searchParams = useSearchParams()
  const openedFromFrecuentes = searchParams.get("from") === "frecuentes"

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto">
        <MatchDetails matchId={matchId} openedFromFrecuentes={openedFromFrecuentes} />
      </div>
    </div>
  )
}
