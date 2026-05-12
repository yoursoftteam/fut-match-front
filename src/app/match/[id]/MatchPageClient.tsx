'use client'

import { AuthGuard } from '@/components/AuthGuard'
import MatchDetails from '@/components/MatchDetails'

export default function MatchPageClient({ matchId }: { matchId: string }) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background py-12 px-4">
        <div className="mx-auto">
          <MatchDetails matchId={matchId} />
        </div>
      </div>
    </AuthGuard>
  )
}
