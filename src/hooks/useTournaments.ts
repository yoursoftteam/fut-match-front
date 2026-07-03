"use client"

import { useCallback, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import {
  createTournamentInputSchema,
  normalizeOptionalText,
  tournamentStatusSchema,
  type CreateTournamentInput,
  type Tournament,
  type TournamentStatus,
} from "@/lib/tournament-schema"

interface UseTournamentsState {
  tournaments: Tournament[]
  loading: boolean
  error: string | null
}

interface UseTournamentsActions {
  listMyTournaments: () => Promise<Tournament[]>
  listOpenTournaments: () => Promise<Tournament[]>
  createTournament: (input: CreateTournamentInput) => Promise<Tournament | null>
  updateTournamentStatus: (tournamentId: string, status: TournamentStatus) => Promise<boolean>
  deleteTournament: (tournamentId: string) => Promise<boolean>
  getTournamentById: (tournamentId: string) => Promise<Tournament | null>
  clearError: () => void
}

export function useTournaments(): UseTournamentsState & UseTournamentsActions {
  const { user } = useAuth()
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  const listMyTournaments = useCallback(async (): Promise<Tournament[]> => {
    if (!user) {
      setTournaments([])
      return []
    }

    setLoading(true)
    setError(null)

    try {
      const { data, error: dbError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })

      if (dbError) throw dbError

      const rows = (data ?? []) as Tournament[]
      setTournaments(rows)
      return rows
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar los torneos"
      setError(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [user])

  const listOpenTournaments = useCallback(async (): Promise<Tournament[]> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: dbError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("status", "open")
        .order("starts_at", { ascending: true, nullsFirst: false })

      if (dbError) throw dbError

      return (data ?? []) as Tournament[]
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudieron cargar los torneos abiertos"
      setError(message)
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  const createTournament = useCallback(
    async (input: CreateTournamentInput): Promise<Tournament | null> => {
      if (!user) {
        setError("Debes iniciar sesión para crear torneos")
        return null
      }

      const parsed = createTournamentInputSchema.safeParse(input)
      if (!parsed.success) {
        const issue = parsed.error.issues[0]
        setError(issue?.message ?? "Datos inválidos para crear torneo")
        return null
      }

      setLoading(true)
      setError(null)

      try {
        const payload = {
          owner_id: user.id,
          name: parsed.data.name,
          logo_url: normalizeOptionalText(parsed.data.logo_url),
          description: normalizeOptionalText(parsed.data.description),
          registration_fee: parsed.data.registration_fee,
          tournament_type: parsed.data.tournament_type,
          status: parsed.data.status,
          max_teams: parsed.data.max_teams,
          min_players_per_team: parsed.data.min_players_per_team,
          starts_at: normalizeOptionalText(parsed.data.starts_at),
          registration_deadline: normalizeOptionalText(parsed.data.registration_deadline),
          rules_text: normalizeOptionalText(parsed.data.rules_text),
          rules_pdf_url: normalizeOptionalText(parsed.data.rules_pdf_url),
          league_mode:
            parsed.data.tournament_type === "league" ? parsed.data.league_mode ?? null : null,
          groups_count:
            parsed.data.tournament_type === "groups" ? parsed.data.groups_count ?? null : null,
          qualifiers_per_group:
            parsed.data.tournament_type === "groups"
              ? parsed.data.qualifiers_per_group ?? null
              : null,
          has_knockout:
            parsed.data.tournament_type === "groups" ? parsed.data.has_knockout ?? null : null,
          knockout_phase:
            parsed.data.tournament_type === "groups" && parsed.data.has_knockout
              ? parsed.data.knockout_phase ?? null
              : null,
          scheduled_days: parsed.data.scheduled_days && parsed.data.scheduled_days.length > 0 ? parsed.data.scheduled_days : null,
        }

        const { data, error: dbError } = await supabase
          .from("tournaments")
          .insert(payload)
          .select("*")
          .single()

        if (dbError) throw dbError

        const created = data as Tournament
        setTournaments((prev) => [created, ...prev])
        return created
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudo crear el torneo"
        setError(message)
        return null
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  const updateTournamentStatus = useCallback(
    async (tournamentId: string, status: TournamentStatus): Promise<boolean> => {
      const parsedStatus = tournamentStatusSchema.safeParse(status)
      if (!parsedStatus.success) {
        setError("Estado de torneo inválido")
        return false
      }

      setLoading(true)
      setError(null)

      try {
        const { data, error: dbError } = await supabase
          .from("tournaments")
          .update({ status: parsedStatus.data })
          .eq("id", tournamentId)
          .select("*")
          .single()

        if (dbError) throw dbError

        const updated = data as Tournament
        setTournaments((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudo actualizar el estado"
        setError(message)
        return false
      } finally {
        setLoading(false)
      }
    },
    []
  )

  const deleteTournament = useCallback(async (tournamentId: string): Promise<boolean> => {
    if (!user) {
      setError("Debes iniciar sesión para eliminar torneos")
      return false
    }

    setLoading(true)
    setError(null)

    try {
      const { error: dbError } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", tournamentId)
        .eq("owner_id", user.id)

      if (dbError) throw dbError

      setTournaments((prev) => prev.filter((item) => item.id !== tournamentId))
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar el torneo"
      setError(message)
      return false
    } finally {
      setLoading(false)
    }
  }, [user])

  const getTournamentById = useCallback(async (tournamentId: string): Promise<Tournament | null> => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: dbError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", tournamentId)
        .maybeSingle()

      if (dbError) throw dbError

      return (data as Tournament | null) ?? null
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cargar el torneo"
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return {
    tournaments,
    loading,
    error,
    listMyTournaments,
    listOpenTournaments,
    createTournament,
    updateTournamentStatus,
    deleteTournament,
    getTournamentById,
    clearError,
  }
}
