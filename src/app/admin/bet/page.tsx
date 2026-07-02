'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Dice1,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Check,
  AlertCircle,
  Trophy,
  Search,
  ListChecks,
  Users,
  Flag,
  Medal,
  X,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Tournament, Match } from '@/types/bet'

const EDGE_FN_URL = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/update-match-result`
const LOCAL_API_URL = '/api/v1/admin/update-match-result'

const STAGE_LABELS: Record<string, string> = {
  group_stage: 'Fase de Grupos',
  round_of_32: '16avos de Final',
  round_of_16: 'Octavos de Final',
  quarter_finals: 'Cuartos de Final',
  semi_finals: 'Semifinales',
  third_place: 'Tercer Puesto',
  final: 'Final',
}

const STAGE_ORDER = [
  'group_stage',
  'round_of_32',
  'round_of_16',
  'quarter_finals',
  'semi_finals',
  'third_place',
  'final',
] as const

interface SimResult {
  match_id: string
  home_team?: string
  away_team?: string
  home_score: number
  away_score: number
  status: 'simulated' | 'skipped' | 'error'
  error?: string
}

interface MatchEdit {
  matchId: string
  homeScore: number
  awayScore: number
  saving: boolean
  saved: boolean
  error?: string
}

export default function AdminPage() {
  const { user, loading: authLoading, isAdmin } = useAuth()
  const [activeTab, setActiveTab] = useState('scores')

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!user || !isAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <ShieldAlert className="size-12 text-destructive" />
            <p className="text-lg font-medium">Acceso denegado</p>
            <p className="text-sm text-muted-foreground">
              Solo el administrador puede acceder a esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pt-8">
      <div className="flex items-center gap-3">
        <ShieldCheck className="size-6 text-emerald-400" />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin — Panel de Administración</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gestiona marcadores de partidos del torneo
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="scores">Actualizar Marcadores</TabsTrigger>
          <TabsTrigger value="simulate">Simular Resultados</TabsTrigger>
          <TabsTrigger value="classification">Clasificados</TabsTrigger>
        </TabsList>

        <TabsContent value="scores">
          <ScoreEditor />
        </TabsContent>

        <TabsContent value="simulate">
          <SimulateTab />
        </TabsContent>

        <TabsContent value="classification">
          <ClassificationTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ScoreEditor() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<string | null>('all')
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [edits, setEdits] = useState<Map<string, MatchEdit>>(new Map())

  useEffect(() => {
    supabase
      .from('bet_tournaments')
      .select('*')
      .order('name')
      .then(({ data }) => {
        const list = (data as Tournament[]) || []
        setTournaments(list)
        if (list.length > 0 && !selectedTournament) {
          setSelectedTournament(list[0].id)
        }
      })
  }, [])

  const fetchMatches = useCallback(async () => {
    if (!selectedTournament) return
    setLoading(true)
    let query = supabase
      .from('bet_matches')
      .select(`
        id,
        tournament_id,
        stage,
        group_name,
        kickoff_at,
        home_team_id,
        away_team_id,
        home_placeholder,
        away_placeholder,
        venue,
        fifa_match_number,
        home_score_official,
        away_score_official,
        status,
        created_at,
        updated_at,
        home_team:bet_teams!home_team_id(id, name, fifa_code, flag_svg_url),
        away_team:bet_teams!away_team_id(id, name, fifa_code, flag_svg_url)
      `)
      .eq('tournament_id', selectedTournament)
      .order('kickoff_at', { ascending: true })

    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    const { data } = await query
    setMatches((data as unknown as Match[]) || [])
    setLoading(false)
  }, [selectedTournament, statusFilter])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  const handleScoreChange = (matchId: string, field: 'home' | 'away', value: string) => {
    const num = value === '' ? 0 : Math.max(0, Math.min(20, parseInt(value, 10) || 0))
    const existing = edits.get(matchId)
    const match = matches.find((m) => m.id === matchId)
    const homeScore = field === 'home' ? num : (existing?.homeScore ?? match?.home_score_official ?? 0)
    const awayScore = field === 'away' ? num : (existing?.awayScore ?? match?.away_score_official ?? 0)

    setEdits((prev) => {
      const next = new Map(prev)
      next.set(matchId, {
        matchId,
        homeScore,
        awayScore,
        saving: false,
        saved: false,
      })
      return next
    })
  }

  const handleSave = async (matchId: string) => {
    const edit = edits.get(matchId)
    if (!edit) return

    setEdits((prev) => {
      const next = new Map(prev)
      next.set(matchId, { ...edit, saving: true, saved: false, error: undefined })
      return next
    })

    const saveMatch = async (url: string, authToken?: string) => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      }
      if (authToken) headers['Authorization'] = `Bearer ${authToken}`
      return fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          match_id: matchId,
          home_score: edit.homeScore,
          away_score: edit.awayScore,
        }),
      })
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      let res = await saveMatch(EDGE_FN_URL, token)

      if (res.status === 503) {
        res = await saveMatch(LOCAL_API_URL)
      }

      const body = await res.json()

      if (!res.ok || body.error) {
        throw new Error(body.error || 'Error al actualizar')
      }

      setEdits((prev) => {
        const next = new Map(prev)
        next.set(matchId, { ...edit, saving: false, saved: true, error: undefined })
        setTimeout(() => {
          setEdits((cur) => {
            const updated = new Map(cur)
            const entry = updated.get(matchId)
            if (entry) updated.set(matchId, { ...entry, saved: false })
            return updated
          })
        }, 3000)
        return next
      })

      fetchMatches()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error de conexión'
      setEdits((prev) => {
        const next = new Map(prev)
        next.set(matchId, { ...edit, saving: false, error: msg })
        return next
      })
    }
  }

  const getEditState = (match: Match): MatchEdit => {
    const edit = edits.get(match.id)
    if (edit) return edit
    return {
      matchId: match.id,
      homeScore: match.home_score_official ?? -1,
      awayScore: match.away_score_official ?? -1,
      saving: false,
      saved: false,
    }
  }

  const matchesByStage = STAGE_ORDER.reduce(
    (acc, stage) => {
      const stageMatches = matches.filter((m) => m.stage === stage)
      if (stageMatches.length > 0) acc[stage] = stageMatches
      return acc
    },
    {} as Record<string, Match[]>
  )

  const usedStages = Object.keys(matchesByStage).sort(
    (a, b) => STAGE_ORDER.indexOf(a as typeof STAGE_ORDER[number]) - STAGE_ORDER.indexOf(b as typeof STAGE_ORDER[number])
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Trophy className="size-4 text-muted-foreground" />
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="w-56" aria-label="Seleccionar torneo">
              <SelectValue placeholder="Seleccionar torneo" />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Search className="size-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" aria-label="Filtrar por estado">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="scheduled">Programados</SelectItem>
              <SelectItem value="live">En vivo</SelectItem>
              <SelectItem value="finished">Finalizados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : !selectedTournament ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Selecciona un torneo para ver sus partidos
          </CardContent>
        </Card>
      ) : usedStages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No hay partidos con los filtros seleccionados
          </CardContent>
        </Card>
      ) : (
        usedStages.map((stage) => (
          <Card key={stage} className="overflow-hidden">
            <CardHeader className="border-b border-border/40 bg-muted/30 pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {STAGE_LABELS[stage] || stage}
              </h2>
            </CardHeader>
            <CardContent className="divide-y divide-border/40">
              {matchesByStage[stage].map((match) => (
                <MatchRow
                  key={match.id}
                  match={match}
                  editState={getEditState(match)}
                  onScoreChange={handleScoreChange}
                  onSave={handleSave}
                />
              ))}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

function MatchRow({
  match,
  editState,
  onScoreChange,
  onSave,
}: {
  match: Match
  editState: MatchEdit
  onScoreChange: (matchId: string, field: 'home' | 'away', value: string) => void
  onSave: (matchId: string) => void
}) {
  const isFinished = match.status === 'finished'
  const kickoff = new Date(match.kickoff_at)
  const dateStr = kickoff.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
  })
  const timeStr = kickoff.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const homeTeamName = match.home_team?.name || match.home_placeholder || 'Local'
  const awayTeamName = match.away_team?.name || match.away_placeholder || 'Visitante'

  const hasEdits = editState.homeScore >= 0 && editState.awayScore >= 0
  const hasChanged =
    hasEdits &&
    (editState.homeScore !== match.home_score_official ||
      editState.awayScore !== match.away_score_official)
  const isNewScore = hasEdits && !isFinished
  const canSave = hasEdits && (hasChanged || isNewScore) && !editState.saving

  return (
    <div
      className={cn(
        'flex flex-col gap-2 px-6 py-3 transition-colors sm:flex-row sm:items-center sm:justify-between',
        editState.saved && 'bg-emerald-500/5'
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {match.home_team?.flag_svg_url && (
          <img
            src={match.home_team.flag_svg_url}
            alt=""
            className="size-5 shrink-0 rounded-sm object-cover"
          />
        )}
        <span className="truncate text-sm font-medium text-right flex-1">{homeTeamName}</span>

        <div className="flex shrink-0 items-center gap-1.5">
          <ScoreInput
            value={editState.homeScore}
            onChange={(v) => onScoreChange(match.id, 'home', v)}
            disabled={isFinished}
          />
          <span className="text-xs text-muted-foreground">–</span>
          <ScoreInput
            value={editState.awayScore}
            onChange={(v) => onScoreChange(match.id, 'away', v)}
            disabled={isFinished}
          />
        </div>

        {match.away_team?.flag_svg_url && (
          <img
            src={match.away_team.flag_svg_url}
            alt=""
            className="size-5 shrink-0 rounded-sm object-cover"
          />
        )}
        <span className="truncate text-sm font-medium flex-1">{awayTeamName}</span>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {dateStr} {timeStr}
        </span>

        <div className="flex items-center gap-2">
          {editState.saving && <Loader2 className="size-4 animate-spin text-muted-foreground" />}

          {editState.saved && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <Check className="size-3.5" />
              Actualizado
            </span>
          )}

          {editState.error && (
            <span className="flex items-center gap-1 text-xs text-destructive" title={editState.error}>
              <AlertCircle className="size-3.5" />
              Error
            </span>
          )}

          <Button
            size="sm"
            variant="outline"
            disabled={!canSave}
            onClick={() => onSave(match.id)}
            className="h-7 min-w-20 text-xs"
          >
            {isFinished && !hasChanged ? 'Actualizar' : 'Guardar'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function ScoreInput({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (value: string) => void
  disabled: boolean
}) {
  const display = value < 0 ? '' : String(value)
  return (
    <input
      type="number"
      min={0}
      max={20}
      value={display}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'h-9 w-10 rounded-lg border border-border bg-muted text-center text-sm font-bold tabular-nums transition-colors',
        'focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 focus:outline-none',
        '[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    />
  )
}

function SimulateTab() {
  const [pendingCount, setPendingCount] = useState<number | null>(null)
  const [simulating, setSimulating] = useState(false)
  const [results, setResults] = useState<SimResult[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const now = new Date().toISOString()
    supabase
      .from('bet_matches')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'finished')
      .lt('kickoff_at', now)
      .then(({ count }) => setPendingCount(count ?? 0))
  }, [])

  const handleSimulate = async () => {
    setSimulating(true)
    setError(null)
    setResults(null)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    if (!token) {
      setError('No hay sesión activa')
      setSimulating(false)
      return
    }

    try {
      const res = await fetch('/api/v1/bet/simulate-results', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json()

      if (!body.success) {
        setError(body.error ?? 'Error al simular')
      } else {
        setResults(body.data.results)
        setPendingCount(null)
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setSimulating(false)
    }
  }

  const simulated = results?.filter((r) => r.status === 'simulated').length ?? 0
  const skipped = results?.filter((r) => r.status === 'skipped').length ?? 0
  const errs = results?.filter((r) => r.status === 'error').length ?? 0

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Estado actual</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Partidos pendientes de resultado:{' '}
            <span className="font-semibold text-foreground">
              {pendingCount === null ? '—' : pendingCount}
            </span>
          </p>

          <Button
            onClick={handleSimulate}
            disabled={simulating || (pendingCount !== null && pendingCount === 0)}
          >
            {simulating ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Simulando…
              </>
            ) : (
              <>
                <Dice1 className="size-4" />
                Simular resultados pendientes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {error && (
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {results && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Resultado de la simulación</h2>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-4 text-sm">
              <span className="text-emerald-400">✓ {simulated} simulados</span>
              {skipped > 0 && <span className="text-muted-foreground">— {skipped} omitidos</span>}
              {errs > 0 && <span className="text-destructive">✗ {errs} errores</span>}
            </div>

                    {results.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-border text-muted-foreground">
                              <th className="pb-2 pr-4">Local</th>
                              <th className="pb-2 pr-4">Visitante</th>
                              <th className="pb-2 pr-4">Marcador</th>
                              <th className="pb-2">Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {results.map((r) => (
                              <tr key={r.match_id} className="border-b border-border/50 last:border-0">
                                <td className="py-2 pr-4">{r.home_team ?? '—'}</td>
                                <td className="py-2 pr-4">{r.away_team ?? '—'}</td>
                                <td className="py-2 pr-4 font-mono">
                                  {r.status === 'simulated' ? `${r.home_score} – ${r.away_score}` : '—'}
                                </td>
                                <td className="py-2">
                                  {r.status === 'simulated' && <span className="text-emerald-400">Simulado</span>}
                                  {r.status === 'skipped' && <span className="text-muted-foreground">Omitido</span>}
                                  {r.status === 'error' && (
                                    <span className="text-destructive" title={r.error}>
                                      Error
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )
        }

interface ClassificationData {
  groups: string[]
  groupTeams: Record<string, Array<{
    team_id: string
    team_name: string
    fifa_code: string
    flag_svg_url?: string
    played: number
    wins: number
    draws: number
    losses: number
    goals_for: number
    goals_against: number
    points: number
  }>>
  existingThird: Array<{ group_name: string; team_id: string }>
}

function ClassificationTab() {
  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  const [pools, setPools] = useState<Array<{ id: string; name: string }>>([])
  const [selectedPool, setSelectedPool] = useState<string | null>(null)
  const [data, setData] = useState<ClassificationData | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)
  const [debug, setDebug] = useState<any>(null)
  const [calcResult, setCalcResult] = useState<any>(null)
  const [rawResponse, setRawResponse] = useState<string | null>(null)

  const KO_STAGES = ['round_of_32', 'round_of_16', 'quarter_finals', 'semi_finals', 'third_place', 'final'] as const
  const emptyKO: Record<string, Array<{
    match_id: string; fifa_match_number: number; kickoff_at: string; venue: string;
    stage: string; home_placeholder: string; away_placeholder: string;
    home_team_id: string | null; away_team_id: string | null;
    home_score_official?: number; away_score_official?: number; status: string;
  }>> = Object.fromEntries(KO_STAGES.map(s => [s, []]))

  const [tournamentId, setTournamentId] = useState<string | null>(null)
  const [knockoutMatches, setKnockoutMatches] = useState<Record<string, Array<{
    match_id: string; fifa_match_number: number; kickoff_at: string; venue: string;
    stage: string; home_placeholder: string; away_placeholder: string;
    home_team_id: string | null; away_team_id: string | null;
    home_score_official?: number; away_score_official?: number; status: string;
  }>>>(emptyKO)
  const [allTeams, setAllTeams] = useState<Array<{ team_id: string; team_name: string; flag_svg_url?: string }>>([])
  const [generating, setGenerating] = useState<Record<string, boolean>>({})
  const [savingKO, setSavingKO] = useState<Record<string, boolean>>({})
  const [summary, setSummary] = useState<Record<string, { total: number; resolved: number; partial: number; unresolved: number } | null>>({})
  const [tournaments, setTournaments] = useState<Array<{ id: string; name: string }>>([])
  const [selectedTournament, setSelectedTournament] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('bet_tournaments')
      .select('id, name')
      .order('name')
      .then(({ data: d }) => setTournaments((d as Array<{ id: string; name: string }>) || []))
  }, [])

  useEffect(() => {
    if (!selectedTournament) { setPools([]); setSelectedPool(null); return }
    supabase
      .from('bet_pools')
      .select('id, name')
      .eq('tournament_id', selectedTournament)
      .order('name')
      .then(({ data: d }) => {
        const list = (d as Array<{ id: string; name: string }>) || []
        setPools(list)
        setSelectedPool(list.length === 1 ? list[0].id : null)
      })
  }, [selectedTournament])

  useEffect(() => {
    if (!selectedPool) { setData(null); return }
    setLoading(true)
    ;(async () => {
      const authHeaders = await getAuthHeaders()
      const res = await fetch(`/api/v1/bet/admin/classification?pool_id=${selectedPool}`, { headers: authHeaders })
      const json = await res.json()
      if (json.success) setData(json.data)
      setLoading(false)
    })()
  }, [selectedPool])

  useEffect(() => {
    if (!selectedPool) { setTournamentId(null); return }
    supabase.from('bet_pools').select('tournament_id').eq('id', selectedPool).single().then(({ data }) => {
      if (data) setTournamentId(data.tournament_id)
    })
  }, [selectedPool])

  useEffect(() => {
    if (!tournamentId) return
    supabase
      .from('bet_matches')
      .select('id, fifa_match_number, kickoff_at, venue, stage, home_placeholder, away_placeholder, home_team_id, away_team_id, home_score_official, away_score_official, status')
      .eq('tournament_id', tournamentId)
      .in('stage', KO_STAGES as unknown as string[])
      .order('fifa_match_number', { ascending: true })
      .then(({ data: matches }) => {
        if (!matches || matches.length === 0) return
        const grouped: Record<string, any[]> = {}
        for (const m of matches as any[]) {
          if (!grouped[m.stage]) grouped[m.stage] = []
          grouped[m.stage].push({ ...m, match_id: m.id })
        }
        setKnockoutMatches((prev) => ({ ...prev, ...grouped }))
        const newSummary: Record<string, any> = {}
        for (const [stage, stageMatches] of Object.entries(grouped)) {
          const resolved = stageMatches.filter((m: any) => m.home_team_id && m.away_team_id).length
          const partial = stageMatches.filter((m: any) => m.home_team_id || m.away_team_id).length - resolved
          newSummary[stage] = { total: stageMatches.length, resolved, partial, unresolved: stageMatches.length - resolved - partial }
        }
        setSummary(newSummary)
      })
  }, [tournamentId])

  useEffect(() => {
    if (!tournamentId) return
    supabase
      .from('bet_teams')
      .select('id, name, flag_svg_url')
      .order('name')
      .then(({ data: teams }) => {
        if (teams) {
          setAllTeams((teams as any[]).map((t) => ({
            team_id: t.id, team_name: t.name, flag_svg_url: t.flag_svg_url,
          })))
        }
      })
  }, [tournamentId])

  const handleSetBestThird = async (groupName: string, teamId: string) => {
    setSaving(true)
    setStatusMsg(null)
    const authHeaders = await getAuthHeaders()
    const res = await fetch('/api/v1/bet/admin/classification', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_best_third', pool_id: selectedPool, group_name: groupName, team_id: teamId }),
    })
    const json = await res.json()
    if (json.success) {
      setData((prev) => {
        if (!prev) return prev
        const existing = prev.existingThird.filter((e) => e.group_name !== groupName)
        return { ...prev, existingThird: [...existing, { group_name: groupName, team_id: teamId }] }
      })
      setStatusMsg(`Mejor tercero del grupo ${groupName} actualizado`)
    } else {
      setStatusMsg(`Error: ${json.error}`)
    }
    setSaving(false)
  }

  const handleRemoveBestThird = async (groupName: string) => {
    setSaving(true)
    setStatusMsg(null)
    const authHeaders = await getAuthHeaders()
    const res = await fetch('/api/v1/bet/admin/classification', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_best_third', pool_id: selectedPool, group_name: groupName }),
    })
    const json = await res.json()
    if (json.success) {
      setData((prev) => {
        if (!prev) return prev
        return { ...prev, existingThird: prev.existingThird.filter((e) => e.group_name !== groupName) }
      })
      setStatusMsg(`Mejor tercero del grupo ${groupName} removido`)
    } else {
      setStatusMsg(`Error: ${json.error}`)
    }
    setSaving(false)
  }

  const handleGenerate = async (stage: string) => {
    if (!tournamentId) return
    setGenerating((prev) => ({ ...prev, [stage]: true }))
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/v1/bet/admin/generate-round-of-32', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', tournament_id: tournamentId }),
      })
      const json = await res.json()
      if (json.success) {
        setKnockoutMatches((prev) => {
          const updated = { ...prev }
          updated[stage] = json.data.matches.map((m: any) => ({
            match_id: m.match_id, fifa_match_number: m.fifa_match_number,
            kickoff_at: m.kickoff_at, venue: m.venue, stage,
            home_placeholder: m.home_placeholder, away_placeholder: m.away_placeholder,
            home_team_id: m.home_team_id, away_team_id: m.away_team_id,
            home_score_official: null, away_score_official: null, status: 'scheduled',
          }))
          return updated
        })
        if (json.data.summary) {
          setSummary((prev) => ({ ...prev, [stage]: json.data.summary }))
        }
        if (json.data.qualified) {
          setAllTeams(json.data.qualified)
        }
      }
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating((prev) => ({ ...prev, [stage]: false }))
    }
  }

  const handleKOEdit = (stage: string, idx: number, field: string, value: string) => {
    setKnockoutMatches((prev) => {
      const updated = { ...prev }
      const matches = [...(updated[stage] || [])]
      if (matches[idx]) {
        matches[idx] = { ...matches[idx], [field]: value || null }
      }
      updated[stage] = matches
      return updated
    })
  }

  const handleSaveKO = async (stage: string) => {
    if (!tournamentId) return
    const matches = knockoutMatches[stage]
    if (!matches || matches.length === 0) return
    setSavingKO((prev) => ({ ...prev, [stage]: true }))
    try {
      const authHeaders = await getAuthHeaders()
      const res = await fetch('/api/v1/bet/admin/generate-round-of-32', {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_matches',
          tournament_id: tournamentId,
          matches: matches.map((m) => ({ match_id: m.match_id, home_team_id: m.home_team_id, away_team_id: m.away_team_id })),
        }),
      })
      const json = await res.json()
      if (json.success) setStatusMsg(`Partidos de ${STAGE_LABELS[stage] || stage} guardados (${json.data.updated})`)
      else setStatusMsg(`Error: ${json.error}`)
    } catch (e) {
      setStatusMsg(`Error: ${e instanceof Error ? e.message : e}`)
    } finally {
      setSavingKO((prev) => ({ ...prev, [stage]: false }))
    }
  }

  const handleCalculateAll = async () => {
    setSaving(true)
    setStatusMsg(null)
    const authHeaders = await getAuthHeaders()
    const res = await fetch('/api/v1/bet/admin/classification', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'calculate_classification', pool_id: selectedPool, group_name: null }),
    })
    const json = await res.json()
    if (json.success) {
      setStatusMsg(`Puntos de clasificación calculados para ${json.data?.groups_processed || 0} grupos`)
    } else {
      setStatusMsg(`Error: ${json.error}`)
    }
    setSaving(false)
  }

  const handleCalculateBestThird = async () => {
    setSaving(true)
    setStatusMsg(null)
    const authHeaders = await getAuthHeaders()
    const res = await fetch('/api/v1/bet/admin/classification', {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'calculate_best_third', pool_id: selectedPool }),
    })
    const json = await res.json()
    if (json.success) {
      setStatusMsg('Puntos de mejor tercero calculados')
    } else {
      setStatusMsg(`Error: ${json.error}`)
    }
    setSaving(false)
  }

  const getThirdSelectedTeam = (groupName: string): string | null => {
    return data?.existingThird.find((e) => e.group_name === groupName)?.team_id || null
  }

  const getThirdSelectedTeamName = (groupName: string): string => {
    const teamId = getThirdSelectedTeam(groupName)
    if (!teamId || !data?.groupTeams[groupName]) return ''
    const team = (data.groupTeams[groupName] as unknown as Array<{ team_id?: string; id?: string; team_name: string }>)
      .find((t) => (t.team_id || t.id) === teamId)
    return team?.team_name || ''
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Search className="size-4 text-muted-foreground" />
          <Select value={selectedTournament} onValueChange={setSelectedTournament}>
            <SelectTrigger className="w-64" aria-label="Seleccionar torneo">
              <SelectValue placeholder="Seleccionar torneo" />
            </SelectTrigger>
            <SelectContent>
              {tournaments.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedTournament && (
          <div className="flex items-center gap-2">
            <Users className="size-4 text-muted-foreground" />
            <Select value={selectedPool} onValueChange={setSelectedPool}>
              <SelectTrigger className="w-64" aria-label="Seleccionar polla">
                <SelectValue placeholder="Seleccionar una polla" />
              </SelectTrigger>
              <SelectContent>
                {pools.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {loading && (
        <Card><CardContent className="flex items-center justify-center py-12"><Loader2 className="size-5 animate-spin text-muted-foreground" /></CardContent></Card>
      )}

      {!selectedPool && !loading && (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">
          {!selectedTournament
            ? 'Selecciona un torneo para ver sus pollas'
            : 'Selecciona una polla para gestionar clasificados'}
        </CardContent></Card>
      )}

      {data && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks className="size-4 text-muted-foreground" />
                  <h2 className="text-sm font-semibold">Clasificación por Grupos</h2>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleCalculateAll} disabled={saving}>
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    Calcular puntos 1° y 2°
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCalculateBestThird} disabled={saving}>
                    {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Medal className="size-3.5" />}
                    Calcular puntos mejor 3°
                  </Button>
                </div>
              </div>
            </CardHeader>
            {statusMsg && (
              <div className="px-6 pb-3 text-xs text-emerald-400">{statusMsg}</div>
            )}
            <CardContent className="space-y-6">
              {data.groups.map((gn) => {
                const standings = data.groupTeams[gn] as unknown as Array<{
                  team_id?: string; id?: string; team_name: string; fifa_code?: string;
                  flag_svg_url?: string; played?: number; wins?: number; draws?: number;
                  losses?: number; goals_for?: number; goals_against?: number; points?: number;
                }>
                const selectedThirdTeamId = getThirdSelectedTeam(gn)

                return (
                  <div key={gn} className="rounded-lg border border-border/60">
                    <div className="flex items-center gap-2 border-b border-border/60 bg-muted/20 px-4 py-2.5">
                      <Trophy className="size-3.5 text-muted-foreground" />
                      <h3 className="text-xs font-semibold uppercase tracking-wider">Grupo {gn}</h3>
                    </div>

                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-[0.625rem] uppercase text-muted-foreground">
                          <th className="px-3 py-2 text-left font-semibold">#</th>
                          <th className="px-3 py-2 text-left font-semibold">Equipo</th>
                          <th className="px-3 py-2 text-center font-semibold">PJ</th>
                          <th className="px-3 py-2 text-center font-semibold">G</th>
                          <th className="px-3 py-2 text-center font-semibold">E</th>
                          <th className="px-3 py-2 text-center font-semibold">P</th>
                          <th className="px-3 py-2 text-center font-semibold">GF</th>
                          <th className="px-3 py-2 text-center font-semibold">GC</th>
                          <th className="px-3 py-2 text-center font-semibold">Pts</th>
                          <th className="px-3 py-2 text-center font-semibold">Mejor 3°</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((t, idx) => {
                          const teamId = t.team_id || t.id
                          const isThird = idx === 2
                          const isBestThird = isThird && selectedThirdTeamId === teamId
                          return (
                            <tr key={teamId} className={cn(
                              'border-t border-border/40 transition-colors',
                              idx < 2 && 'bg-emerald-500/[0.03]',
                              isBestThird && 'bg-blue-500/[0.05]'
                            )}>
                              <td className="px-3 py-2 font-mono tabular-nums text-muted-foreground">{idx + 1}</td>
                              <td className="flex items-center gap-1.5 px-3 py-2">
                                {t.flag_svg_url && (
                                  <img src={t.flag_svg_url} alt="" className="size-4 shrink-0 rounded-sm object-cover" loading="lazy" />
                                )}
                                <span className="truncate font-medium">{t.team_name}</span>
                                <span className="text-[0.625rem] text-muted-foreground">{t.fifa_code}</span>
                              </td>
                              <td className="px-3 py-2 text-center font-mono tabular-nums">{t.played ?? 0}</td>
                              <td className="px-3 py-2 text-center font-mono tabular-nums">{t.wins ?? 0}</td>
                              <td className="px-3 py-2 text-center font-mono tabular-nums">{t.draws ?? 0}</td>
                              <td className="px-3 py-2 text-center font-mono tabular-nums">{t.losses ?? 0}</td>
                              <td className="px-3 py-2 text-center font-mono tabular-nums">{t.goals_for ?? 0}</td>
                              <td className="px-3 py-2 text-center font-mono tabular-nums">{t.goals_against ?? 0}</td>
                              <td className="px-3 py-2 text-center font-mono text-sm font-bold tabular-nums text-emerald-400">{t.points ?? 0}</td>
                              <td className="px-3 py-2 text-center">
                                {isThird ? (
                                  selectedThirdTeamId === teamId ? (
                                    <div className="flex items-center justify-center gap-1">
                                      <Check className="size-3.5 text-blue-400" />
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveBestThird(gn)}
                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                        disabled={saving}
                                        title="Quitar como mejor tercero"
                                      >
                                        <X className="size-3" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => { if (teamId) handleSetBestThird(gn, teamId); }}
                                      disabled={saving}
                                      className={cn(
                                        'text-xs px-2 py-1 rounded border transition-colors',
                                        saving
                                          ? 'border-border/40 text-muted-foreground cursor-not-allowed'
                                          : 'border-blue-500/30 text-blue-400 hover:bg-blue-500/10 cursor-pointer'
                                      )}
                                    >
                                      Marcar como mejor 3°
                                    </button>
                                  )
                                ) : selectedThirdTeamId === teamId ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <Check className="size-3.5 text-blue-400" />
                                    <span className="text-[0.625rem] text-blue-400">3° ({gn})</span>
                                  </div>
                                ) : null}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* FASES ELIMINATORIAS */}
          {KO_STAGES.map((stage) => {
            const stageMatches = knockoutMatches[stage]
            const stageSummary = summary[stage]
            const stageLabel = STAGE_LABELS[stage] || stage
            const isGenerating = generating[stage]
            const isSaving = savingKO[stage]

            return (
              <Card key={stage} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="size-4 text-muted-foreground" />
                      <h2 className="text-sm font-semibold">{stageLabel}</h2>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleGenerate(stage)}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <><Loader2 className="size-3.5 animate-spin" /> Generando…</>
                      ) : (
                        `Generar ${stageLabel}`
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {stageSummary && (
                    <div className="flex gap-4 text-xs">
                      <span className="text-emerald-400">✓ {stageSummary.resolved} completos</span>
                      {stageSummary.partial > 0 && <span className="text-amber-400">~ {stageSummary.partial} parciales</span>}
                      {stageSummary.unresolved > 0 && <span className="text-destructive">✗ {stageSummary.unresolved} sin resolver</span>}
                    </div>
                  )}

                  {stageMatches && stageMatches.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-border text-muted-foreground text-xs">
                            <th className="pb-2 pr-2 font-semibold">#</th>
                            <th className="pb-2 pr-2 font-semibold">Local</th>
                            <th className="pb-2 pr-2 font-semibold"></th>
                            <th className="pb-2 pr-2 font-semibold">Visitante</th>
                            <th className="pb-2 pr-2 font-semibold">Marcador</th>
                            <th className="pb-2 pr-2 font-semibold">Sede</th>
                            <th className="pb-2 font-semibold"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {stageMatches.map((m, idx) => (
                            <tr key={m.match_id || `ko-${stage}-${idx}`} className="border-b border-border/40 last:border-0">
                              <td className="py-2 pr-2 text-muted-foreground font-mono text-xs">{m.fifa_match_number}</td>
                              <td className="py-2 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[0.625rem] text-muted-foreground truncate max-w-[60px]">{m.home_placeholder}</span>
                                  <select
                                    value={m.home_team_id || ''}
                                    onChange={(e) => handleKOEdit(stage, idx, 'home_team_id', e.target.value)}
                                    className="rounded border border-border bg-muted px-1.5 py-1 text-xs max-w-[130px]"
                                  >
                                    <option value="">—</option>
                                    {allTeams.map((t) => (
                                      <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
                                    ))}
                                  </select>
                                </div>
                              </td>
                              <td className="py-2 pr-2 text-muted-foreground text-xs">vs</td>
                              <td className="py-2 pr-2">
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={m.away_team_id || ''}
                                    onChange={(e) => handleKOEdit(stage, idx, 'away_team_id', e.target.value)}
                                    className="rounded border border-border bg-muted px-1.5 py-1 text-xs max-w-[130px]"
                                  >
                                    <option value="">—</option>
                                    {allTeams.map((t) => (
                                      <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
                                    ))}
                                  </select>
                                  <span className="text-[0.625rem] text-muted-foreground truncate max-w-[60px]">{m.away_placeholder}</span>
                                </div>
                              </td>
                              <td className="py-2 pr-2">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs tabular-nums font-mono">
                                    {m.home_score_official ?? '–'}
                                  </span>
                                  <span className="text-[0.625rem] text-muted-foreground">:</span>
                                  <span className="text-xs tabular-nums font-mono">
                                    {m.away_score_official ?? '–'}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2 pr-2 text-xs text-muted-foreground truncate max-w-[100px]">{m.venue || '—'}</td>
                              <td className="py-2">
                                {m.home_team_id && m.away_team_id ? (
                                  <Check className="size-3.5 text-emerald-400" />
                                ) : (
                                  <AlertCircle className="size-3.5 text-amber-400" />
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      No hay partidos cargados para esta fase. Presiona &ldquo;Generar {stageLabel}&rdquo; para crearlos.
                    </p>
                  )}

                  {stageMatches && stageMatches.length > 0 && (
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveKO(stage)}
                        disabled={isSaving}
                      >
                        {isSaving ? <><Loader2 className="size-3.5 animate-spin" /> Guardando…</> : 'Guardar cambios'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Medal className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Mejores Terceros Seleccionados ({data.existingThird.length}/8)</h2>
              </div>
            </CardHeader>
            <CardContent>
              {data.existingThird.length === 0 ? (
                <p className="text-xs text-muted-foreground">No hay mejores terceros seleccionados aún</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.existingThird
                    .sort((a, b) => a.group_name.localeCompare(b.group_name))
                    .map((e) => (
                      <div key={e.group_name} className="flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/5 px-3 py-1 text-xs">
                        <Flag className="size-3 text-blue-400" />
                        <span className="font-medium">Grupo {e.group_name}</span>
                        <span className="text-muted-foreground">→</span>
                        <span>{getThirdSelectedTeamName(e.group_name) || '—'}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveBestThird(e.group_name)}
                          disabled={saving}
                          className="ml-1 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
