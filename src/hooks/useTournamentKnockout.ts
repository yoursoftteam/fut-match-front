"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import {
  computeStandingsByGroup,
  determineQualifiedTeams,
  generateKnockoutBracket,
  type KnockoutBracketMatch,
  type QualifiedTeam,
  type StandingRow,
} from "@/lib/tournament-fixture"
import type { Tournament, TournamentMatch, TournamentTeam } from "@/lib/tournament-schema"

interface UseTournamentKnockoutState {
  tournament: Tournament | null
  teams: TournamentTeam[]
  groupMatches: TournamentMatch[]
  standingsByGroup: Record<string, StandingRow[]>
  qualifiedTeams: QualifiedTeam[]
  bracketMatches: KnockoutBracketMatch[]
  loading: boolean
  generating: boolean
  error: string | null
  isOwner: boolean
  canGenerateKnockout: boolean
}

interface UseTournamentKnockoutActions {
  generateBracket: () => Promise<boolean>
  updateKnockoutScore: (match: KnockoutBracketMatch, homeGoals: number, awayGoals: number) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useTournamentKnockout(
  tournamentId: string
): UseTournamentKnockoutState & UseTournamentKnockoutActions {
  const { user } = useAuth()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<TournamentTeam[]>([])
  const [groupMatches, setGroupMatches] = useState<TournamentMatch[]>([])
  const [bracketMatches, setBracketMatches] = useState<KnockoutBracketMatch[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOwner = Boolean(user && tournament && user.id === tournament.owner_id)

  const standingsByGroup = useMemo(() => {
    if (!tournament) return {}
    return computeStandingsByGroup(tournament, teams, groupMatches)
  }, [groupMatches, teams, tournament])

  const qualifiedTeams = useMemo(() => {
    if (!tournament || tournament.tournament_type !== "groups") return []
    const qpg = tournament.qualifiers_per_group ?? 0
    if (qpg <= 0) return []
    return determineQualifiedTeams(standingsByGroup, qpg)
  }, [tournament, standingsByGroup])

  const canGenerateKnockout = useMemo(() => {
    if (!tournament) return false
    if (tournament.tournament_type !== "groups") return false
    if (!tournament.has_knockout) return false
    if (qualifiedTeams.length < 2) return false
    return true
  }, [tournament, qualifiedTeams])

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

      const t = (tournamentResult.data as Tournament | null) ?? null
      const tm = (teamsResult.data ?? []) as TournamentTeam[]
      const mm = (matchesResult.data ?? []) as TournamentMatch[]

      setTournament(t)
      setTeams(tm)
      setGroupMatches(mm)

      const existingKnockout = mm.filter((m) => !m.group_label && m.phase_label?.toLowerCase().includes("final"))
      if (existingKnockout.length > 0) {
        setBracketMatches(
          existingKnockout.map((m) => ({
            id: m.id,
            tournament_id: m.tournament_id,
            home_team_id: m.home_team_id,
            away_team_id: m.away_team_id,
            home_goals: m.home_goals,
            away_goals: m.away_goals,
            starts_at: m.starts_at,
            match_status: m.match_status,
            phase_label: m.phase_label ?? "",
            round_number: m.round_number ?? 0,
            group_label: null,
            created_at: m.created_at,
          }))
        )
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cargar el knockout"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  const generateBracket = useCallback(async (): Promise<boolean> => {
    if (!user || !tournament || !isOwner) {
      setError("Solo el organizador puede generar el bracket")
      return false
    }

    if (!canGenerateKnockout) {
      setError("No hay suficientes equipos clasificados para generar el bracket")
      return false
    }

    setGenerating(true)
    setError(null)

    try {
      const knockoutPhase = tournament.knockout_phase ?? "quarterfinals"
      const generated = generateKnockoutBracket(
        tournament.id,
        qualifiedTeams,
        knockoutPhase,
        tournament.id
      )

      if (generated.length === 0) {
        throw new Error("No se pudo generar el bracket de knockout")
      }

      const existingKo = bracketMatches
      if (existingKo.length > 0) {
        const koIds = existingKo.map((m) => m.id)
        const { error: deleteError } = await supabase
          .from("tournament_matches")
          .delete()
          .in("id", koIds)
        if (deleteError) throw deleteError
      }

      const insertPayload = generated.map((m) => ({
        tournament_id: m.tournament_id,
        home_team_id: m.home_team_id,
        away_team_id: m.away_team_id,
        home_goals: m.home_goals,
        away_goals: m.away_goals,
        starts_at: m.starts_at,
        match_status: m.match_status,
        phase_label: m.phase_label,
        round_number: m.round_number,
        group_label: null,
      }))

      const { error: insertError } = await supabase.from("tournament_matches").insert(insertPayload)
      if (insertError) throw insertError

      setBracketMatches(generated)
      await refresh()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo generar el bracket"
      setError(message)
      return false
    } finally {
      setGenerating(false)
    }
  }, [user, tournament, isOwner, canGenerateKnockout, qualifiedTeams, bracketMatches, refresh])

  const updateKnockoutScore = useCallback(
    async (match: KnockoutBracketMatch, homeGoals: number, awayGoals: number): Promise<boolean> => {
      if (!isOwner) {
        setError("Solo el organizador puede actualizar marcadores")
        return false
      }

      setGenerating(true)
      setError(null)

      try {
        const { error: updateError } = await supabase
          .from("tournament_matches")
          .update({ home_goals: homeGoals, away_goals: awayGoals, match_status: "played" })
          .eq("id", match.id)

        if (updateError) throw updateError

        setBracketMatches((prev) =>
          prev.map((m) =>
            m.id === match.id ? { ...m, home_goals: homeGoals, away_goals: awayGoals, match_status: "played" as const } : m
          )
        )

        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudo actualizar el marcador"
        setError(message)
        return false
      } finally {
        setGenerating(false)
      }
    },
    [isOwner]
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    tournament,
    teams,
    groupMatches,
    standingsByGroup,
    qualifiedTeams,
    bracketMatches,
    loading,
    generating,
    error,
    isOwner,
    canGenerateKnockout,
    generateBracket,
    updateKnockoutScore,
    refresh,
  }
}
