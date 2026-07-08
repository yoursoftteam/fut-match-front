"use client"

import { useCallback, useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { type Tournament, type TournamentPayment, type TournamentScheduleDay, type TournamentTeam } from "@/lib/tournament-schema"

interface UseTournamentManageState {
  tournament: Tournament | null
  teams: TournamentTeam[]
  payments: TournamentPayment[]
  matchesCount: number
  unscheduledMatchesCount: number
  loading: boolean
  error: string | null
}

interface UseTournamentManageActions {
  refresh: () => Promise<void>
  updateStatus: (status: Tournament["status"]) => Promise<boolean>
  updateSchedule: (input: { scheduled_days: TournamentScheduleDay[] }) => Promise<boolean>
  updateMaxTeams: (max_teams: number) => Promise<boolean>
  updateDateField: (field: "starts_at" | "registration_deadline", value: string | null) => Promise<boolean>
}

export function useTournamentManage(tournamentId: string): UseTournamentManageState & UseTournamentManageActions {
  const { user } = useAuth()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<TournamentTeam[]>([])
  const [payments, setPayments] = useState<TournamentPayment[]>([])
  const [matchesCount, setMatchesCount] = useState(0)
  const [unscheduledMatchesCount, setUnscheduledMatchesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!tournamentId) return

    setLoading(true)
    setError(null)

    try {
      const [tournamentResult, teamsResult, paymentsResult, matchesResult] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", tournamentId).maybeSingle(),
        supabase
          .from("tournament_teams")
          .select("*")
          .eq("tournament_id", tournamentId)
          .order("created_at", { ascending: true }),
        supabase
          .from("tournament_payments")
          .select("*")
          .eq("tournament_id", tournamentId)
          .order("created_at", { ascending: false }),
        supabase.from("tournament_matches").select("id, starts_at").eq("tournament_id", tournamentId),
      ])

      if (tournamentResult.error) throw tournamentResult.error
      if (teamsResult.error) throw teamsResult.error
      if (paymentsResult.error) throw paymentsResult.error
      if (matchesResult.error) throw matchesResult.error

      setTournament((tournamentResult.data as Tournament | null) ?? null)
      setTeams((teamsResult.data ?? []) as TournamentTeam[])
      setPayments((paymentsResult.data ?? []) as TournamentPayment[])
      const matches = matchesResult.data ?? []
      setMatchesCount(matches.length)
      setUnscheduledMatchesCount(matches.filter((match) => !match.starts_at).length)
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cargar la gestión del torneo"
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  const updateStatus = useCallback(
    async (status: Tournament["status"]): Promise<boolean> => {
      if (!user) {
        setError("Debes iniciar sesión para actualizar el torneo")
        return false
      }

      try {
        const { data, error: updateError } = await supabase
          .from("tournaments")
          .update({ status })
          .eq("id", tournamentId)
          .select("*")
          .single()

        if (updateError) throw updateError

        setTournament(data as Tournament)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudo actualizar el estado"
        setError(message)
        return false
      }
    },
    [tournamentId, user]
  )

  const updateSchedule = useCallback(
    async (input: { scheduled_days: TournamentScheduleDay[] }): Promise<boolean> => {
      if (!user) {
        setError("Debes iniciar sesión para actualizar el cronograma")
        return false
      }

      try {
        const { data, error: updateError } = await supabase
          .from("tournaments")
          .update({
            scheduled_days: input.scheduled_days.length > 0 ? input.scheduled_days : null,
          })
          .eq("id", tournamentId)
          .select("*")
          .single()

        if (updateError) throw updateError

        setTournament(data as Tournament)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudo actualizar el cronograma"
        setError(message)
        return false
      }
    },
    [tournamentId, user]
  )

  const updateMaxTeams = useCallback(
    async (max_teams: number): Promise<boolean> => {
      if (!user) {
        setError("Debes iniciar sesión para editar el torneo")
        return false
      }

      try {
        const { data, error: updateError } = await supabase
          .from("tournaments")
          .update({ max_teams })
          .eq("id", tournamentId)
          .select("*")
          .single()

        if (updateError) throw updateError

        setTournament(data as Tournament)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudo actualizar la cantidad de equipos"
        setError(message)
        return false
      }
    },
    [tournamentId, user]
  )

  const updateDateField = useCallback(
    async (field: "starts_at" | "registration_deadline", value: string | null): Promise<boolean> => {
      if (!user) {
        setError("Debes iniciar sesión para editar el torneo")
        return false
      }

      try {
        const { data, error: updateError } = await supabase
          .from("tournaments")
          .update({ [field]: value })
          .eq("id", tournamentId)
          .select("*")
          .single()

        if (updateError) throw updateError

        setTournament(data as Tournament)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : `No se pudo actualizar la fecha`
        setError(message)
        return false
      }
    },
    [tournamentId, user]
  )

  useEffect(() => {
    void refresh()
  }, [refresh])

  return {
    tournament,
    teams,
    payments,
    matchesCount,
    unscheduledMatchesCount,
    loading,
    error,
    refresh,
    updateStatus,
    updateSchedule,
    updateMaxTeams,
    updateDateField,
  }
}
