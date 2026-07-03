'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MapPin, Users, Calendar, ChevronRight, Trash2, Share2, Check } from 'lucide-react'
import type { Match } from '@/hooks/useMatches'
import { getLocalTimeInputValue } from '@/lib/date-utils'
import { POSITIONS, type PositionOption } from '@/lib/positions'
import SaveFrecuenteButton from '@/components/SaveFrecuenteButton'

function getLevelInfo(maxPlayers: number): { label: string; cls: string } {
  if (maxPlayers <= 6) return { label: 'Casual', cls: 'level-casual' }
  if (maxPlayers <= 10) return { label: 'Semi-Pro', cls: 'level-semipro' }
  return { label: 'Pro', cls: 'level-pro' }
}

function getMatchStatus(dateStr: string): { label: string; cls: string } | null {
  const now = new Date()
  const matchDate = new Date(dateStr)
  const diffDays = Math.floor((matchDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDays < -1) return null
  if (diffDays <= 0) return { label: 'Hoy', cls: 'bg-green-600/15 text-green-400' }
  if (diffDays <= 3) return { label: 'Próximo', cls: 'bg-blue-600/15 text-blue-400' }
  return null
}

function InlineShareButton({ matchId }: { matchId: string }) {
  const [copied, setCopied] = useState(false)
  const shareableLink =
    typeof window !== 'undefined' ? `${window.location.origin}/match/${matchId}` : ''

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Partido de fútbol', url: shareableLink })
        return
      } catch {
        /* ignore */
      }
    }
    try {
      await navigator.clipboard.writeText(shareableLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label="Compartir partido"
    >
      {copied ? <Check className="size-3.5 text-green-500" /> : <Share2 className="size-3.5" />}
    </button>
  )
}

export interface MatchCardProps {
  match: Match
  registeredCount: number
  variant: 'owner' | 'participant'
  onDelete?: (matchId: string) => void
  isDeleting?: boolean
  registrationId?: string
  userPosition?: string | null
  onUnregister?: (registrationId: string, matchId: string) => void
  isUnregistering?: boolean
}

export function MatchCard({
  match,
  registeredCount,
  variant,
  onDelete,
  isDeleting,
  registrationId,
  userPosition,
  onUnregister,
  isUnregistering,
}: MatchCardProps) {
  const isFull = registeredCount >= match.max_players
  const level = getLevelInfo(match.max_players)
  const spotsLeft = match.max_players - registeredCount
  const positionDef = userPosition
    ? (POSITIONS as readonly PositionOption[]).find((p) => p.value === userPosition)
    : null
  const PositionIcon = positionDef?.icon ?? null

  return (
    <div className="card match-card p-5 relative flex flex-col gap-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {variant === 'owner' && (
              <span className={`level-badge ${level.cls}`}>{level.label}</span>
            )}
            {(() => {
              const s = getMatchStatus(match.date)
              return s ? (
                <span className={`level-badge ${s.cls}`}>{s.label}</span>
              ) : null
            })()}
            {isFull && (
              <span className="level-badge bg-red-600/15 text-red-400">Completo</span>
            )}
          </div>
          <h3 className="text-base font-heading font-bold text-card-foreground leading-tight truncate">
            {match.title}
          </h3>
          {variant === 'participant' && PositionIcon && positionDef && (
            <span className="mt-1 inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
              <PositionIcon className="size-3" aria-hidden="true" />
              {positionDef.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {variant === 'owner' && (
            <SaveFrecuenteButton
              location={match.location}
              playersPerTeam={match.players_per_team}
              matchId={match.id}
              matchDate={match.date}
              fieldCost={match.field_cost}
              rentalCost={match.rental_cost}
              hasRentedGoalkeepers={match.has_rented_goalkeepers}
              rentedGoalkeepersCount={match.rented_goalkeepers_count}
              time={getLocalTimeInputValue(match.date)}
            />
          )}
          <InlineShareButton matchId={match.id} />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{match.location}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>
              {registeredCount}/{match.max_players}
              {' · '}
              {!isFull ? (
                <span className="text-primary font-semibold">
                  {spotsLeft} cupo{spotsLeft !== 1 ? 's' : ''} libre{spotsLeft !== 1 ? 's' : ''}
                </span>
              ) : (
                <span className="text-red-400 font-semibold">Sin cupos</span>
              )}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>
              {new Date(match.date).toLocaleDateString('es-CO', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
              })}
            </span>
          </div>
        </div>
      </div>

      <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${Math.min(100, (registeredCount / match.max_players) * 100)}%` }}
        />
      </div>

      {variant === 'owner' && !match.rules && (
        <Link
          href={`/match/${match.id}?edit=rules`}
          className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs text-amber-400 transition hover:bg-amber-500/15 cursor-pointer"
        >
          <span className="size-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden />
          <span className="flex-1">Sin reglas — agrégalas</span>
          <ChevronRight className="size-3 shrink-0" />
        </Link>
      )}

      <div className="flex flex-col gap-2">
        <Link
          href={`/match/${match.id}`}
          className="btn-primary-fm px-4 py-2.5 text-sm text-center w-full rounded-xl font-bold cursor-pointer inline-block"
        >
          {isFull ? 'Ver detalles' : 'Ver partido'}
        </Link>
        {variant === 'owner' && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(match.id)}
            disabled={isDeleting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            <Trash2 className="size-4" />
            {isDeleting ? 'Eliminando...' : 'Eliminar'}
          </button>
        )}
        {variant === 'participant' && onUnregister && registrationId && (
          <button
            type="button"
            onClick={() => onUnregister(registrationId, match.id)}
            disabled={isUnregistering}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {isUnregistering ? 'Procesando...' : 'Cancelar inscripción'}
          </button>
        )}
      </div>
    </div>
  )
}
