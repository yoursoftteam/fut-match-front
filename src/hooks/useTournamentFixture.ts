"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import {
  computeStandingsByGroup,
  assignScheduleToExistingMatches,
  generateGroupsFixtureWithSchedule,
  generateFixtureWithSchedule,
  type GeneratedTournamentMatchInput,
  type StandingRow,
} from "@/lib/tournament-fixture"
import { runTournamentAlgorithmValidations } from "@/lib/tournament-fixture.validation"
import type { Tournament, TournamentMatch, TournamentTeam } from "@/lib/tournament-schema"

interface UseTournamentFixtureState {
  tournament: Tournament | null
  teams: TournamentTeam[]
  matches: TournamentMatch[]
  standingsByGroup: Record<string, StandingRow[]>
  loading: boolean
  generating: boolean
  error: string | null
  isOwner: boolean
}

interface UseTournamentFixtureActions {
  refresh: () => Promise<void>
  generateFixture: (forceRegenerate?: boolean) => Promise<boolean>
  assignSchedule: () => Promise<boolean>
}

export function useTournamentFixture(tournamentId: string): UseTournamentFixtureState & UseTournamentFixtureActions {
  const { user } = useAuth()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<TournamentTeam[]>([])
  const [matches, setMatches] = useState<TournamentMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOwner = Boolean(user && tournament && user.id === tournament.owner_id)

  const standingsByGroup = useMemo(() => {
    if (!tournament) return {}
    return computeStandingsByGroup(tournament, teams, matches)
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
      setMatches((matchesResult.data ?? []) as TournamentMatch[])
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cargar fixture del torneo"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  const generateFixture = useCallback(
    async (forceRegenerate = false): Promise<boolean> => {
      if (!user) {
        setError("Debes iniciar sesión para generar fixture")
        return false
      }

      if (!tournament) {
        setError("No se encontró el torneo")
        return false
      }

      if (tournament.owner_id !== user.id) {
        setError("Solo el organizador puede generar el fixture")
        return false
      }

      if (teams.length < 2) {
        setError("Necesitas al menos 2 equipos inscritos")
        return false
      }

      if (matches.length > 0 && !forceRegenerate) {
        setError("Este torneo ya tiene fixture generado")
        return false
      }

      setGenerating(true)
      setError(null)

      try {
        if (process.env.NODE_ENV !== "production") {
          const validations = runTournamentAlgorithmValidations()
          const failed = validations.find((validation) => !validation.pass)
          if (failed) {
            throw new Error(`Validación de algoritmo falló (${failed.name}): ${failed.detail}`)
          }
        }

        let generatedMatches: GeneratedTournamentMatchInput[] = []
        const scheduleConfig =
          tournament.scheduled_days && tournament.scheduled_days.length > 0 ? tournament.scheduled_days : null

        if (tournament.tournament_type === "league") {
          generatedMatches = generateFixtureWithSchedule(
            tournament.id,
            teams.map((team) => ({ id: team.id, name: team.name })),
            tournament.league_mode ?? "single_leg",
            tournament.starts_at ?? new Date().toISOString(),
            scheduleConfig
          )
        } else {
          const groupsCount = tournament.groups_count ?? 2
          const groupFixture = generateGroupsFixtureWithSchedule(
            tournament.id,
            teams.map((team) => ({ id: team.id, name: team.name })),
            groupsCount,
            tournament.id,
            tournament.starts_at ?? new Date().toISOString(),
            scheduleConfig
          )
          generatedMatches = groupFixture.matches
        }

        if (forceRegenerate && matches.length > 0) {
          const { error: deleteError } = await supabase
            .from("tournament_matches")
            .delete()
            .eq("tournament_id", tournament.id)

          if (deleteError) throw deleteError
        }

        if (generatedMatches.length === 0) {
          throw new Error("No se pudieron generar partidos para este torneo")
        }

        const { error: insertError } = await supabase.from("tournament_matches").insert(generatedMatches)
        if (insertError) throw insertError

        await refresh()
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudo generar el fixture"
        setError(message)
        return false
      } finally {
        setGenerating(false)
      }
    },
    [matches.length, refresh, teams, tournament, user]
  )

  const assignSchedule = useCallback(async (): Promise<boolean> => {
    if (!user) {
      setError("Debes iniciar sesión para asignar horarios")
      return false
    }

    if (!tournament) {
      setError("No se encontró el torneo")
      return false
    }

    if (tournament.owner_id !== user.id) {
      setError("Solo el organizador puede asignar horarios")
      return false
    }

    if (!tournament.scheduled_days || tournament.scheduled_days.length === 0) {
      setError("Primero configura el cronograma del torneo")
      return false
    }

    if (matches.length === 0) {
      setError("No hay partidos para asignar horarios")
      return false
    }

    setGenerating(true)
    setError(null)

    try {
      const updates = assignScheduleToExistingMatches(
        matches.map((match) => ({
          id: match.id,
          tournament_id: match.tournament_id,
          home_team_id: match.home_team_id,
          away_team_id: match.away_team_id,
          home_goals: match.home_goals,
          away_goals: match.away_goals,
          starts_at: match.starts_at,
          match_status: match.match_status,
          phase_label: match.phase_label ?? "",
          round_number: match.round_number ?? 0,
          group_label: match.group_label,
          created_at: match.created_at,
        })),
        tournament.starts_at ?? new Date().toISOString(),
        tournament.scheduled_days,
        tournament.id
      )

      for (const update of updates) {
        const { error: updateError } = await supabase
          .from("tournament_matches")
          .update({ starts_at: update.starts_at })
          .eq("id", update.id)

        if (updateError) throw updateError
      }

      await refresh()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron asignar horarios"
      setError(message)
      return false
    } finally {
      setGenerating(false)
    }
  }, [matches, refresh, tournament, user])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    tournament,
    teams,
    matches,
    standingsByGroup,
    loading,
    generating,
    error,
    isOwner,
    refresh,
    generateFixture,
    assignSchedule,
  }
}
