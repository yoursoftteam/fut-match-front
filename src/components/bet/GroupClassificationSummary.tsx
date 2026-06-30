'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { calculateGroupStandings } from '@/lib/bet-utils'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TeamInfo {
  id: string
  name: string
  fifa_code: string
  flag_svg_url?: string
}

interface StandingsRow {
  team_id: string
  team_name: string
  fifa_code: string
  played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  points: number
}

interface MatchRow {
  id: string
  group_name: string
  home_team_id: string
  away_team_id: string
  home_score_official: number | null
  away_score_official: number | null
  home_team?: TeamInfo | null
  away_team?: TeamInfo | null
}

interface PredictionRow {
  match_id: string
  home_score_predicted: number
  away_score_predicted: number
}

interface QualifiedTeam extends TeamInfo {
  group_name: string
  position: number
  is_best_third: boolean
  user_predicted: boolean
}

export function GroupClassificationSummary({
  poolId,
  tournamentId,
}: {
  poolId: string
  tournamentId: string
}) {
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [predictions, setPredictions] = useState<Map<string, PredictionRow>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { data: authData } = await supabase.auth.getSession()
        const token = authData?.session?.access_token
        if (!token) { setError('No autenticado'); setLoading(false); return }

        const [matchesRes, predsRes] = await Promise.all([
          fetch(`/api/v1/bet/matches?tournament_id=${tournamentId}&stage=group_stage`),
          fetch(`/api/v1/bet/predictions?pool_id=${poolId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        const [matchesData, predsData] = await Promise.all([
          matchesRes.json(),
          predsRes.json(),
        ])

        if (cancelled) return

        const allMatches: MatchRow[] = matchesData.success ? matchesData.data ?? matchesData : matchesData.matches ?? matchesData
        const allPredictions: PredictionRow[] = predsData.success ? predsData.data : []

        setMatches(Array.isArray(allMatches) ? allMatches : [])
        setPredictions(new Map((Array.isArray(allPredictions) ? allPredictions : []).map((p: PredictionRow) => [p.match_id, p])))
      } catch {
        if (!cancelled) setError('Error al cargar datos')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [tournamentId, poolId])

  const realStandingsByGroup = useMemo(() => {
    const groupsMap = new Map<string, MatchRow[]>()
    for (const m of matches) {
      if (!m.group_name) continue
      const arr = groupsMap.get(m.group_name) ?? []
      arr.push(m)
      groupsMap.set(m.group_name, arr)
    }

    const result: Map<string, StandingsRow[]> = new Map()
    for (const [groupName, groupMatches] of groupsMap) {
      const finished = groupMatches.filter(
        (m) => m.home_score_official != null && m.away_score_official != null
      )
      if (finished.length === 0) continue

      const teamMap = new Map<string, { id: string; name: string; fifa_code: string }>()
      for (const m of groupMatches) {
        if (m.home_team) teamMap.set(m.home_team.id, { id: m.home_team.id, name: m.home_team.name, fifa_code: m.home_team.fifa_code })
        if (m.away_team) teamMap.set(m.away_team.id, { id: m.away_team.id, name: m.away_team.name, fifa_code: m.away_team.fifa_code })
      }

      const inputs = finished.map((m) => ({
        homeTeamId: m.home_team_id,
        homeTeamName: m.home_team?.name ?? '',
        awayTeamId: m.away_team_id,
        awayTeamName: m.away_team?.name ?? '',
        homeScore: m.home_score_official!,
        awayScore: m.away_score_official!,
      }))

      const calc = calculateGroupStandings(inputs, Array.from(teamMap.values()))
      result.set(groupName, calc.teams)
    }
    return result
  }, [matches])

  const userStandingsByGroup = useMemo(() => {
    if (predictions.size === 0) return new Map<string, StandingsRow[]>()

    const groupsMap = new Map<string, MatchRow[]>()
    for (const m of matches) {
      if (!m.group_name) continue
      const arr = groupsMap.get(m.group_name) ?? []
      arr.push(m)
      groupsMap.set(m.group_name, arr)
    }

    const result: Map<string, StandingsRow[]> = new Map()
    for (const [groupName, groupMatches] of groupsMap) {
      const teamMap = new Map<string, { id: string; name: string; fifa_code: string }>()
      for (const m of groupMatches) {
        if (m.home_team) teamMap.set(m.home_team.id, { id: m.home_team.id, name: m.home_team.name, fifa_code: m.home_team.fifa_code })
        if (m.away_team) teamMap.set(m.away_team.id, { id: m.away_team.id, name: m.away_team.name, fifa_code: m.away_team.fifa_code })
      }

      const inputs = groupMatches
        .map((m) => {
          const pred = predictions.get(m.id)
          if (!pred) return null
          return {
            homeTeamId: m.home_team_id,
            homeTeamName: m.home_team?.name ?? '',
            awayTeamId: m.away_team_id,
            awayTeamName: m.away_team?.name ?? '',
            homeScore: pred.home_score_predicted,
            awayScore: pred.away_score_predicted,
          }
        })
        .filter((m): m is NonNullable<typeof m> => m !== null)

      if (inputs.length < 3) continue

      const calc = calculateGroupStandings(inputs, Array.from(teamMap.values()))
      result.set(groupName, calc.teams)
    }
    return result
  }, [matches, predictions])

  const qualifiedTeams = useMemo(() => {
    const teams: QualifiedTeam[] = []

    for (const [groupName, standings] of realStandingsByGroup) {
      for (let i = 0; i < Math.min(2, standings.length); i++) {
        const t = standings[i]
        teams.push({
          id: t.team_id,
          name: t.team_name,
          fifa_code: t.fifa_code,
          flag_svg_url: undefined,
          group_name: groupName,
          position: i + 1,
          is_best_third: false,
          user_predicted: false,
        })
      }
    }

    const thirdPlaced: { team: StandingsRow; groupName: string }[] = []
    for (const [groupName, standings] of realStandingsByGroup) {
      if (standings.length >= 3) {
        thirdPlaced.push({ team: standings[2], groupName })
      }
    }

    thirdPlaced.sort((a, b) => {
      if (a.team.points !== b.team.points) return b.team.points - a.team.points
      const aGd = a.team.goals_for - a.team.goals_against
      const bGd = b.team.goals_for - b.team.goals_against
      if (aGd !== bGd) return bGd - aGd
      return b.team.goals_for - a.team.goals_for
    })

    for (let i = 0; i < Math.min(8, thirdPlaced.length); i++) {
      const t = thirdPlaced[i]
      const match = matches.find(
        (m) => m.group_name === t.groupName && (m.home_team_id === t.team.team_id || m.away_team_id === t.team.team_id)
      )
      teams.push({
        id: t.team.team_id,
        name: t.team.team_name,
        fifa_code: t.team.fifa_code,
        flag_svg_url: match?.home_team_id === t.team.team_id
          ? match.home_team?.flag_svg_url
          : match?.away_team?.flag_svg_url,
        group_name: t.groupName,
        position: 3,
        is_best_third: true,
        user_predicted: false,
      })
    }

    for (const team of teams) {
      const userStandings = userStandingsByGroup.get(team.group_name)
      if (!userStandings) continue
      const userTop3Ids = new Set(userStandings.slice(0, 3).map((t) => t.team_id))
      team.user_predicted = userTop3Ids.has(team.id)
    }

    teams.sort((a, b) => {
      if (a.group_name !== b.group_name) return a.group_name.localeCompare(b.group_name)
      return a.position - b.position
    })

    return teams
  }, [realStandingsByGroup, userStandingsByGroup, matches])

  const pointsEarned = useMemo(() => {
    let pts = 0
    for (const t of qualifiedTeams) {
      if (t.user_predicted) pts += 5
    }
    return pts
  }, [qualifiedTeams])

  const maxPoints = qualifiedTeams.length * 5

  const userThirdPlacedValidation = useMemo(() => {
    const qualifiedIds = new Set(qualifiedTeams.map((t) => t.id))
    const thirds: { team: StandingsRow; groupName: string; qualified: boolean }[] = []
    for (const [groupName, userStandings] of userStandingsByGroup) {
      if (userStandings.length >= 3) {
        thirds.push({
          team: userStandings[2],
          groupName,
          qualified: qualifiedIds.has(userStandings[2].team_id),
        })
      }
    }
    return thirds.sort((a, b) => a.groupName.localeCompare(b.groupName))
  }, [userStandingsByGroup, qualifiedTeams])

  const validatedThirdCount = userThirdPlacedValidation.filter((t) => t.qualified).length
  const totalUserThirds = userThirdPlacedValidation.length

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return <p className="py-8 text-center text-sm text-red-400">{error}</p>
  }

  if (qualifiedTeams.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Aún no hay datos de clasificaci\u00F3n disponibles.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">
            {qualifiedTeams.length} clasificados
          </h3>
          <span className="text-xs text-muted-foreground">
            {pointsEarned}/{maxPoints} pts
          </span>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {qualifiedTeams.map((team) => {
            const flagUrl = matches
              .find((m) => m.group_name === team.group_name && (m.home_team_id === team.id || m.away_team_id === team.id))
              ?.home_team_id === team.id
              ? matches.find((m) => m.group_name === team.group_name && m.home_team_id === team.id)?.home_team?.flag_svg_url
              : matches.find((m) => m.group_name === team.group_name && m.away_team_id === team.id)?.away_team?.flag_svg_url

            return (
              <div
                key={`${team.group_name}-${team.id}`}
                className={cn(
                  'flex items-center gap-2 rounded-lg border p-2.5 transition-colors',
                  team.user_predicted
                    ? 'border-emerald-500/30 bg-emerald-500/5'
                    : 'border-border bg-card/50'
                )}
              >
                {flagUrl ? (
                  <img src={flagUrl} alt="" className="size-6 shrink-0 rounded-sm object-cover" loading="lazy" />
                ) : (
                  <span className="size-6 shrink-0 rounded-sm border border-border bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-foreground">
                      {team.name}
                    </span>
                    <span className="shrink-0 text-[0.625rem] text-muted-foreground" translate="no">
                      {team.fifa_code}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[0.625rem] text-muted-foreground">
                    <span>Grupo {team.group_name}</span>
                    {team.is_best_third && (
                      <span className="rounded-sm bg-amber-500/10 px-1 py-0.5 text-amber-400">
                        3er
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {team.user_predicted ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="size-3.5" />
                      +5 pts
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400">
                      <XCircle className="size-3.5" />
                      +0 pts
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {totalUserThirds > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Validación de tus terceros
            </h3>
            <span className="text-xs text-muted-foreground">
              {validatedThirdCount}/{totalUserThirds} clasificados
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {userThirdPlacedValidation.map(({ team, groupName, qualified }) => {
              const flagUrl = matches
                .find(
                  (m) =>
                    m.group_name === groupName &&
                    (m.home_team_id === team.team_id || m.away_team_id === team.team_id)
                )
                ?.home_team_id === team.team_id
                ? matches.find(
                    (m) => m.group_name === groupName && m.home_team_id === team.team_id
                  )?.home_team?.flag_svg_url
                : matches.find(
                    (m) => m.group_name === groupName && m.away_team_id === team.team_id
                  )?.away_team?.flag_svg_url

              return (
                <div
                  key={`third-val-${groupName}`}
                  className={cn(
                    'flex items-center gap-2 rounded-lg border p-2.5 transition-colors',
                    qualified
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : 'border-border bg-card/50'
                  )}
                >
                  {flagUrl ? (
                    <img
                      src={flagUrl}
                      alt=""
                      className="size-6 shrink-0 rounded-sm object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <span className="size-6 shrink-0 rounded-sm border border-border bg-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium text-foreground">
                        {team.team_name}
                      </span>
                      <span
                        className="shrink-0 text-[0.625rem] text-muted-foreground"
                        translate="no"
                      >
                        {team.fifa_code}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[0.625rem] text-muted-foreground">
                      <span>Grupo {groupName}</span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    {qualified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="size-3.5" />
                        Clasificado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400">
                        <XCircle className="size-3.5" />
                        No clasificado
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
