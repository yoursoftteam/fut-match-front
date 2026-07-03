"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, RefreshCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { useTournamentManage } from "@/hooks/useTournamentManage"
import { TournamentAdminBento } from "@/components/tournaments/TournamentAdminBento"
import { TournamentDynamicLinksCard } from "@/components/tournaments/TournamentDynamicLinksCard"
import { TournamentSchedulePicker } from "@/components/tournaments/TournamentSchedulePicker"
import RichTextRenderer from "@/components/rich-editor/RichTextRenderer"
import type { TournamentScheduleDay } from "@/lib/tournament-schema"

interface ManageTournamentClientProps {
  tournamentId: string
}

const statusOptions = [
  { value: "draft", label: "Borrador" },
  { value: "open", label: "Abierto" },
  { value: "in_progress", label: "En juego" },
  { value: "finished", label: "Finalizado" },
] as const

interface SetupStep {
  id: string
  title: string
  done: boolean
  hintWhenMissing: string
  actionHref?: string
  actionLabel?: string
}

function ScheduleEditor({
  tournamentId,
  initialValue,
  onSave,
}: {
  tournamentId: string
  initialValue: TournamentScheduleDay[]
  onSave: (input: { scheduled_days: TournamentScheduleDay[] }) => Promise<void>
}) {
  const [scheduledDays, setScheduledDays] = useState<TournamentScheduleDay[]>(initialValue)
  const [updatingSchedule, setUpdatingSchedule] = useState(false)

  const handleSave = async () => {
    setUpdatingSchedule(true)
    await onSave({ scheduled_days: scheduledDays })
    setUpdatingSchedule(false)
  }

  return (
    <section key={tournamentId} className="card space-y-4 p-5 sm:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cronograma</p>
        <h2 className="mt-1 text-lg font-heading font-bold text-foreground">Días y horarios</h2>
        <p className="mt-1 text-sm text-muted-foreground">Si no lo defines ahora, puedes dejarlo vacío y volver después a esta misma gestión.</p>
      </div>

      <TournamentSchedulePicker value={scheduledDays} onChange={setScheduledDays} />

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={updatingSchedule}
        className="btn-primary-fm inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold disabled:opacity-60"
      >
        {updatingSchedule ? <Loader2 className="size-4 animate-spin" /> : null}
        {updatingSchedule ? "Guardando..." : "Guardar cronograma"}
      </button>
    </section>
  )
}

export default function ManageTournamentClient({ tournamentId }: ManageTournamentClientProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const {
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
  } = useTournamentManage(tournamentId)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth")
    }
  }, [authLoading, router, user])

  const onChangeStatus = async (value: "draft" | "open" | "in_progress" | "finished") => {
    setUpdatingStatus(true)
    await updateStatus(value)
    setUpdatingStatus(false)
  }

  const navigateToStep = (href?: string) => {
    if (!href) return

    if (href.startsWith("#")) {
      const node = document.querySelector(href)
      if (node instanceof HTMLElement) {
        node.scrollIntoView({ behavior: "smooth", block: "start" })
      }
      return
    }

    void router.push(href)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
            <div className="h-24 animate-pulse rounded-xl bg-muted" />
          </div>
          <div className="h-60 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    )
  }

  if (!user) return null

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-2xl card p-6 text-center">
          <p className="text-lg font-heading font-bold text-foreground">Torneo no encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">Puede que no tengas acceso o que el link ya no sea válido.</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
            Volver al dashboard
          </Link>
        </div>
      </div>
    )
  }

  const hasSchedule = Boolean(
    tournament.scheduled_days &&
      tournament.scheduled_days.length > 0 &&
      tournament.scheduled_days.some((day) => day.times.length > 0)
  )

  const setupSteps: SetupStep[] = [
    {
      id: "publish",
      title: "Publicar torneo",
      done: tournament.status !== "draft",
      hintWhenMissing: "Pasa el estado de borrador a abierto para permitir inscripción.",
      actionHref: "#status-config",
      actionLabel: "Ir a estado",
    },
    {
      id: "schedule",
      title: "Definir cronograma",
      done: hasSchedule,
      hintWhenMissing: "Configura días y horarios en este panel para poder asignarlos al fixture.",
      actionHref: "#schedule-config",
      actionLabel: "Ir a cronograma",
    },
    {
      id: "teams",
      title: "Inscribir mínimo 2 equipos",
      done: teams.length >= 2,
      hintWhenMissing: "Comparte el link público y espera al menos dos equipos.",
      actionHref: "#share-links-section",
      actionLabel: "Ir a compartir",
    },
    {
      id: "fixture",
      title: "Generar fixture",
      done: matchesCount > 0,
      hintWhenMissing: "Genera el fixture en la pantalla de jornadas.",
      actionHref: `/tournaments/${tournament.id}/fixture`,
      actionLabel: "Ir a fixture",
    },
    {
      id: "times",
      title: "Asignar horarios",
      done: matchesCount === 0 || unscheduledMatchesCount === 0,
      hintWhenMissing: "En Fixture usa el botón Asignar horarios para completar las jornadas sin hora.",
      actionHref: `/tournaments/${tournament.id}/fixture`,
      actionLabel: "Asignar horarios",
    },
  ]

  const completedSteps = setupSteps.filter((step) => step.done).length
  const pendingSteps = setupSteps.filter((step) => !step.done)
  const paidCount = payments.filter((p) => p.status === "paid").length

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:py-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href="/dashboard"
              className="mb-2 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <ArrowLeft className="size-4" />
              Volver
            </Link>
            <h1 className="text-2xl font-heading font-bold text-foreground sm:text-3xl">{tournament.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Panel admin para mover el torneo sin fricción.</p>
            {tournament.registration_deadline && (
              <p className="mt-2 text-xs text-muted-foreground">
                Cierre de inscripciones:{" "}
                <span className="font-semibold text-foreground">
                  {new Date(tournament.registration_deadline).toLocaleString("es-CO", {
                    dateStyle: "long",
                    timeStyle: "short",
                  })}
                </span>
                {new Date(tournament.registration_deadline) < new Date() && (
                  <span className="ml-1 text-red-400">(cerrada)</span>
                )}
              </p>
            )}
            <Link
              href={`/tournaments/${tournament.id}/fixture`}
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-primary/15"
            >
              Ver fixture y tabla de posiciones
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <label id="status-config" htmlFor="status" className="text-sm font-medium text-foreground">Estado</label>
            <select
              id="status"
              value={tournament.status}
              onChange={(e) => void onChangeStatus(e.target.value as "draft" | "open" | "in_progress" | "finished")}
              disabled={updatingStatus}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <RefreshCcw className="size-4" />
              Refrescar
            </button>
          </div>
        </header>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <TournamentAdminBento tournament={tournament} teamsCount={teams.length} paidCount={paidCount} />

        <section className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <div className="space-y-5 order-2 lg:order-1">
            <div id="share-links-section">
              <TournamentDynamicLinksCard tournamentId={tournamentId} />
            </div>

            {tournament && (
              <div id="schedule-config">
                <ScheduleEditor
                  key={`${tournament.id}-${JSON.stringify(tournament.scheduled_days ?? [])}`}
                  tournamentId={tournament.id}
                  initialValue={tournament.scheduled_days ?? []}
                  onSave={async (input) => {
                    await updateSchedule(input)
                  }}
                />
              </div>
            )}

            {tournament.rules_text && (
              <section className="card p-5 sm:p-6">
                <h2 className="text-lg font-heading font-bold text-foreground">Reglas del torneo</h2>
                <div className="mt-3 text-sm text-muted-foreground leading-relaxed">
                  <RichTextRenderer html={tournament.rules_text} />
                </div>
              </section>
            )}

            <section className="card p-5 sm:p-6">
              <h2 className="text-lg font-heading font-bold text-foreground">Equipos inscritos</h2>
              {teams.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">Aún no hay equipos. Comparte el link y activa la convocatoria.</p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {teams.map((team) => (
                    <li key={team.id} className="rounded-md border border-border bg-background/70 px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold leading-tight text-foreground">{team.name}</p>
                          <p className="text-[11px] text-muted-foreground">Capitán: {team.captain_name}</p>
                        </div>
                        <span
                          className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                            team.payment_status === "paid"
                              ? "bg-primary/15 text-primary"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {team.payment_status === "paid" ? "Pago confirmado" : "Pago pendiente"}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card p-5 sm:p-6">
              <h2 className="text-lg font-heading font-bold text-foreground">Pagos</h2>
              {payments.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">No hay pagos registrados todavía.</p>
              ) : (
                <ul className="mt-4 space-y-2">
                  {payments.map((payment) => (
                    <li key={payment.id} className="rounded-lg border border-border bg-background/70 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="font-semibold text-foreground">${Number(payment.amount).toLocaleString("es-CO")}</span>
                        <span className="text-xs text-muted-foreground">{payment.status}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Ref: {payment.provider_ref ?? "N/A"}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="order-1 lg:order-2">
            <section className="card space-y-4 p-5 sm:p-6 lg:sticky lg:top-24">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Checklist de configuración</p>
                  <h2 className="mt-1 text-lg font-heading font-bold text-foreground">Progreso del torneo</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Siempre visible para que no tengas que hacer scroll largo.</p>
                </div>
                <div className="rounded-xl border border-border bg-background/70 px-3 py-2 text-sm font-semibold text-foreground">
                  {completedSteps} / {setupSteps.length} completados
                </div>
              </div>

              <div className="grid gap-2">
                {setupSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`rounded-lg border border-border bg-background/70 px-3 py-2.5 ${
                      !step.done && step.actionHref ? "cursor-pointer transition hover:border-primary/40 hover:bg-muted/40" : ""
                    }`}
                    onClick={() => {
                      if (!step.done && step.actionHref) navigateToStep(step.actionHref)
                    }}
                    onKeyDown={(event) => {
                      if (step.done || !step.actionHref) return
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault()
                        navigateToStep(step.actionHref)
                      }
                    }}
                    tabIndex={!step.done && step.actionHref ? 0 : -1}
                    role={!step.done && step.actionHref ? "button" : undefined}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={`text-sm font-semibold ${step.done ? "text-foreground" : "text-amber-300"}`}>
                          {step.done ? "Listo" : "Pendiente"} · {step.title}
                        </p>
                        {!step.done ? <p className="mt-1 text-xs text-muted-foreground">{step.hintWhenMissing}</p> : null}
                      </div>
                      {step.done ? (
                        <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                      ) : (
                        <AlertTriangle className="mt-0.5 size-4 text-amber-300" />
                      )}
                    </div>
                    {!step.done && step.actionHref && step.actionLabel ? (
                      <Link
                        href={step.actionHref}
                        className="mt-2 inline-flex rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                      >
                        {step.actionLabel}
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>

              {pendingSteps.length > 0 ? (
                <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
                  Faltan {pendingSteps.length} paso(s): {pendingSteps.map((step) => step.title).join(", ")}.
                </div>
              ) : (
                <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm text-primary">
                  Todo listo. El torneo está configurado correctamente.
                </div>
              )}
            </section>
          </div>
        </section>

        {updatingStatus && (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Actualizando estado del torneo...
          </p>
        )}
      </main>
    </div>
  )
}
