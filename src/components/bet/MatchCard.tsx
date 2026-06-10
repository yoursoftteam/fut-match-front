'use client'

import * as React from 'react'
import { LockCountdown } from './LockCountdown'
import { ScoreInput } from './ScoreInput'
import { cn } from '@/lib/utils'
import { Clock, Lock } from 'lucide-react'

const STAGE_LABELS: Record<string, string> = {
  group_stage: 'Grupos',
  round_of_32: '32avos',
  round_of_16: '16avos',
  quarter_finals: 'Cuartos',
  semi_finals: 'Semifinal',
  third_place: '3er puesto',
  final: 'Final',
}

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

function TeamFlag({
  flag_svg_url,
  name,
  compact,
}: {
  flag_svg_url: string
  name: string
  compact: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      <div className={cn(
        'flex items-center justify-center overflow-hidden rounded-xl bg-slate-800/80 border border-slate-700/50 w-full',
        compact ? 'max-w-[80px] aspect-[4/3]' : 'max-w-[96px] aspect-[4/3]'
      )}>
        {flag_svg_url ? (
          <img
            src={flag_svg_url}
            alt={`Bandera de ${name}`}
            className="size-full object-cover"
          />
        ) : (
          <span className="text-[10px] font-bold text-slate-600 uppercase">{name.slice(0, 3)}</span>
        )}
      </div>
      <span className={cn(
        'font-medium text-slate-300 text-center leading-tight truncate',
        compact ? 'max-w-[80px] text-[10px]' : 'max-w-[96px] text-xs'
      )}>
        {name}
      </span>
    </div>
  )
}

function ScoreReadonly({ home, away }: { home: number; away: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-base font-bold tabular-nums text-slate-50 border border-slate-700">
        {home}
      </span>
      <span className="text-[11px] font-bold text-slate-600">VS</span>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-base font-bold tabular-nums text-slate-50 border border-slate-700">
        {away}
      </span>
    </div>
  )
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
    const now = Date.now()
    const kickoff = new Date(match.kickoff_at).getTime()
    const lockTime = kickoff - 10 * 60 * 1000
    setIsLocked(now >= lockTime)
  }, [match.kickoff_at])

  const isEditable = canEdit && !isLocked

  const stageLabel = STAGE_LABELS[match.stage] ?? match.stage

  const kickoffTime = new Date(match.kickoff_at).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const kickoffDate = new Date(match.kickoff_at).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short',
  })

  const stateBorder = isEditable
    ? 'border-emerald-500/30'
    : isLocked && match.status === 'scheduled'
    ? 'border-red-500/15'
    : 'border-slate-700/40'

  if (compact) {
    return (
      <div
        className={cn(
          'rounded-xl border bg-slate-900/40 px-3 py-2 fade-in-up',
          stateBorder,
          className
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="rounded-md bg-slate-800 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              {stageLabel}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
            <span>{kickoffDate}</span>
            <span className="font-mono">{kickoffTime}</span>
            {!isEditable && match.status === 'scheduled' && <Lock className="size-2.5 text-red-400/70" />}
            {isEditable && <Clock className="size-2.5 text-emerald-400/70" />}
          </div>
        </div>

        <div className="flex items-center justify-center gap-4">
          <div className="flex-1 flex justify-center min-w-0">
            <TeamFlag
              flag_svg_url={match.home_team.flag_svg_url}
              name={match.home_team.name}
              compact
            />
          </div>

          <div className="flex-shrink-0">
            {isEditable ? (
              <ScoreInput
                homeScore={prediction?.home_score_predicted ?? 0}
                awayScore={prediction?.away_score_predicted ?? 0}
                onChangeHome={(score) => onUpdatePrediction?.(score, prediction?.away_score_predicted ?? 0)}
                onChangeAway={(score) => onUpdatePrediction?.(prediction?.home_score_predicted ?? 0, score)}
                locked={isLocked}
              />
            ) : prediction ? (
              <ScoreReadonly home={prediction.home_score_predicted} away={prediction.away_score_predicted} />
            ) : (
              <span className="text-[10px] text-slate-600 italic">—</span>
            )}
          </div>

          <div className="flex-1 flex justify-center min-w-0">
            <TeamFlag
              flag_svg_url={match.away_team.flag_svg_url}
              name={match.away_team.name}
              compact
            />
          </div>
        </div>

        <div className="mt-1 flex justify-center">
          <LockCountdown kickoffAt={match.kickoff_at} showTimer={false} />
        </div>
      </div>
    )
  }

  const bgColor = isLocked ? 'bg-red-500/5' : canEdit ? 'bg-emerald-500/5' : 'bg-muted/50'
  const borderColorDesktop = !isLocked && canEdit ? 'border-emerald-500' : isLocked ? 'border-red-500/30' : 'border-border'

  return (
    <div
      className={cn(
        'rounded border p-3 md:p-4 fade-in-up',
        borderColorDesktop,
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
        <div className="flex items-center justify-center">
          <TeamFlag
            flag_svg_url={match.home_team.flag_svg_url}
            name={match.home_team.name}
            compact={false}
          />
        </div>

        {isEditable && (
          <div className="flex justify-center py-1">
            <ScoreInput
              homeScore={prediction?.home_score_predicted ?? 0}
              awayScore={prediction?.away_score_predicted ?? 0}
              onChangeHome={(score) => onUpdatePrediction?.(score, prediction?.away_score_predicted ?? 0)}
              onChangeAway={(score) => onUpdatePrediction?.(prediction?.home_score_predicted ?? 0, score)}
              locked={isLocked}
            />
          </div>
        )}

        {(isLocked || !canEdit) && prediction && (
          <div className="flex justify-center py-1">
            <ScoreReadonly home={prediction.home_score_predicted} away={prediction.away_score_predicted} />
          </div>
        )}

        <div className="flex items-center justify-center">
          <TeamFlag
            flag_svg_url={match.away_team.flag_svg_url}
            name={match.away_team.name}
            compact={false}
          />
        </div>
      </div>
    </div>
  )
}
