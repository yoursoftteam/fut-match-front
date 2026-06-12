'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MatchCard } from './MatchCard'
import { MatchPredictionsModal } from './MatchPredictionsModal'
import { GroupStandingsModal } from './GroupStandingsModal'
import { AlertCircle, ArrowDown, ChevronDown, Loader2, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Match, STAGE_ORDER, MatchStage } from '@/types/bet'

interface Prediction {
  id: string
  match_id: string
  home_score_predicted: number
  away_score_predicted: number
  points_earned: number | null
}

interface PoolMatchesProps {
  poolId: string
  tournamentId: string
  showGroupTable?: boolean
}

const STAGE_LABELS: Record<string, string> = {
  group_stage: 'Fase de grupos',
  round_of_32: '32avos de final',
  round_of_16: '16avos de final',
  quarter_finals: 'Cuartos de final',
  semi_finals: 'Semifinales',
  third_place: 'Tercer puesto',
  final: 'Final',
}

const FILTER_LABELS: Record<string, string> = {
  round_of_32: '16avos',
  round_of_16: '8avos',
  quarter_finals: 'Cuartos',
  semi_finals: 'Semi',
  final: 'Final',
}

const STAGE_FILTER_ORDER = [
  MatchStage.ROUND_OF_32,
  MatchStage.ROUND_OF_16,
  MatchStage.QUARTER_FINALS,
  MatchStage.SEMI_FINALS,
  MatchStage.FINAL,
]

function groupMatchesByStage(matches: Match[]): [string, Match[]][] {
  const groups = new Map<string, Match[]>()

  for (const match of matches) {
    const stage = match.stage ?? 'group_stage'
    if (!groups.has(stage)) groups.set(stage, [])
    groups.get(stage)!.push(match)
  }

  const stageOrder = [
    MatchStage.GROUP_STAGE,
    MatchStage.ROUND_OF_32,
    MatchStage.ROUND_OF_16,
    MatchStage.QUARTER_FINALS,
    MatchStage.SEMI_FINALS,
    MatchStage.THIRD_PLACE,
    MatchStage.FINAL,
  ]

  return stageOrder
    .filter((s) => groups.has(s))
    .map((s) => [s, groups.get(s)!] as [string, Match[]])
}

function StageSection({
  stage,
  matches,
  predictions,
  onUpdatePrediction,
  onSelectMatch,
  onShowGroup,
  showGroupTable,
  defaultOpen,
}: {
  stage: string
  matches: Match[]
  predictions: Map<string, Prediction>
  onUpdatePrediction: (matchId: string, home: number, away: number) => void
  onSelectMatch: (matchId: string) => void
  onShowGroup: (groupName: string) => void
  showGroupTable: boolean
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)

  const { editableCount, finishedCount } = useMemo(() => {
    let editable = 0
    let finished = 0
    for (const m of matches) {
      if (m.status === 'finished') finished++
      else if (m.status === 'scheduled') editable++
    }
    return { editableCount: editable, finishedCount: finished }
  }, [matches])

  return (
    <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-900/30">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 bg-slate-900/80 px-4 py-3 text-left transition-colors hover:bg-slate-800/50"
        aria-expanded={open}
      >
        <ChevronDown
          className={cn(
            'size-4 text-slate-500 transition-transform duration-200',
            open && 'rotate-0',
            !open && '-rotate-90'
          )}
        />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-slate-200">
            {STAGE_LABELS[stage] ?? stage}
          </span>
          <span className="ml-2 text-xs text-slate-500">
            {matches.length} partido{matches.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          {editableCount > 0 && (
            <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-semibold text-emerald-400">
              {editableCount} abierto{editableCount !== 1 ? 's' : ''}
            </span>
          )}
          {finishedCount > 0 && (
            <span className="rounded-md bg-slate-800 px-2 py-0.5 font-medium text-slate-500">
              {finishedCount} finalizado{finishedCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="divide-y divide-slate-800/50">
          {matches.map((match) => {
            const prediction = predictions.get(match.id)
            const fallbackTeam = (name: string) => ({
              name,
              fifa_code: '---' as const,
              flag_svg_url: '',
            })
            const homeTeam = match.home_team
              ? { ...match.home_team, flag_svg_url: match.home_team.flag_svg_url ?? '' }
              : fallbackTeam(match.home_placeholder ?? 'TBD')
            const awayTeam = match.away_team
              ? { ...match.away_team, flag_svg_url: match.away_team.flag_svg_url ?? '' }
              : fallbackTeam(match.away_placeholder ?? 'TBD')

            return (
              <div key={match.id} className="px-3 py-2" data-match-id={match.id}>
              <MatchCard
                match={{
                  id: match.id,
                  home_team: homeTeam,
                  away_team: awayTeam,
                  kickoff_at: match.kickoff_at,
                  stage: match.stage,
                  group_name: match.group_name,
                  status: match.status,
                  home_score_official: match.home_score_official,
                  away_score_official: match.away_score_official,
                }}
                prediction={prediction ?? undefined}
                canEdit={match.status === 'scheduled'}
                onUpdatePrediction={(home, away) => onUpdatePrediction(match.id, home, away)}
                onClick={match.status !== 'scheduled' ? () => onSelectMatch(match.id) : undefined}
                showGroupTable={showGroupTable}
                onShowGroup={match.stage === MatchStage.GROUP_STAGE && match.group_name && showGroupTable ? () => onShowGroup(match.group_name!) : undefined}
                compact
              />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function PoolMatches({ poolId, tournamentId, showGroupTable = true }: PoolMatchesProps) {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<string | null>(null)
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const saveTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    const timeouts = saveTimeouts.current
    return () => {
      for (const id of Object.keys(timeouts)) {
        clearTimeout(timeouts[id])
      }
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: authData } = await supabase.auth.getSession()
      const token = authData?.session?.access_token
      if (!token) return

      const [matchesRes, predictionsRes] = await Promise.all([
        fetch(`/api/v1/bet/matches?tournament_id=${tournamentId}`),
        fetch(`/api/v1/bet/predictions?pool_id=${poolId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const [matchesData, predictionsData] = await Promise.all([
        matchesRes.json(),
        predictionsRes.json(),
      ])

      if (matchesData.success) {
        setMatches(matchesData.data)
      }
      if (predictionsData.success) {
        setPredictions(predictionsData.data)
      }
    } catch {
      setError('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }, [poolId, tournamentId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const savePrediction = useCallback(
    async (matchId: string, homeScore: number, awayScore: number) => {
      try {
        const { data: authData } = await supabase.auth.getSession()
        const token = authData?.session?.access_token
        if (!token) return

        const response = await fetch('/api/v1/bet/predictions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            match_id: matchId,
            home_score_predicted: homeScore,
            away_score_predicted: awayScore,
            pool_id: poolId,
          }),
        })

        const result = await response.json()
        if (result.success) {
          setPredictions((prev) => {
            const idx = prev.findIndex((p) => p.match_id === matchId)
            const updated = {
              id: result.data.id,
              match_id: matchId,
              home_score_predicted: homeScore,
              away_score_predicted: awayScore,
              points_earned: null,
            }
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = updated
              return next
            }
            return [...prev, updated]
          })
        }
      } catch {
        /* ignore */
      }
    },
    [poolId]
  )

  const predictionsMap = useMemo(
    () => new Map(predictions.map((p) => [p.match_id, p])),
    [predictions]
  )

  const { groupOptions, stageOptions } = useMemo(() => {
    const groups = new Set<string>()
    const stages = new Set<string>()
    for (const m of matches) {
      if (m.stage === MatchStage.GROUP_STAGE && m.group_name) {
        groups.add(m.group_name)
      } else if (m.stage && m.stage !== MatchStage.GROUP_STAGE && m.stage !== MatchStage.THIRD_PLACE) {
        stages.add(m.stage)
      }
    }
    const g: { key: string; label: string }[] = []
    for (const name of Array.from(groups).sort()) {
      g.push({ key: `group:${name}`, label: name })
    }
    const s: { key: string; label: string }[] = []
    for (const stage of STAGE_FILTER_ORDER) {
      if (stages.has(stage)) {
        s.push({ key: `stage:${stage}`, label: FILTER_LABELS[stage] ?? STAGE_LABELS[stage] })
      }
    }
    return { groupOptions: g, stageOptions: s }
  }, [matches])

  const handleUpdatePrediction = useCallback(
    (matchId: string, homeScore: number, awayScore: number) => {
      setPredictions((prev) => {
        const idx = prev.findIndex((p) => p.match_id === matchId)
        const updated = {
          id: prev[idx]?.id ?? '',
          match_id: matchId,
          home_score_predicted: homeScore,
          away_score_predicted: awayScore,
          points_earned: null,
        }
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = updated
          return next
        }
        return [...prev, updated]
      })

      if (saveTimeouts.current[matchId]) {
        clearTimeout(saveTimeouts.current[matchId])
      }
      saveTimeouts.current[matchId] = setTimeout(() => {
        savePrediction(matchId, homeScore, awayScore)
      }, 800)
    },
    [savePrediction]
  )

  const pendingMatchIds = useMemo(() => {
    const now = Date.now()
    const ids = new Set<string>()
    for (const m of matches) {
      if (m.status !== 'scheduled') continue
      const kickoff = new Date(m.kickoff_at).getTime()
      if (now >= kickoff - 10 * 60 * 1000) continue
      if (!predictionsMap.has(m.id)) ids.add(m.id)
    }
    return ids
  }, [matches, predictionsMap])

  const filteredMatches = useMemo(() => {
    let result = matches
    if (activeFilter) {
      if (activeFilter.startsWith('group:')) {
        const groupName = activeFilter.slice(6)
        result = result.filter(
          (m) => m.stage === MatchStage.GROUP_STAGE && m.group_name === groupName
        )
      } else if (activeFilter.startsWith('stage:')) {
        const stage = activeFilter.slice(6)
        result = result.filter((m) => m.stage === stage)
      }
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      result = result.filter(
        (m) =>
          (m.home_team?.name?.toLowerCase() ?? m.home_placeholder ?? '').includes(q) ||
          (m.away_team?.name?.toLowerCase() ?? m.away_placeholder ?? '').includes(q)
      )
    }
    return result
  }, [matches, searchQuery, activeFilter])

  const grouped = useMemo(() => groupMatchesByStage(filteredMatches), [filteredMatches])

  const hasPending = pendingMatchIds.size > 0
  const hasFilteredPending = useMemo(() => {
    if (!hasPending) return false
    for (const id of pendingMatchIds) {
      if (filteredMatches.some((m) => m.id === id)) return true
    }
    return false
  }, [pendingMatchIds, filteredMatches, hasPending])

  const scrollToNextPending = useCallback(() => {
    const sortedIds = [...pendingMatchIds]
    const scrollY = window.scrollY + 90
    let bestId = sortedIds[0]

    for (const id of sortedIds) {
      if (!filteredMatches.some((m) => m.id === id)) continue
      const el = document.querySelector(`[data-match-id="${id}"]`)
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (rect.top > 90) {
        bestId = id
        break
      }
    }

    const el = document.querySelector(`[data-match-id="${bestId}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [pendingMatchIds, filteredMatches])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        if (document.activeElement !== searchRef.current) {
          e.preventDefault()
          searchRef.current?.focus()
        }
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-sm text-slate-500">
        <Loader2 className="size-5 animate-spin text-emerald-400" />
        Cargando partidos…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        <AlertCircle className="size-4 shrink-0" />
        {error}
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center text-sm text-slate-500">
        <p className="font-medium">No hay partidos disponibles</p>
        <p className="text-xs">Los partidos aparecerán aquí cuando el torneo comience.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {(filteredMatches.length !== matches.length || activeFilter) && (
        <p className="text-xs text-slate-500 text-center">
          {filteredMatches.length} de {matches.length} partidos
        </p>
      )}

      <div className="sticky top-0 z-10 -mx-4 border-b border-slate-800 bg-slate-950/95 px-4 py-2 backdrop-blur-sm">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <input
            ref={searchRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por equipo…"
            className="w-full rounded-lg border border-slate-700/50 bg-slate-900 py-2 pl-9 pr-8 text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors focus:border-emerald-500/40 focus:ring-1 focus:ring-emerald-500/20"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition-colors hover:text-slate-300"
              aria-label="Limpiar búsqueda"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        {(groupOptions.length > 0 || stageOptions.length > 0) && (
          <div className="space-y-1.5 pb-1" role="group" aria-label="Filtrar por grupo o fase">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setActiveFilter(null)}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  activeFilter === null
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                )}
              >
                Todos
              </button>
              {groupOptions.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveFilter(activeFilter === key ? null : key)}
                  className={cn(
                    'flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    activeFilter === key
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                  )}
                  aria-label={`Grupo ${label}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {stageOptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {stageOptions.map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveFilter(activeFilter === key ? null : key)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      activeFilter === key
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-slate-800 text-slate-400 hover:bg-slate-700/50 hover:text-slate-300'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {grouped.length === 0 && searchQuery.trim() && (
        <p className="py-12 text-center text-sm text-slate-500">
          No hay partidos que coincidan con &ldquo;{searchQuery.trim()}&rdquo;
        </p>
      )}

      {grouped.map(([stage, stageMatches], index) => (
        <StageSection
          key={stage}
          stage={stage}
          matches={stageMatches}
          predictions={predictionsMap}
          onUpdatePrediction={handleUpdatePrediction}
          onSelectMatch={setSelectedMatchId}
          onShowGroup={setSelectedGroup}
          showGroupTable={showGroupTable}
          defaultOpen={index < 2}
        />
      ))}

      {hasFilteredPending && (
        <button
          type="button"
          onClick={scrollToNextPending}
          className="fixed bottom-6 right-4 z-20 flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-400 shadow-lg shadow-emerald-500/10 backdrop-blur-sm transition-colors hover:bg-emerald-500/20 active:scale-95"
        >
          <ArrowDown className="size-3.5" />
          Siguiente pendiente
        </button>
      )}

      <MatchPredictionsModal
        matchId={selectedMatchId ?? ''}
        poolId={poolId}
        open={!!selectedMatchId}
        onClose={() => setSelectedMatchId(null)}
      />

      {selectedGroup && (
        <GroupStandingsModal
          groupName={selectedGroup}
          matches={matches}
          getPrediction={(matchId) => predictionsMap.get(matchId)}
          onClose={() => setSelectedGroup(null)}
        />
      )}
    </div>
  )
}
