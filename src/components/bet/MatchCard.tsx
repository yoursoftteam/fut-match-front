'use client'

import * as React from 'react'
import { LockCountdown } from './LockCountdown'
import { ScoreInput } from './ScoreInput'
import { cn } from '@/lib/utils'

const STAGE_LABELS: Record<string, string> = {
  group_stage: 'Grupo',
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
    group_name?: string
    status: 'scheduled' | 'live' | 'finished'
    home_score_official?: number | null
    away_score_official?: number | null
  }
  prediction?: {
    home_score_predicted: number
    away_score_predicted: number
    points_earned?: number | null
  }
  canEdit: boolean
  onUpdatePrediction?: (homeScore: number, awayScore: number) => void
  onClick?: () => void
  onShowGroup?: () => void
  showGroupTable?: boolean
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
        'flex items-center justify-center overflow-hidden rounded-xl bg-muted/80 border border-border/50 w-full',
        compact ? 'max-w-[80px] aspect-[4/3]' : 'max-w-[96px] aspect-[4/3]'
      )}>
        {flag_svg_url ? (
          <img
            src={flag_svg_url}
            alt={`Bandera de ${name}`}
            className="size-full object-cover"
          />
        ) : (
          <span className="text-[10px] font-bold text-muted-foreground uppercase">{name.slice(0, 3)}</span>
        )}
      </div>
      <span className={cn(
        'font-medium text-foreground text-center leading-tight truncate',
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
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-base font-bold tabular-nums text-foreground border border-border">
        {home}
      </span>
      <span className="text-[11px] font-bold text-muted-foreground">VS</span>
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-base font-bold tabular-nums text-foreground border border-border">
        {away}
      </span>
    </div>
  )
}

import { evaluatePrediction, ACCURACY_THEMES } from '@/lib/bet-result-utils'

function MatchResultDisplay({
  prediction,
  officialHome,
  officialAway,
  pointsEarned,
}: {
  prediction: { home: number; away: number }
  officialHome: number | null | undefined
  officialAway: number | null | undefined
  pointsEarned?: number | null
}) {
  const hasOfficial = officialHome !== null && officialHome !== undefined && officialAway !== null && officialAway !== undefined
  const evaluation = hasOfficial ? evaluatePrediction(prediction, { home: officialHome!, away: officialAway! }) : null
  const theme = evaluation ? ACCURACY_THEMES[evaluation.accuracy] : null

  return (
    <div className="flex flex-col items-center gap-1.5">
      <ScoreReadonly home={prediction.home} away={prediction.away} />

      {hasOfficial && (
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[9px] sm:text-[10px] text-muted-foreground">Marcador final</span>
          <span className="text-[11px] sm:text-xs font-semibold tabular-nums text-foreground">
            {officialHome} – {officialAway}
          </span>
        </div>
      )}

      {pointsEarned !== null && pointsEarned !== undefined && (
        <span className={cn('text-[11px] font-semibold', theme?.points ?? 'text-emerald-600 dark:text-emerald-400')}>
          +{pointsEarned} pts
        </span>
      )}
    </div>
  )
}

export function MatchCard({
  match,
  prediction,
  canEdit,
  onUpdatePrediction,
  onClick,
  onShowGroup,
  showGroupTable = true,
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

  const stageLabel = match.group_name
    ? `${STAGE_LABELS[match.stage] ?? match.stage} ${match.group_name}`
    : STAGE_LABELS[match.stage] ?? match.stage

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
    : 'border-border/40'

  const isClickable = match.status !== 'scheduled' && !!onClick

  if (compact) {
    return (
      <div
        className={cn(
          'rounded-xl border bg-card/40 px-3 py-2 fade-in-up',
          stateBorder,
          isClickable && 'cursor-pointer transition-colors hover:bg-muted/50',
          className
        )}
        onClick={isClickable ? onClick : undefined}
        role={isClickable ? 'button' : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } } : undefined}
      >
        <div className="mb-2 grid grid-cols-3 items-center gap-2">
          <span
            className={cn(
              'rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider justify-self-start',
              onShowGroup && showGroupTable
                ? 'cursor-pointer bg-emerald-500/15 text-emerald-400 transition-colors hover:bg-emerald-500/25'
                : 'bg-muted text-muted-foreground'
            )}
            onClick={onShowGroup && showGroupTable ? (e) => { e.stopPropagation(); onShowGroup() } : undefined}
            role={onShowGroup && showGroupTable ? 'button' : undefined}
            tabIndex={onShowGroup && showGroupTable ? 0 : undefined}
            onKeyDown={onShowGroup && showGroupTable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onShowGroup() } } : undefined}
          >
            {onShowGroup && showGroupTable ? `Ver Tabla Grupo ${match.group_name}` : stageLabel}
          </span>
          <div className="flex justify-center">
            <LockCountdown kickoffAt={match.kickoff_at} status={match.status} showTimer={false} />
          </div>
          <span className="flex items-center gap-1.5 justify-end text-[10px] text-muted-foreground">
            <span>{kickoffDate}</span>
            <span className="font-mono">{kickoffTime}</span>
          </span>
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
            {match.status === 'finished' && prediction ? (
              <MatchResultDisplay
                prediction={{ home: prediction.home_score_predicted, away: prediction.away_score_predicted }}
                officialHome={match.home_score_official}
                officialAway={match.away_score_official}
                pointsEarned={prediction.points_earned}
              />
            ) : isEditable ? (
              <ScoreInput
                homeScore={prediction?.home_score_predicted ?? 0}
                awayScore={prediction?.away_score_predicted ?? 0}
                onChangeHome={(score) => onUpdatePrediction?.(score, prediction?.away_score_predicted ?? 0)}
                onChangeAway={(score) => onUpdatePrediction?.(prediction?.home_score_predicted ?? 0, score)}
                locked={isLocked}
                hasPrediction={!!prediction}
              />
            ) : prediction ? (
              <ScoreReadonly home={prediction.home_score_predicted} away={prediction.away_score_predicted} />
            ) : (
              <span className="text-[10px] text-muted-foreground italic">—</span>
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
        isClickable && 'cursor-pointer transition-colors hover:bg-muted/50',
        className
      )}
      onClick={isClickable ? onClick : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.() } } : undefined}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded text-xs font-semibold text-muted-foreground">
            {kickoffTime}
          </span>
        </div>
        <LockCountdown kickoffAt={match.kickoff_at} status={match.status} showTimer={true} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-center">
          <TeamFlag
            flag_svg_url={match.home_team.flag_svg_url}
            name={match.home_team.name}
            compact={false}
          />
        </div>

        {match.status === 'finished' && prediction ? (
          <div className="flex justify-center py-1">
            <MatchResultDisplay
              prediction={{ home: prediction.home_score_predicted, away: prediction.away_score_predicted }}
              officialHome={match.home_score_official}
              officialAway={match.away_score_official}
              pointsEarned={prediction.points_earned}
            />
          </div>
        ) : isEditable ? (
          <div className="flex justify-center py-1">
            <ScoreInput
              homeScore={prediction?.home_score_predicted ?? 0}
              awayScore={prediction?.away_score_predicted ?? 0}
              onChangeHome={(score) => onUpdatePrediction?.(score, prediction?.away_score_predicted ?? 0)}
              onChangeAway={(score) => onUpdatePrediction?.(prediction?.home_score_predicted ?? 0, score)}
              locked={isLocked}
              hasPrediction={!!prediction}
            />
          </div>
        ) : prediction ? (
          <div className="flex justify-center py-1">
            <ScoreReadonly home={prediction.home_score_predicted} away={prediction.away_score_predicted} />
          </div>
        ) : null}

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
