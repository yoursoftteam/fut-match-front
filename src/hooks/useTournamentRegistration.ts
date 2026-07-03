"use client"

import { useCallback, useState } from "react"
import { supabase } from "@/lib/supabase"
import {
  buildSimulatedPaymentRef,
  registerTournamentTeamInputSchema,
  type RegisterTournamentTeamInput,
  type Tournament,
  type TournamentPayment,
  type TournamentTeam,
} from "@/lib/tournament-schema"

interface TournamentRegistrationResult {
  team: TournamentTeam | null
  payment: TournamentPayment | null
  error: string | null
}

interface TournamentRegistrationState {
  loading: boolean
  error: string | null
  checkoutStatus: "idle" | "processing" | "success" | "error"
}

interface TournamentRegistrationActions {
  registerTeamWithSimulatedPayment: (
    input: RegisterTournamentTeamInput,
    userEmail?: string
  ) => Promise<TournamentRegistrationResult>
  clearError: () => void
}

export function useTournamentRegistration(): TournamentRegistrationState & TournamentRegistrationActions {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "processing" | "success" | "error">("idle")

  const clearError = useCallback(() => {
    setError(null)
    setCheckoutStatus("idle")
  }, [])

  const registerTeamWithSimulatedPayment = useCallback(
    async (input: RegisterTournamentTeamInput, userEmail?: string): Promise<TournamentRegistrationResult> => {
      const parsed = registerTournamentTeamInputSchema.safeParse(input)
      if (!parsed.success) {
        const issue = parsed.error.issues[0]
        const message = issue?.message ?? "Datos inválidos para registrar el equipo"
        setError(message)
        return { team: null, payment: null, error: message }
      }

      setLoading(true)
      setError(null)
      setCheckoutStatus("processing")

      try {
        const { data: tournamentRaw, error: tournamentError } = await supabase
          .from("tournaments")
          .select("id, status, registration_fee, registration_deadline")
          .eq("id", parsed.data.tournament_id)
          .single()

        if (tournamentError) throw tournamentError

        const tournament = tournamentRaw as Pick<Tournament, "id" | "status" | "registration_fee" | "registration_deadline">
        if (tournament.status !== "open") {
          const message = "El torneo no está abierto para inscripción"
          setError(message)
          return { team: null, payment: null, error: message }
        }

        if (tournament.registration_deadline && new Date(tournament.registration_deadline) < new Date()) {
          const message = "La fecha de inscripción ya cerró para este torneo"
          setError(message)
          return { team: null, payment: null, error: message }
        }

        const { data: existingByName } = await supabase
          .from("tournament_teams")
          .select("id")
          .eq("tournament_id", parsed.data.tournament_id)
          .ilike("name", parsed.data.name)
          .maybeSingle()

        if (existingByName) {
          const message = "Ya existe un equipo con ese nombre en este torneo"
          setError(message)
          return { team: null, payment: null, error: message }
        }

        if (userEmail) {
          const { data: existingTeam } = await supabase
            .from("tournament_teams")
            .select("id")
            .eq("tournament_id", parsed.data.tournament_id)
            .eq("captain_email", userEmail)
            .maybeSingle()

          if (existingTeam) {
            const message = "Ya tienes un equipo inscrito en este torneo"
            setError(message)
            return { team: null, payment: null, error: message }
          }
        }

        const { data: teamRaw, error: teamError } = await supabase
          .from("tournament_teams")
          .insert({
            tournament_id: parsed.data.tournament_id,
            name: parsed.data.name,
            logo_url: parsed.data.logo_url?.trim() || null,
            captain_name: parsed.data.captain_name,
            captain_phone: parsed.data.captain_phone?.trim() || null,
            captain_email: parsed.data.captain_email?.trim() || null,
            kit_colors: parsed.data.kit_colors?.trim() || null,
            payment_status: "paid",
          })
          .select("*")
          .single()

        if (teamError) throw teamError

        const team = teamRaw as TournamentTeam

        const providerRef = buildSimulatedPaymentRef()
        await new Promise((resolve) => setTimeout(resolve, 900))

        const { error: paymentError } = await supabase
          .from("tournament_payments")
          .insert({
            tournament_id: parsed.data.tournament_id,
            team_id: team.id,
            amount: tournament.registration_fee,
            status: "paid",
            provider_ref: providerRef,
          })

        if (paymentError) {
          // Compensation delete keeps team/payment consistency when payment insert fails.
          await supabase.from("tournament_teams").delete().eq("id", team.id)
          throw paymentError
        }

        const payment: TournamentPayment = {
          id: "",
          tournament_id: parsed.data.tournament_id,
          team_id: team.id,
          amount: tournament.registration_fee,
          status: "paid",
          provider_ref: providerRef,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        setCheckoutStatus("success")

        return {
          team,
          payment,
          error: null,
        }
      } catch (err) {
        setCheckoutStatus("error")
        const message =
          err instanceof Error
            ? err.message
            : "No se pudo registrar el equipo con pago simulado"
        setError(message)
        return { team: null, payment: null, error: message }
      } finally {
        setLoading(false)
      }
    },
    []
  )

  return {
    loading,
    error,
    checkoutStatus,
    registerTeamWithSimulatedPayment,
    clearError,
  }
}
