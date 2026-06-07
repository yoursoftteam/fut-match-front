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

  // Compact version: single line
  if (compact) {
    return (
      <div
        className={cn(
          'rounded border px-3 py-2 flex items-center justify-between gap-2 transition-all duration-200 text-xs',
          borderColor,
          bgColor,
          className
        )}
      >
        {/* Time + Teams in a row */}
        <div className="flex items-center gap-1 flex-1 min-w-0">
          {/* Time */}
          <span className="text-muted-foreground font-mono whitespace-nowrap">{kickoffTime}</span>
          
          {/* Home Team */}
          <div className="flex-1 min-w-0">
            <CountryBadge
              name={match.home_team.name}
              fifa_code={match.home_team.fifa_code}
              flag_svg_url={match.home_team.flag_svg_url}
              size="xs"
            />
          </div>

          {/* vs separator + score */}
          <div className="text-muted-foreground font-bold mx-1">vs</div>

          {/* Away Team */}
          <div className="flex-1 min-w-0">
            <CountryBadge
              name={match.away_team.name}
              fifa_code={match.away_team.fifa_code}
              flag_svg_url={match.away_team.flag_svg_url}
              size="xs"
            />
          </div>
        </div>

        {/* Score Input or Display */}
        <div className="flex items-center gap-2 whitespace-nowrap">
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
              <span className="font-bold text-foreground">{prediction.home_score_predicted}</span>
              <span className="text-muted-foreground">-</span>
              <span className="font-bold text-foreground">{prediction.away_score_predicted}</span>
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
