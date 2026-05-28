'use client'

import * as React from 'react'
import { LockCountdown } from './LockCountdown'
import { ScoreInput } from './ScoreInput'
import { CountryBadge } from './CountryBadge'
import { cn } from '@/lib/utils'

export interface MatchCardProps {
  match: {
    id: string
    home_team: { name: string; fifa_code: string; flag_svg_url: string }
    away_team: { name: string; fifa_code: string; flag_svg_url: string }
    kickoff_at: string
    stage: string
    status: 'scheduled' | 'live' | 'finished'
  }
  prediction?: { home_score_predicted: number; away_score_predicted: number }
  canEdit: boolean
  onUpdatePrediction?: (homeScore: number, awayScore: number) => void
  className?: string
}

export function MatchCard({
  match,
  prediction,
  canEdit,
  onUpdatePrediction,
  className,
}: MatchCardProps) {
  const [isLocked, setIsLocked] = React.useState(false)

  React.useEffect(() => {
    const now = new Date()
    const kickoff = new Date(match.kickoff_at)
    const lockTime = new Date(kickoff.getTime() - 10 * 60 * 1000)
    setIsLocked(now >= lockTime)
  }, [match.kickoff_at])

  const borderColor = !isLocked && canEdit ? 'border-emerald-500' : isLocked ? 'border-red-500/30' : 'border-slate-700'
  const bgColor = isLocked ? 'bg-red-500/5' : canEdit ? 'bg-emerald-500/5' : 'bg-slate-900/50'

  const kickoffTime = new Date(match.kickoff_at).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const kickoffDate = new Date(match.kickoff_at).toLocaleDateString('es-CO', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div
      className={cn(
        'rounded-lg border p-4 md:p-6',
        borderColor,
        bgColor,
        className
      )}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 md:text-sm">
            {match.stage}
          </span>
          <span className="text-xs text-slate-400 md:text-sm">
            {kickoffDate} - {kickoffTime}
          </span>
        </div>
        <LockCountdown kickoffAt={match.kickoff_at} showTimer={true} />
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <CountryBadge
            name={match.home_team.name}
            fifa_code={match.home_team.fifa_code}
            flag_svg_url={match.home_team.flag_svg_url}
            size="md"
          />
        </div>

        {canEdit && !isLocked && (
          <ScoreInput
            homeScore={prediction?.home_score_predicted ?? 0}
            awayScore={prediction?.away_score_predicted ?? 0}
            onChangeHome={(score) => onUpdatePrediction?.(score, prediction?.away_score_predicted ?? 0)}
            onChangeAway={(score) => onUpdatePrediction?.(prediction?.home_score_predicted ?? 0, score)}
            locked={isLocked}
            matchId={match.id}
          />
        )}

        {(isLocked || !canEdit) && prediction && (
          <div className="flex items-center justify-center gap-3 py-2">
            <div className="text-right text-sm md:text-base">
              <div className="font-bold text-slate-50">{prediction.home_score_predicted}</div>
              <div className="text-xs text-slate-400">Pred</div>
            </div>
            <div className="text-xl font-bold text-slate-400">-</div>
            <div className="text-left text-sm md:text-base">
              <div className="font-bold text-slate-50">{prediction.away_score_predicted}</div>
              <div className="text-xs text-slate-400">Pred</div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <CountryBadge
            name={match.away_team.name}
            fifa_code={match.away_team.fifa_code}
            flag_svg_url={match.away_team.flag_svg_url}
            size="md"
          />
        </div>
      </div>
    </div>
  )
}
