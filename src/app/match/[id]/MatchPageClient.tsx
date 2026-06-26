'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import MatchDetails from '@/components/MatchDetails'

export default function MatchPageClient({ matchId }: { matchId: string }) {
  const searchParams = useSearchParams()

  useEffect(() => {
    if (searchParams.get('compartir') === '1') {
      const url = `${window.location.origin}/match/${matchId}`
      if (typeof navigator.share === 'function') {
        navigator.share({
          title: 'Partido de fútbol',
          text: 'Únete a este partido',
          url,
        }).catch(() => {})
      }
    }
  }, [searchParams, matchId])

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto">
        <MatchDetails matchId={matchId} editParam={searchParams.get('edit')} />
      </div>
    </div>
  )
}
