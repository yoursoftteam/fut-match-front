"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck, Wallet } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useTournamentRegistration } from "@/hooks/useTournamentRegistration"
import { type Tournament } from "@/lib/tournament-schema"

interface RegisterTournamentClientProps {
  tournamentId: string
}

interface RegisterFormState {
  name: string
  kit_colors: string
  captain_name: string
  captain_phone: string
  captain_email: string
}

const initialFormState: RegisterFormState = {
  name: "",
  kit_colors: "",
  captain_name: "",
  captain_phone: "",
  captain_email: "",
}

export default function RegisterTournamentClient({ tournamentId }: RegisterTournamentClientProps) {
  const searchParams = useSearchParams()
  const mode = searchParams.get("mode")

  const { registerTeamWithSimulatedPayment, loading: registering, error: registerError, checkoutStatus } =
    useTournamentRegistration()

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [registeredTeamsCount, setRegisteredTeamsCount] = useState(0)
  const [loadingTournament, setLoadingTournament] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [form, setForm] = useState<RegisterFormState>(initialFormState)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const fetchTournament = async () => {
    setLoadingTournament(true)
    setFetchError(null)

    try {
      const [tournamentResult, teamsResult] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", tournamentId).maybeSingle(),
        supabase.from("tournament_teams").select("id", { count: "exact", head: true }).eq("tournament_id", tournamentId),
      ])

      if (tournamentResult.error) throw tournamentResult.error
      if (teamsResult.error) throw teamsResult.error

      setTournament((tournamentResult.data as Tournament | null) ?? null)
      setRegisteredTeamsCount(teamsResult.count ?? 0)
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cargar el torneo"
      setFetchError(message)
    } finally {
      setLoadingTournament(false)
    }
  }

  useEffect(() => {
    void fetchTournament()
  }, [tournamentId])

  const remainingSlots = useMemo(() => {
    if (!tournament) return 0
    return Math.max(0, tournament.max_teams - registeredTeamsCount)
  }, [registeredTeamsCount, tournament])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage(null)

    const result = await registerTeamWithSimulatedPayment({
      tournament_id: tournamentId,
      name: form.name,
      kit_colors: form.kit_colors,
      captain_name: form.captain_name,
      captain_phone: form.captain_phone,
      captain_email: form.captain_email,
      logo_url: "",
    })

    if (result.error) return

    setSuccessMessage(`Pago confirmado. Ref: ${result.payment?.provider_ref ?? "SIM"}`)
    setForm(initialFormState)
    await fetchTournament()
  }

  if (loadingTournament) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="h-28 animate-pulse rounded-2xl bg-muted" />
          <div className="h-80 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    )
  }

  if (fetchError) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-md card p-6 text-center">
          <AlertCircle className="mx-auto size-8 text-red-400" />
          <p className="mt-3 text-sm text-red-300">{fetchError}</p>
          <button
            type="button"
            onClick={() => void fetchTournament()}
            className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-md card p-6 text-center">
          <p className="text-lg font-heading font-bold text-foreground">Torneo no disponible</p>
          <p className="mt-1 text-sm text-muted-foreground">Este link ya no está activo o no tienes acceso.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-md space-y-4 px-4 py-6">
        <header className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Inscripción pública</p>
          <h1 className="mt-1 text-2xl font-heading font-bold text-foreground">{tournament.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Solo quedan <span className="font-semibold text-primary">{remainingSlots}</span> de {tournament.max_teams} cupos.
          </p>

          {mode === "pay" && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
              <Wallet className="size-3.5" />
              Modo pago directo activado.
            </p>
          )}
        </header>

        <form onSubmit={onSubmit} className="card p-5 space-y-4" aria-label="Formulario de inscripción de equipo">
          <div>
            <label htmlFor="team_name" className="mb-1.5 block text-sm font-medium text-foreground">Nombre del equipo</label>
            <input
              id="team_name"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
              required
            />
          </div>

          <div>
            <label htmlFor="kit_colors" className="mb-1.5 block text-sm font-medium text-foreground">Colores del uniforme</label>
            <input
              id="kit_colors"
              value={form.kit_colors}
              onChange={(e) => setForm((prev) => ({ ...prev, kit_colors: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
              placeholder="Verde y negro"
            />
          </div>

          <div>
            <label htmlFor="captain_name" className="mb-1.5 block text-sm font-medium text-foreground">Capitán del equipo</label>
            <input
              id="captain_name"
              value={form.captain_name}
              onChange={(e) => setForm((prev) => ({ ...prev, captain_name: e.target.value }))}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="captain_phone" className="mb-1.5 block text-sm font-medium text-foreground">Teléfono</label>
              <input
                id="captain_phone"
                value={form.captain_phone}
                onChange={(e) => setForm((prev) => ({ ...prev, captain_phone: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                required
              />
            </div>

            <div>
              <label htmlFor="captain_email" className="mb-1.5 block text-sm font-medium text-foreground">Correo</label>
              <input
                id="captain_email"
                type="email"
                value={form.captain_email}
                onChange={(e) => setForm((prev) => ({ ...prev, captain_email: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                required
              />
            </div>
          </div>

          <section className="rounded-xl border border-border bg-background/70 p-4" aria-live="polite">
            <h2 className="text-sm font-semibold text-foreground">Order Summary</h2>
            <div className="mt-2 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Inscripción equipo</span>
              <span className="font-semibold text-foreground">${Number(tournament.registration_fee).toLocaleString("es-CO")}</span>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
              <span className="text-muted-foreground">Estado checkout</span>
              <span className="font-semibold text-foreground">
                {checkoutStatus === "processing" && "Processing"}
                {checkoutStatus === "success" && "Success"}
                {checkoutStatus === "error" && "Error"}
                {checkoutStatus === "idle" && "Pendiente"}
              </span>
            </div>
          </section>

          {checkoutStatus === "processing" && (
            <p className="inline-flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
              <Loader2 className="size-4 animate-spin" />
              Procesando pago simulado...
            </p>
          )}

          {successMessage && (
            <p className="inline-flex items-center gap-2 text-sm text-primary" aria-live="polite">
              <CheckCircle2 className="size-4" />
              {successMessage}
            </p>
          )}

          {(registerError || checkoutStatus === "error") && (
            <p className="inline-flex items-center gap-2 text-sm text-red-400" aria-live="polite">
              <AlertCircle className="size-4" />
              {registerError ?? "No fue posible completar el pago"}
            </p>
          )}

          <button
            type="submit"
            disabled={registering || remainingSlots <= 0 || tournament.status !== "open"}
            className="btn-primary-fm inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-60"
          >
            {registering ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            {registering ? "Procesando..." : "Inscribirme y pagar"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Powered by parti2.app · Menos chat, más juego.
          <Link href="/" className="ml-1 text-primary hover:text-primary/80">Ir al inicio</Link>
        </p>
      </main>
    </div>
  )
}
