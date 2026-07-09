"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams, useRouter } from "next/navigation"
import { AlertCircle, CheckCircle2, ChevronLeft, Clock, Loader2, ShieldCheck, Users, Wallet } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/hooks/useAuth"
import { useTournamentRegistration } from "@/hooks/useTournamentRegistration"
import { type Tournament, type TournamentTeam } from "@/lib/tournament-schema"
import RichTextRenderer from "@/components/rich-editor/RichTextRenderer"
import { ShareActions } from "@/components/ShareLink"

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
  const { user, loading: authLoading } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const mode = searchParams.get("mode")

  const { registerTeamWithSimulatedPayment, loading: registering, error: registerError, checkoutStatus } =
    useTournamentRegistration()

  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [registeredTeams, setRegisteredTeams] = useState<{ name: string; captain_name: string }[]>([])
  const [loadingTournament, setLoadingTournament] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [form, setForm] = useState<RegisterFormState>(initialFormState)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [alreadyRegistered, setAlreadyRegistered] = useState(false)
  const [userTeam, setUserTeam] = useState<TournamentTeam | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const fetchTournament = async () => {
    setLoadingTournament(true)
    setFetchError(null)

    try {
      const [tournamentResult, teamsResult] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", tournamentId).maybeSingle(),
        supabase.from("tournament_teams").select("name, captain_name").eq("tournament_id", tournamentId),
      ])

      if (tournamentResult.error) throw tournamentResult.error
      if (teamsResult.error) throw teamsResult.error

      setTournament((tournamentResult.data as Tournament | null) ?? null)
      const teams = (teamsResult.data as { name: string; captain_name: string }[] | null) ?? []
      setRegisteredTeams(teams)

      if (user?.email) {
        const { data: existingTeam } = await supabase
          .from("tournament_teams")
          .select("*")
          .eq("tournament_id", tournamentId)
          .eq("captain_email", user.email)
          .maybeSingle()
        setAlreadyRegistered(!!existingTeam)
        setUserTeam((existingTeam as TournamentTeam | null) ?? null)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "No se pudo cargar el torneo"
      setFetchError(message)
    } finally {
      setLoadingTournament(false)
    }
  }

  useEffect(() => {
    void fetchTournament()
  }, [tournamentId, user?.email])

  useEffect(() => {
    if (user?.email) {
      const meta = user.user_metadata as Record<string, unknown> | undefined
      setForm((prev) => ({
        ...prev,
        captain_email: user.email!,
        captain_phone: (typeof meta?.phone === "string" ? meta.phone : "") || prev.captain_phone,
      }))
    }
  }, [user?.email, user?.user_metadata])

  const isDeadlinePassed = useMemo(() => {
    if (!tournament?.registration_deadline) return false
    return new Date(tournament.registration_deadline) < new Date()
  }, [tournament?.registration_deadline])

  const remainingSlots = useMemo(() => {
    if (!tournament) return 0
    return Math.max(0, tournament.max_teams - registeredTeams.length)
  }, [registeredTeams, tournament])

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
    }, user?.email, user?.id)

    if (result.error) return

    setSuccessMessage(`Pago confirmado. Ref: ${result.payment?.provider_ref ?? "SIM"}`)
    setForm(initialFormState)
    await fetchTournament()
  }

  if (loadingTournament) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="mx-auto w-full max-w-md space-y-4">
          <div className="h-3 w-20 animate-pulse rounded-full bg-muted" />
          <div className="card p-5 space-y-4">
            <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
            <div className="h-7 w-3/4 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-40 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-full animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="card p-5 space-y-4">
            <div className="h-5 w-32 animate-pulse rounded-lg bg-muted" />
            <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-11 w-full animate-pulse rounded-lg bg-muted" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-11 animate-pulse rounded-lg bg-muted" />
              <div className="h-11 animate-pulse rounded-lg bg-muted" />
            </div>
            <div className="h-20 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
          </div>
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
            className="mt-4 cursor-pointer rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-muted"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-md space-y-4">
          <Link
            href={`/tournaments/${tournamentId}`}
            className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            <ChevronLeft className="size-4" />
            Volver al torneo
          </Link>
          <div className="card p-6 text-center">
          <p className="text-lg font-heading font-bold text-foreground">Inicia sesión para inscribirte</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Necesitas una cuenta para poder registrar un equipo en este torneo.
          </p>
          <Link
            href={`/auth?mode=signin&redirectTo=${encodeURIComponent(`/tournaments/${tournamentId}/register`)}`}
            className="btn-primary-fm mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold"
          >
            Iniciar sesión
          </Link>
          <p className="mt-3 text-xs text-muted-foreground">
            ¿No tienes cuenta?{" "}
            <Link href={`/auth?mode=signup&redirectTo=${encodeURIComponent(`/tournaments/${tournamentId}/register`)}`} className="text-primary hover:text-primary/80">
              Regístrate
            </Link>
          </p>
        </div>
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
      <main className="mx-auto w-full max-w-4xl px-4 py-6">
        <Link
          href={`/tournaments/${tournamentId}`}
          className="mb-4 inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Volver al torneo
        </Link>

        <div className="md:flex md:gap-6 md:items-start">
          {/* Left column: form */}
          <div className="md:flex-1 space-y-4">

            <header className="card p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Inscripción pública</p>
              <h1 className="mt-1 text-2xl font-heading font-bold text-foreground">{tournament.name}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {isDeadlinePassed
                  ? "La fecha de inscripción ya venció."
                  : <>Solo quedan <span className="font-semibold text-primary">{remainingSlots}</span> de {tournament.max_teams} cupos.</>
                }
              </p>

              {tournament.registration_deadline && (
                <p className={`mt-2 text-xs ${isDeadlinePassed ? "text-red-400" : "text-muted-foreground"}`}>
                  {isDeadlinePassed ? (
                    <>Las inscripciones cerraron el{" "}</>
                  ) : (
                    <>Las inscripciones cierran el{" "}</>
                  )}
                  <span className="font-semibold text-foreground">
                    {new Date(tournament.registration_deadline).toLocaleString("es-CO", {
                      dateStyle: "long",
                      timeStyle: "short",
                    })}
                  </span>
                </p>
              )}

              {tournament.rules_text && (
                <div className="mt-4 rounded-lg border border-border bg-background/60 p-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Reglas</p>
                  <div className="text-sm text-muted-foreground leading-relaxed">
                    <RichTextRenderer html={tournament.rules_text} />
                  </div>
                </div>
              )}

              {alreadyRegistered && userTeam && (
                <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">Tu equipo</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Nombre</span>
                      <span className="font-semibold text-foreground">{userTeam.name}</span>
                    </div>
                    {userTeam.kit_colors && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Colores</span>
                        <span className="text-foreground">{userTeam.kit_colors}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Capitán</span>
                      <span className="text-foreground">{userTeam.captain_name}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Estado</span>
                      <span className="inline-flex items-center gap-1 text-primary">
                        <CheckCircle2 className="size-3.5" />
                        Inscrito
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {mode === "pay" && (
                <p className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary">
                  <Wallet className="size-3.5" />
                  Modo pago directo activado.
                </p>
              )}
            </header>

            {alreadyRegistered && userTeam ? (
              <div className="card p-5 space-y-3">
                <h2 className="text-sm font-semibold text-foreground">Inscripción confirmada</h2>
                <p className="text-sm text-muted-foreground">
                  Ya estás inscrito en este torneo con el equipo                   <span className="font-semibold text-foreground">{userTeam.name}</span>.
                </p>
                <button
                  onClick={() => { router.refresh(); router.push(`/tournaments/${tournamentId}`) }}
                  className="btn-primary-fm inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
                >
                  Ver detalles del torneo
                </button>
                {mounted && (
                  <div className="pt-3 border-t border-border space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Invitar jugadores</p>
                    <ShareActions
                      copyText={`${window.location.origin}/tournaments/${tournamentId}/teams/${userTeam.id}/join`}
                      copiedStatusText="Link copiado al portapapeles"
                      whatsappText={`¡Únete al equipo ${userTeam.name} en este torneo de fútbol! ${window.location.origin}/tournaments/${tournamentId}/teams/${userTeam.id}/join`}
                      emailSubject={`Invitación al equipo ${userTeam.name}`}
                      emailBody={`Has sido invitado al equipo ${userTeam.name}. Únete aquí: ${window.location.origin}/tournaments/${tournamentId}/teams/${userTeam.id}/join`}
                      nativeShare={{ title: `Equipo ${userTeam.name}`, text: `Únete al equipo ${userTeam.name} en este torneo de fútbol`, url: `${window.location.origin}/tournaments/${tournamentId}/teams/${userTeam.id}/join` }}
                      copyTooltip="Copiar enlace"
                    />
                  </div>
                )}
              </div>
            ) : tournament.status !== "open" ? (
              <div className="card p-5 text-center space-y-3">
                <Clock className="mx-auto size-8 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Inscripciones cerradas</h2>
                <p className="text-sm text-muted-foreground">
                  {tournament.status === "in_progress" && "El torneo ya está en juego. Ya no se aceptan más equipos."}
                  {tournament.status === "finished" && "El torneo ha finalizado. Las inscripciones están cerradas."}
                  {tournament.status === "draft" && "El torneo aún no está abierto para inscripciones."}
                </p>
                <Link
                  href={`/tournaments/${tournamentId}`}
                  className="btn-primary-fm inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
                >
                  Ver detalles del torneo
                </Link>
              </div>
            ) : isDeadlinePassed ? (
              <div className="card p-5 text-center space-y-3">
                <Clock className="mx-auto size-8 text-muted-foreground" />
                <h2 className="text-sm font-semibold text-foreground">Fecha límite vencida</h2>
                <p className="text-sm text-muted-foreground">
                  La fecha de cierre de inscripciones de este torneo ya pasó.
                  {tournament.registration_deadline && (
                    <> El plazo venció el{" "}
                      <span className="font-semibold text-foreground">
                        {new Date(tournament.registration_deadline).toLocaleDateString("es-CO", {
                          dateStyle: "long",
                        })}
                      </span>.
                    </>
                  )}
                </p>
                <Link
                  href={`/tournaments/${tournamentId}`}
                  className="btn-primary-fm inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
                >
                  Ver detalles del torneo
                </Link>
              </div>
            ) : (
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
                    className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground disabled:cursor-not-allowed disabled:opacity-60"
                    required
                    readOnly={!!user}
                  />
                </div>
              </div>

              <section className="rounded-xl border border-border bg-background/70 p-4" aria-live="polite">
                <h2 className="text-sm font-semibold text-foreground">Resumen de inscripción</h2>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Inscripción equipo</span>
                  <span className="font-semibold text-foreground">${Number(tournament.registration_fee).toLocaleString("es-CO")}</span>
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm">
                  <span className="text-muted-foreground">Estado del pago</span>
                  <span className="font-semibold text-foreground">
                    {checkoutStatus === "processing" && "Procesando"}
                    {checkoutStatus === "success" && "Pagado"}
                    {checkoutStatus === "error" && "Error"}
                    {checkoutStatus === "idle" && "Pendiente"}
                  </span>
                </div>
              </section>

              {checkoutStatus === "processing" && !registerError && !successMessage && (
                <p className="inline-flex items-center gap-2 text-sm text-muted-foreground" aria-live="polite">
                  <Loader2 className="size-4 animate-spin" />
                  Procesando pago simulado...
                </p>
              )}

              {successMessage && (
                <div className="rounded-xl border border-green-500/30 bg-green-900/20 px-4 py-3 text-sm font-semibold text-green-300" aria-live="polite">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 shrink-0" />
                    <span>{successMessage}</span>
                  </div>
                </div>
              )}

              {(registerError || checkoutStatus === "error") && (
                <div className="rounded-xl border-2 border-red-500/50 bg-red-900/25 px-4 py-3 text-sm font-semibold text-red-200 shadow-lg shadow-red-900/20" aria-live="assertive">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="size-5 shrink-0 text-red-300" />
                    <span>{registerError ?? "No fue posible completar el pago"}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={registering || remainingSlots <= 0 || tournament.status !== "open" || alreadyRegistered || isDeadlinePassed}
                className="btn-primary-fm inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold disabled:opacity-60"
              >
                {registering ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                {registering ? "Procesando..." : "Inscribirme y pagar"}
              </button>
              </form>
            )}
          </div>

          {/* Right column: sidebar */}
          <div className="mt-4 md:mt-0 md:w-[300px] md:shrink-0">
            <section className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Users className="size-4 text-muted-foreground" />
                <h2 className="text-sm font-heading font-bold text-foreground">Equipos inscritos</h2>
                <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                {registeredTeams.length}
                </span>
              </div>
              {registeredTeams.length === 0 ? (
                <p className="text-xs text-muted-foreground">Aún no hay equipos inscritos.</p>
              ) : (
                <ul className="space-y-1.5">
                  {registeredTeams.map((team, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-border bg-background/60 px-3 py-2 text-sm text-foreground"
                    >
                      {team.name}
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 text-[11px] text-muted-foreground leading-relaxed">
                Revisa que el nombre de tu equipo no esté repetido antes de inscribirte.
              </p>
            </section>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Powered by parti2.app · Menos chat, más juego.
          <Link href="/" className="ml-1 text-primary hover:text-primary/80">Ir al inicio</Link>
        </p>
      </main>
    </div>
  )
}
