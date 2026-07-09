"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AlertTriangle, ArrowLeft, Calendar, Check, CheckCircle2, Flag, Loader2, RefreshCcw, Save, Users } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { useTournamentManage } from "@/hooks/useTournamentManage"
import { TournamentAdminBento } from "@/components/tournaments/TournamentAdminBento"
import { TournamentDynamicLinksCard } from "@/components/tournaments/TournamentDynamicLinksCard"
import { TournamentSchedulePicker } from "@/components/tournaments/TournamentSchedulePicker"
import RichTextRenderer from "@/components/rich-editor/RichTextRenderer"
import type { TournamentScheduleDay, WeekDay } from "@/lib/tournament-schema"

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

const dayNames: Record<WeekDay, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
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

  const daysWithoutTimes = scheduledDays.filter((d) => d.times.length === 0)

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

      {daysWithoutTimes.length > 0 && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
          <p className="text-sm font-semibold text-red-400">Faltan horarios</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-red-300">
            {daysWithoutTimes.map((d) => (
              <li key={d.day_of_week}>{dayNames[d.day_of_week]}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={updatingSchedule}
        className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90 transition disabled:opacity-60"
      >
        {updatingSchedule ? <Loader2 className="size-4 animate-spin" /> : null}
        {updatingSchedule ? "Guardando..." : "Guardar cronograma"}
      </button>
    </section>
  )
}

function TournamentMaxTeamsInput({
  value,
  onSave,
  saving,
}: {
  value: number
  onSave: (value: number) => Promise<boolean>
  saving: boolean
}) {
  const [local, setLocal] = useState(value)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    setLocal(value)
    setSaved(false)
    setError(false)
  }, [value])

  const isDirty = local !== value

  const handleSave = async () => {
    if (local < 2) {
      setError(true)
      return
    }
    setError(false)
    setSaved(false)
    const ok = await onSave(local)
    if (ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleCancel = () => {
    setLocal(value)
    setError(false)
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        type="number"
        min={2}
        value={local}
        onChange={(e) => {
          setLocal(Number(e.target.value))
          setError(false)
        }}
        className={`w-20 rounded-lg border px-3 py-2 text-sm text-foreground bg-background ${
          error ? "border-red-500" : "border-border"
        }`}
      />
      {isDirty ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-2 text-xs font-bold text-white hover:opacity-90 transition disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Guardar
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving}
            className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition disabled:opacity-60"
          >
            Cancelar
          </button>
        </div>
      ) : saved ? (
        <span className="inline-flex items-center gap-1 text-xs text-green-500 shrink-0">
          <Check className="size-3.5" />
          Guardado
        </span>
      ) : null}
    </div>
  )
}

function InlineDateEditor({
  label,
  icon: Icon,
  value,
  onSave,
  saving,
  helperText,
  validationError,
  min,
  max,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  value: string | null
  onSave: (value: string | null) => Promise<boolean>
  saving: boolean
  helperText?: string
  validationError?: string | null
  min?: string
  max?: string
}) {
  const dateValue = value ? value.slice(0, 10) : ""

  const validate = (d: string): string | null => {
    if (min && d && d < min) return "La fecha no puede ser anterior a hoy"
    if (max && d && d > max) return "El cierre debe ser anterior a la fecha de inicio"
    return null
  }

  const [local, setLocal] = useState(dateValue)
  const [saved, setSaved] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    setLocal(value ? value.slice(0, 10) : "")
    setSaved(false)
    setLocalError(null)
  }, [value])

  const isDirty = local !== dateValue

  const handleSave = async () => {
    setSaved(false)
    setLocalError(null)
    const err = validate(local)
    if (err) {
      setLocalError(err)
      const inputId = `date-${label.toLowerCase().replace(/\s+/g, "-")}`
      const el = document.getElementById(inputId)
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" })
        el.focus({ preventScroll: true })
      }
      return
    }
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const now = new Date()
    const offset = -now.getTimezoneOffset()
    const sign = offset >= 0 ? "+" : "-"
    const pad = (n: number) => String(Math.abs(n)).padStart(2, "0")
    const tzSuffix = `${sign}${pad(Math.floor(offset / 60))}:${pad(offset % 60)}`
    const newValue = local ? `${local}T23:59:59${tzSuffix}` : null
    const ok = await onSave(newValue)
    if (ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  const handleClear = async () => {
    setLocal("")
    setSaved(false)
    const ok = await onSave(null)
    if (ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    }
  }

  return (
    <div className="space-y-1.5">
      <label htmlFor={`date-${label.toLowerCase().replace(/\s+/g, "-")}`} className="text-sm font-medium text-foreground flex items-center gap-1.5">
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={`date-${label.toLowerCase().replace(/\s+/g, "-")}`}
          type="date"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          className={`flex-1 rounded-lg border px-3 py-2 text-sm text-foreground bg-background ${
            validationError || localError ? "border-red-500" : "border-border"
          }`}
          min={min}
          max={max}
        />
        {isDirty ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="cursor-pointer inline-flex items-center gap-1 rounded-lg bg-primary px-2.5 py-2 text-xs font-bold text-white hover:opacity-90 transition disabled:opacity-60"
            >
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Guardar
            </button>
            <button
              type="button"
              onClick={() => {
                setLocal(dateValue)
                setSaved(false)
              }}
              disabled={saving}
              className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted transition disabled:opacity-60"
            >
              Cancelar
            </button>
          </div>
        ) : saved ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-500 shrink-0">
            <Check className="size-3.5" />
            Guardado
          </span>
        ) : local && !helperText?.includes("obligatorio") ? (
          <button
            type="button"
            onClick={() => void handleClear()}
            disabled={saving}
            className="cursor-pointer inline-flex items-center gap-1 rounded-lg border border-red-500/30 px-2.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition disabled:opacity-60 shrink-0"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
            Quitar fecha
          </button>
        ) : null}
      </div>
      {localError || validationError ? (
        <p className="text-xs text-red-400 leading-relaxed">{localError ?? validationError}</p>
      ) : helperText ? (
        <p className="text-xs text-muted-foreground leading-relaxed">{helperText}</p>
      ) : null}
    </div>
  )
}

export default function ManageTournamentClient({ tournamentId }: ManageTournamentClientProps) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [nowSlice, setNowSlice] = useState("")

  useEffect(() => {
    const d = new Date()
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    setNowSlice(d.toISOString().slice(0, 10))
  }, [])
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
    updateMaxTeams,
    updateDateField,
  } = useTournamentManage(tournamentId)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [updatingMaxTeams, setUpdatingMaxTeams] = useState(false)
  const [updatingDate, setUpdatingDate] = useState(false)
  const [dateValidationError, setDateValidationError] = useState<string | null>(null)

  useEffect(() => {
    if (tournament?.registration_deadline && tournament?.starts_at && new Date(tournament.registration_deadline) > new Date(tournament.starts_at)) {
      setDateValidationError("El cierre de inscripciones no puede ser después de la fecha de inicio")
    } else {
      setDateValidationError(null)
    }
  }, [tournament?.registration_deadline, tournament?.starts_at])

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/auth")
    }
  }, [authLoading, router, user])

  const onChangeStatus = async (value: "draft" | "open" | "in_progress" | "finished") => {
    if (value === "finished") {
      const confirmed = window.confirm(
        "¿Estás seguro de marcar el torneo como Finalizado?\n\nNo se podrán inscribir más equipos ni modificar resultados."
      )
      if (!confirmed) return
    }
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
      tournament.scheduled_days.every((day) => day.times.length > 0)
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
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              href="/dashboard"
              className="mb-2 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <ArrowLeft className="size-4" />
              Volver
            </Link>
            <h1 className="text-2xl font-heading font-bold text-foreground sm:text-3xl truncate">{tournament.name}</h1>
          </div>
          <button
            type="button"
            onClick={() => void refresh()}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <RefreshCcw className="size-4" />
            Refrescar
          </button>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <TournamentAdminBento tournament={tournament} teamsCount={teams.length} paidCount={paidCount} />

        <section id="status-config" className="card p-5 sm:p-6 space-y-6">
          <div>
            <h2 className="text-lg font-heading font-bold text-foreground">Ajustes del torneo</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Estado, capacidad y fechas clave.</p>
          </div>

          {/* Grupo: Estado y capacidad */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Estado y capacidad</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="status" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Flag className="size-4 text-muted-foreground" />
                  Estado del torneo
                </label>
                <div className="flex items-center gap-2">
                  <Select
                    value={tournament.status}
                    onValueChange={(v) => void onChangeStatus(v as "draft" | "open" | "in_progress" | "finished")}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger id="status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {updatingStatus ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" />
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {tournament.status === "draft" && "Solo tú puedes verlo. Pasa a Abierto para iniciar inscripciones."}
                  {tournament.status === "open" && "El torneo está visible y aceptando equipos."}
                  {tournament.status === "in_progress" && "El torneo está en juego. Ya no se aceptan más equipos."}
                  {tournament.status === "finished" && "Torneo finalizado. Resultados visibles."}
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="max-teams" className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Users className="size-4 text-muted-foreground" />
                  Cupo máximo de equipos
                </label>
                <TournamentMaxTeamsInput
                  value={tournament.max_teams}
                  onSave={async (val) => {
                    setUpdatingMaxTeams(true)
                    const ok = await updateMaxTeams(val)
                    setUpdatingMaxTeams(false)
                    return ok
                  }}
                  saving={updatingMaxTeams}
                />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {teams.length}/{tournament.max_teams} equipos inscritos.
                  {teams.length >= tournament.max_teams && " Cupo completo."}
                </p>
              </div>
            </div>
          </div>

          <hr className="border-border/50" />

          {/* Grupo: Fechas */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60">Fechas</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              <InlineDateEditor
                label="Inicio del torneo"
                icon={Calendar}
                value={tournament.starts_at}
                onSave={async (val) => {
                  setUpdatingDate(true)
                  const ok = await updateDateField("starts_at", val)
                  setUpdatingDate(false)
                  return ok
                }}
                saving={updatingDate}
                min={nowSlice || undefined}
                helperText={
                  tournament.starts_at && new Date(tournament.starts_at) < new Date()
                    ? "La fecha ya pasó."
                    : "Fecha en que comienza el torneo."
                }
              />

              <InlineDateEditor
                label="Cierre de inscripciones"
                icon={Calendar}
                value={tournament.registration_deadline}
                onSave={async (val) => {
                  setUpdatingDate(true)
                  const ok = await updateDateField("registration_deadline", val)
                  setUpdatingDate(false)
                  return ok
                }}
                saving={updatingDate}
                validationError={dateValidationError}
                min={nowSlice || undefined}
                max={tournament.starts_at ? tournament.starts_at.slice(0, 10) : undefined}
                helperText={
                  tournament.registration_deadline && new Date(tournament.registration_deadline) < new Date()
                    ? "La fecha ya pasó."
                    : "Fecha límite para inscribir equipos."
                }
              />
            </div>
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
          <div className="space-y-5 order-1 lg:order-1">
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

          <div className="order-2 lg:order-2">
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
                        <p className={`text-sm font-semibold ${step.done ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.done ? "Listo" : "Pendiente"} · {step.title}
                        </p>
                        {!step.done ? <p className="mt-1 text-xs text-muted-foreground">{step.hintWhenMissing}</p> : null}
                      </div>
                      {step.done ? (
                        <CheckCircle2 className="mt-0.5 size-4 text-primary" />
                      ) : (
                        <AlertTriangle className="mt-0.5 size-4 text-muted-foreground" />
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
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
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
