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
  compact?: boolean
}

export function MatchCard({
  match,
  prediction,
  canEdit,
  onUpdatePrediction,
  className,
  compact = false,
}: MatchCardProps) {
  const [isLocked, setIsLocked] = React.useState(false)

  React.useEffect(() => {
    const now = new Date()
    const kickoff = new Date(match.kickoff_at)
    const lockTime = new Date(kickoff.getTime() - 10 * 60 * 1000)
    setIsLocked(now >= lockTime)
  }, [match.kickoff_at])

  const borderColor = !isLocked && canEdit ? 'border-emerald-500' : isLocked ? 'border-red-500/30' : 'border-border'
  const bgColor = isLocked ? 'bg-red-500/5' : canEdit ? 'bg-emerald-500/5' : 'bg-muted/50'

  const kickoffTime = new Date(match.kickoff_at).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const kickoffDate = new Date(match.kickoff_at).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
  }).replace(' de ', ' ')

  // Compact version: stacked on mobile, single row on desktop
  if (compact) {
    return (
      <div
        className={cn(
          'rounded border px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 transition-all duration-200 text-xs',
          borderColor,
          bgColor,
          className
        )}
      >
        {/* Date + Time */}
        <div className="text-center sm:text-start text-muted-foreground font-mono text-xs">
          <span className="text-[0.625rem] uppercase tracking-wider">{kickoffDate}</span>
          <span className="ml-1">{kickoffTime}</span>
        </div>

        {/* Teams */}
        <div className="flex items-center justify-center gap-1.5 sm:flex-1 sm:min-w-0">
          <CountryBadge
            name={match.home_team.name}
            fifa_code={match.home_team.fifa_code}
            flag_svg_url={match.home_team.flag_svg_url}
            size="xs"
          />
          <span className="text-muted-foreground font-bold">vs</span>
          <CountryBadge
            name={match.away_team.name}
            fifa_code={match.away_team.fifa_code}
            flag_svg_url={match.away_team.flag_svg_url}
            size="xs"
          />
        </div>

        {/* Score Input or Display */}
        <div className="flex items-center justify-center sm:justify-end gap-1.5 sm:shrink-0 whitespace-nowrap">
          {canEdit && !isLocked && (
            <ScoreInput
              homeScore={prediction?.home_score_predicted ?? 0}
              awayScore={prediction?.away_score_predicted ?? 0}
              onChangeHome={(score) => onUpdatePrediction?.(score, prediction?.away_score_predicted ?? 0)}
              onChangeAway={(score) => onUpdatePrediction?.(prediction?.home_score_predicted ?? 0, score)}
              locked={isLocked}
              matchId={match.id}
              compact={true}
            />
          )}

          {(isLocked || !canEdit) && prediction && (
            <div className="flex items-center gap-1">
              <span className="font-bold text-foreground min-w-[1.5rem] text-center">{prediction.home_score_predicted}</span>
              <span className="text-muted-foreground">-</span>
              <span className="font-bold text-foreground min-w-[1.5rem] text-center">{prediction.away_score_predicted}</span>
            </div>
          )}

          <LockCountdown kickoffAt={match.kickoff_at} showTimer={false} />
        </div>
      </div>
    )
  }

  // Original full-size version
  return (
    <div
      className={cn(
        'rounded border p-3 md:p-4 transition-all duration-200',
        borderColor,
        bgColor,
        className
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded text-xs font-semibold text-muted-foreground">
            {kickoffTime}
          </span>
        </div>
        <LockCountdown kickoffAt={match.kickoff_at} showTimer={true} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <CountryBadge
            name={match.home_team.name}
            fifa_code={match.home_team.fifa_code}
            flag_svg_url={match.home_team.flag_svg_url}
            size="sm"
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
          <div className="flex items-center justify-center gap-2 py-1">
            <div className="text-center text-xs">
              <div className="font-bold text-foreground">{prediction.home_score_predicted}</div>
            </div>
            <div className="text-sm font-bold text-muted-foreground">-</div>
            <div className="text-center text-xs">
              <div className="font-bold text-foreground">{prediction.away_score_predicted}</div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <CountryBadge
            name={match.away_team.name}
            fifa_code={match.away_team.fifa_code}
            flag_svg_url={match.away_team.flag_svg_url}
            size="sm"
          />
        </div>
      </div>
    </div>
  )
}
