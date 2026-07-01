"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { computeStandings, type StandingRow } from "@/lib/tournament-fixture"
import type { Tournament, TournamentMatch, TournamentTeam } from "@/lib/tournament-schema"

interface UseTournamentResultsState {
  tournament: Tournament | null
  teams: TournamentTeam[]
  matches: TournamentMatch[]
  rounds: number[]
  selectedRound: number
  standings: StandingRow[]
  loading: boolean
  saving: boolean
  error: string | null
  isOwner: boolean
}

interface UseTournamentResultsActions {
  selectRound: (round: number) => void
  updateMatchScore: (matchId: string, homeGoals: number, awayGoals: number) => Promise<boolean>
  updateMatchStatus: (matchId: string, status: "pending" | "played" | "live") => Promise<boolean>
  refresh: () => Promise<void>
}

export function useTournamentResults(
  tournamentId: string
): UseTournamentResultsState & UseTournamentResultsActions {
  const { user } = useAuth()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<TournamentTeam[]>([])
  const [matches, setMatches] = useState<TournamentMatch[]>([])
  const [selectedRound, setSelectedRound] = useState<number>(1)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOwner = Boolean(user && tournament && user.id === tournament.owner_id)
  const hasRoundsRef = useRef(false)

  const rounds = useMemo(() => {
    const values = Array.from(new Set(matches.map((m) => m.round_number).filter((n): n is number => n !== null)))
    return values.sort((a, b) => a - b)
  }, [matches])

  const standings = useMemo(() => {
    if (!tournament) return []
    return computeStandings(
      teams.map((t) => ({ id: t.id, name: t.name })),
      matches
    )
  }, [matches, teams, tournament])

  const refresh = useCallback(async () => {
    if (!tournamentId) return
    setLoading(true)
    setError(null)

    try {
      const [tournamentResult, teamsResult, matchesResult] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", tournamentId).maybeSingle(),
        supabase.from("tournament_teams").select("*").eq("tournament_id", tournamentId).order("created_at", { ascending: true }),
        supabase
          .from("tournament_matches")
          .select("*")
          .eq("tournament_id", tournamentId)
          .order("round_number", { ascending: true })
          .order("created_at", { ascending: true }),
      ])

      if (tournamentResult.error) throw tournamentResult.error
      if (teamsResult.error) throw teamsResult.error
      if (matchesResult.error) throw matchesResult.error

      setTournament((tournamentResult.data as Tournament | null) ?? null)
      setTeams((teamsResult.data ?? []) as TournamentTeam[])
      const matchData = (matchesResult.data ?? []) as TournamentMatch[]
      setMatches(matchData)

      if (matchData.length > 0 && !hasRoundsRef.current) {
        const r = Array.from(new Set(matchData.map((m) => m.round_number).filter((n): n is number => n !== null))).sort()
        if (r.length > 0) {
          setSelectedRound(r[0])
          hasRoundsRef.current = true
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar los resultados"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  const updateMatchScore = useCallback(
    async (matchId: string, homeGoals: number, awayGoals: number): Promise<boolean> => {
      if (!isOwner) {
        setError("Solo el organizador puede actualizar resultados")
        return false
      }

      setSaving(true)
      setError(null)

      try {
        const { error: updateError } = await supabase
          .from("tournament_matches")
          .update({
            home_goals: homeGoals,
            away_goals: awayGoals,
            match_status: "played",
          })
          .eq("id", matchId)

        if (updateError) throw updateError

        setMatches((prev) =>
          prev.map((match) =>
            match.id === matchId
              ? { ...match, home_goals: homeGoals, away_goals: awayGoals, match_status: "played" as const }
              : match
          )
        )

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudo actualizar el marcador"
        setError(message)
        return false
      } finally {
        setSaving(false)
      }
    },
    [isOwner]
  )

  const updateMatchStatus = useCallback(
    async (matchId: string, status: "pending" | "played" | "live"): Promise<boolean> => {
      if (!isOwner) {
        setError("Solo el organizador puede cambiar el estado")
        return false
      }

      setSaving(true)
      setError(null)

      try {
        const { error: updateError } = await supabase
          .from("tournament_matches")
          .update({ match_status: status })
          .eq("id", matchId)

        if (updateError) throw updateError

        setMatches((prev) =>
          prev.map((match) =>
            match.id === matchId ? { ...match, match_status: status } : match
          )
        )

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudo actualizar el estado"
        setError(message)
        return false
      } finally {
        setSaving(false)
      }
    },
    [isOwner]
  )

  const selectRound = useCallback((round: number) => {
    setSelectedRound(round)
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    tournament,
    teams,
    matches,
    rounds,
    selectedRound,
    standings,
    loading,
    saving,
    error,
    isOwner,
    selectRound,
    updateMatchScore,
    updateMatchStatus,
    refresh,
  }
}
