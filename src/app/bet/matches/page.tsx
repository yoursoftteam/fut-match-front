/**
 * Página de Partidos - FIFA 2026
 * Lista tabular compacta con paginación.
 */

'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  Lock,
  Trophy,
  Users,
} from 'lucide-react'
import { LockCountdown } from '@/components/bet/LockCountdown'
import { ScoreInput } from '@/components/bet/ScoreInput'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useAuth } from '@/hooks/useAuth'
import { useBetMatches } from '@/hooks/useBetMatches'
import { useBetPredictions } from '@/hooks/useBetPredictions'
import { cn } from '@/lib/utils'
import { Match, MatchPrediction, MatchStage, Team } from '@/types/bet'

const FIFA_TOURNAMENT_SLUG = 'fifa-2026'
const ITEMS_PER_PAGE = 15

const dateFormatter = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: 'short',
})

const timeFormatter = new Intl.DateTimeFormat('es-CO', {
  hour: '2-digit',
  minute: '2-digit',
})

type MatchWithTeams = Match & {
  home_team?: Team | null
  away_team?: Team | null
}

function getPageFromParams(value: string | null) {
  const page = Number(value)
  return Number.isInteger(page) && page > 0 ? page : 1
}

function isMatchLocked(kickoffAt: string) {
  const kickoff = new Date(kickoffAt)
  const lockTime = new Date(kickoff.getTime() - 10 * 60 * 1000)
  return Date.now() >= lockTime.getTime()
}

function TeamCell({
  team,
  placeholder,
  align = 'left',
}: {
  team?: Team | null
  placeholder?: string | null
  align?: 'left' | 'right'
}) {
  const teamName = team?.name ?? placeholder ?? 'Por definir'
  const fifaCode = team?.fifa_code

  return (
    <div
      className={cn(
        'flex min-w-0 items-center gap-2',
        align === 'right' && 'justify-end text-right'
      )}
    >
      {team?.flag_svg_url ? (
        // Existing flag assets are external SVGs; keep the native image path lightweight.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={team.flag_svg_url}
          alt=""
          aria-hidden="true"
          width={24}
          height={24}
          className={cn(
            'size-6 shrink-0 rounded-sm object-cover',
            align === 'right' && 'order-2'
          )}
          loading="lazy"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            'size-6 shrink-0 rounded-sm border border-slate-700 bg-slate-800',
            align === 'right' && 'order-2'
          )}
        />
      )}

      <span className="min-w-0 truncate font-medium text-slate-100" title={teamName}>
        {teamName}
      </span>
      {fifaCode && (
        <span
          className="hidden shrink-0 rounded border border-slate-700 bg-slate-900 px-1.5 py-0.5 font-mono text-[0.625rem] text-slate-400 sm:inline"
          translate="no"
        >
          {fifaCode}
        </span>
      )}
    </div>
  )
}

function StatusPill({
  match,
  locked,
  onLocked,
}: {
  match: MatchWithTeams
  locked: boolean
  onLocked: () => void
}) {
  if (match.status === 'live') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden="true" />
        En vivo
      </span>
    )
  }

  if (match.status === 'finished') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-medium text-slate-300">
        Finalizado
      </span>
    )
  }

  if (locked) {
    return (
      <span className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-xs font-medium text-red-300">
        <Lock className="size-3" aria-hidden="true" />
        Cerrado
      </span>
    )
  }

  return (
    <LockCountdown
      kickoffAt={match.kickoff_at}
      onLocked={onLocked}
      showTimer={false}
    />
  )
}

function PredictionCell({
  match,
  prediction,
  canEdit,
  saving,
  locked,
  onUpdatePrediction,
}: {
  match: MatchWithTeams
  prediction?: MatchPrediction
  canEdit: boolean
  saving: boolean
  locked: boolean
  onUpdatePrediction: (homeScore: number, awayScore: number) => void
}) {
  if (canEdit && !locked) {
    return (
      <ScoreInput
        homeScore={prediction?.home_score_predicted ?? 0}
        awayScore={prediction?.away_score_predicted ?? 0}
        onChangeHome={(score) =>
          onUpdatePrediction(score, prediction?.away_score_predicted ?? 0)
        }
        onChangeAway={(score) =>
          onUpdatePrediction(prediction?.home_score_predicted ?? 0, score)
        }
        locked={locked}
        disabled={saving}
        matchId={match.id}
        compact
      />
    )
  }

  if (prediction) {
    return (
      <div className="inline-flex items-center gap-1 font-mono text-sm font-bold tabular-nums text-slate-50">
        <span>{prediction.home_score_predicted}</span>
        <span className="text-slate-500">-</span>
        <span>{prediction.away_score_predicted}</span>
      </div>
    )
  }

  return <span className="text-xs text-slate-500">Sin pick</span>
}

function MatchRow({
  match,
  prediction,
  canEdit,
  saving,
  onUpdatePrediction,
}: {
  match: MatchWithTeams
  prediction?: MatchPrediction
  canEdit: boolean
  saving: boolean
  onUpdatePrediction: (homeScore: number, awayScore: number) => void
}) {
  const [locked, setLocked] = useState(() => isMatchLocked(match.kickoff_at))
  const kickoffDate = new Date(match.kickoff_at)
  const stageLabel = {
    [MatchStage.GROUP_STAGE]: match.group_name ? `Grupo ${match.group_name}` : 'Grupos',
    [MatchStage.ROUND_OF_32]: '16avos',
    [MatchStage.ROUND_OF_16]: 'Octavos',
    [MatchStage.QUARTER_FINALS]: 'Cuartos',
    [MatchStage.SEMI_FINALS]: 'Semis',
    [MatchStage.THIRD_PLACE]: '3er puesto',
    [MatchStage.FINAL]: 'Final',
  }[match.stage]

  return (
    <tr
      className={cn(
        'border-b border-slate-800/80 transition-colors hover:bg-slate-900/80',
        locked && 'bg-red-950/10'
      )}
    >
      <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-3.5 text-slate-500" aria-hidden="true" />
          <span>{dateFormatter.format(kickoffDate)}</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-xs font-mono tabular-nums text-slate-300">
        <div className="flex items-center gap-2">
          <Clock3 className="size-3.5 text-slate-500" aria-hidden="true" />
          <span>{timeFormatter.format(kickoffDate)}</span>
        </div>
      </td>
      <td className="max-w-[12rem] px-3 py-2">
        <TeamCell team={match.home_team} placeholder={match.home_placeholder} />
      </td>
      <td className="whitespace-nowrap px-2 py-2 text-center text-xs font-bold text-slate-500">
        vs
      </td>
      <td className="max-w-[12rem] px-3 py-2">
        <TeamCell
          team={match.away_team}
          placeholder={match.away_placeholder}
          align="right"
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          {match.fifa_match_number && (
            <span className="font-mono tabular-nums text-slate-500">
              P{match.fifa_match_number}
            </span>
          )}
          <span>{stageLabel}</span>
        </div>
      </td>
      <td className="max-w-[11rem] truncate px-3 py-2 text-xs text-slate-400" title={match.venue ?? undefined}>
        {match.venue ?? 'Por definir'}
      </td>
      <td className="whitespace-nowrap px-3 py-2">
        <StatusPill
          match={match}
          locked={locked}
          onLocked={() => setLocked(true)}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-right">
        <PredictionCell
          match={match}
          prediction={prediction}
          canEdit={canEdit}
          saving={saving}
          locked={locked}
          onUpdatePrediction={onUpdatePrediction}
        />
      </td>
      <td className="whitespace-nowrap px-3 py-2 text-center">
        {match.status === 'finished' && prediction?.points_earned != null ? (
          <span
            className={cn(
              'inline-flex items-center justify-center font-mono text-xs font-bold tabular-nums',
              prediction.points_earned > 0
                ? 'text-emerald-400'
                : 'text-slate-600'
            )}
          >
            {prediction.points_earned}
          </span>
        ) : (
          <span className="text-[0.6875rem] text-slate-600">–</span>
        )}
      </td>
    </tr>
  )
}

function LoadingState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <Loader2 className="mx-auto mb-4 size-10 animate-spin text-emerald-400" />
        <p className="text-sm text-slate-400">Cargando…</p>
      </div>
    </div>
  )
}

function BetMatchesContent() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [tournamentId, setTournamentId] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  const poolParam = searchParams.get('pool')
  const poolId = poolParam ?? null

  const { matches, loading: matchesLoading, error: matchesError } = useBetMatches({
    tournamentId,
    stage: undefined,
    groupName: undefined,
  })

  const {
    createOrUpdatePrediction,
    getPrediction,
    fetchPredictions,
    error: predError,
  } = useBetPredictions()

  const sortedMatches = useMemo(() => {
    return [...matches].sort((a, b) => {
      return new Date(a.kickoff_at).getTime() - new Date(b.kickoff_at).getTime()
    }) as MatchWithTeams[]
  }, [matches])

  const totalPages = Math.max(1, Math.ceil(sortedMatches.length / ITEMS_PER_PAGE))
  const requestedPage = getPageFromParams(searchParams.get('page'))
  const currentPage = Math.min(requestedPage, totalPages)
  const firstVisibleMatch = sortedMatches.length
    ? (currentPage - 1) * ITEMS_PER_PAGE + 1
    : 0
  const lastVisibleMatch = Math.min(
    currentPage * ITEMS_PER_PAGE,
    sortedMatches.length
  )

  const paginatedMatches = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE
    return sortedMatches.slice(startIdx, startIdx + ITEMS_PER_PAGE)
  }, [sortedMatches, currentPage])

  useEffect(() => {
    if (requestedPage === currentPage) return

    const params = new URLSearchParams(searchParams.toString())
    if (currentPage === 1) {
      params.delete('page')
    } else {
      params.set('page', String(currentPage))
    }

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }, [currentPage, pathname, requestedPage, router, searchParams])

  useEffect(() => {
    let cancelled = false

    async function loadTournamentId() {
      if (tournamentId) return

      const response = await fetch(
        `/api/v1/bet/tournaments?slug=${FIFA_TOURNAMENT_SLUG}`
      )
      const data = await response.json().catch(() => null)

      if (!cancelled && response.ok && data?.success && data?.data?.id) {
        setTournamentId(data.data.id)
      }
    }

    loadTournamentId()

    return () => {
      cancelled = true
    }
  }, [tournamentId])

  useEffect(() => {
    if (!user) return
    fetchPredictions(poolId ?? undefined)
  }, [poolId, user, fetchPredictions])

  const goToPage = (nextPage: number) => {
    const page = Math.min(Math.max(1, nextPage), totalPages)
    const params = new URLSearchParams(searchParams.toString())

    if (page === 1) {
      params.delete('page')
    } else {
      params.set('page', String(page))
    }

    const query = params.toString()
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
  }

  const handleUpdatePrediction = async (
    matchId: string,
    homeScore: number,
    awayScore: number
  ) => {
    setSaving(true)
    setSaveSuccess(null)

    try {
      await createOrUpdatePrediction(matchId, homeScore, awayScore, poolId ?? undefined)
      setSaveSuccess('Predicción guardada')
      setTimeout(() => setSaveSuccess(null), 2000)
    } catch (err) {
      console.error('Error updating prediction:', err)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return <LoadingState />
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
        <Card className="w-full max-w-md border-slate-800 bg-slate-900 p-6">
          <p className="mb-4 text-center text-sm text-slate-300">
            Debes iniciar sesión para ver y hacer predicciones.
          </p>
          <Link
            href="/auth?mode=signin"
            className={cn(buttonVariants(), 'w-full')}
          >
            Iniciar Sesión
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 md:px-6 md:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
              <Trophy className="size-3.5" aria-hidden="true" />
              FIFA 2026
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-balance text-slate-50 md:text-3xl">
                Predicciones
              </h1>
              {poolId && (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                  <Users className="size-3.5" aria-hidden="true" />
                  Polla activa
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-400">
              {sortedMatches.length} partidos · cierre 10 min antes del kickoff.
              {poolId && ' · picks guardados en la polla'}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs sm:min-w-64">
            <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2">
              <div className="font-mono text-base font-bold tabular-nums text-emerald-300">
                10 pts
              </div>
              <div className="text-slate-500">Marcador exacto</div>
            </div>
            <div className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2">
              <div className="font-mono text-base font-bold tabular-nums text-emerald-300">
                5 pts
              </div>
              <div className="text-slate-500">Ganador o empate</div>
            </div>
          </div>
        </header>

        {saveSuccess && (
          <div
            role="status"
            aria-live="polite"
            className="mb-3 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300"
          >
            <CheckCircle2 className="size-4" aria-hidden="true" />
            {saveSuccess}
          </div>
        )}

        {(matchesError || predError) && (
          <div
            role="alert"
            className="mb-3 flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
          >
            <AlertCircle className="size-4" aria-hidden="true" />
            {matchesError || predError}
          </div>
        )}

        <section
          aria-labelledby="matches-table-heading"
          className="overflow-hidden rounded-lg border border-slate-800 bg-slate-950"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-900/70 px-3 py-2">
            <h2
              id="matches-table-heading"
              className="text-sm font-semibold text-slate-200"
            >
              Fixture completo
            </h2>
            <span className="text-xs tabular-nums text-slate-500">
              {firstVisibleMatch}-{lastVisibleMatch} de {sortedMatches.length}
            </span>
          </div>

          {matchesLoading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-400">
              <Loader2 className="size-5 animate-spin text-emerald-400" />
              Cargando partidos…
            </div>
          ) : paginatedMatches.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-400">
              No hay partidos disponibles.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] table-fixed text-sm">
                <caption className="sr-only">
                  Partidos FIFA 2026 con fecha, equipos, estado y predicción.
                </caption>
                <colgroup>
                  <col className="w-28" />
                  <col className="w-24" />
                  <col />
                  <col className="w-12" />
                  <col />
                  <col className="w-28" />
                  <col className="w-36" />
                  <col className="w-28" />
                  <col className="w-28" />
                  <col className="w-14" />
                </colgroup>
                <thead className="bg-slate-900 text-left text-[0.6875rem] uppercase text-slate-500">
                  <tr>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Fecha
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Hora
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Local
                    </th>
                    <th scope="col" className="px-2 py-2 text-center font-semibold">
                      VS
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Visitante
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Fase
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Sede
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold">
                      Estado
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-semibold">
                      Pick
                    </th>
                    <th scope="col" className="px-3 py-2 text-center font-semibold">
                      Pts
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMatches.map((match) => (
                    <MatchRow
                      key={match.id}
                      match={match}
                      prediction={getPrediction(match.id)}
                      canEdit={!authLoading && !!user}
                      saving={saving}
                      onUpdatePrediction={(homeScore, awayScore) =>
                        handleUpdatePrediction(match.id, homeScore, awayScore)
                      }
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {totalPages > 1 && (
          <nav
            aria-label="Paginación de partidos"
            className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p className="text-xs tabular-nums text-slate-500">
              Página {currentPage} de {totalPages} · máximo {ITEMS_PER_PAGE} por vista
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
                Anterior
              </Button>
              <Button
                type="button"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
                className="border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
              >
                Siguiente
                <ChevronRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </nav>
        )}
      </div>
    </main>
  )
}

export default function BetMatchesPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <BetMatchesContent />
    </Suspense>
  )
}
