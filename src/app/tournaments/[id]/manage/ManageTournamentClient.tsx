"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Flag,
  Globe,
  Link2,
  Loader2,
  RefreshCcw,
  Save,
  Trophy,
  Users,
  Wallet,
  XCircle,
} from "lucide-react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/useAuth"
import { useTournamentManage } from "@/hooks/useTournamentManage"
import { TournamentSchedulePicker } from "@/components/tournaments/TournamentSchedulePicker"
import RichTextRenderer from "@/components/rich-editor/RichTextRenderer"
import { cn } from "@/lib/utils"
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
  subtitle: string
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

/* ────── Subcomponents ────── */

function StatusPill({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; dot: string }> = {
    draft: { label: "Borrador", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" },
    open: { label: "Abierto", color: "bg-primary/15 text-primary border-primary/20", dot: "bg-primary" },
    in_progress: { label: "En juego", color: "bg-amber-500/15 text-amber-400 border-amber-500/20", dot: "bg-amber-400" },
    finished: { label: "Finalizado", color: "bg-blue-500/15 text-blue-400 border-blue-500/20", dot: "bg-blue-400" },
  }
  const c = config[status] ?? config.draft
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide", c.color)}>
      <span className={cn("size-1.5 rounded-full", c.dot)} />
      {c.label}
    </span>
  )
}

function MetricCard({
  icon: Icon,
  label,
  sub,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>
  label: string
  sub: string
  value: number
  accent?: boolean
}) {
  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5",
      accent && "border-primary/30",
    )}>
      {accent && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent" />
      )}
      <CardContent className="flex items-start gap-4 p-5">
        <div className={cn(
          "flex size-11 shrink-0 items-center justify-center rounded-xl",
          accent ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
        )}>
          <Icon className="size-5" strokeWidth={accent ? 2.5 : 2} />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            {label}
            <span className="ml-1 font-normal lowercase text-muted-foreground/50">{sub}</span>
          </p>
          <p className={cn(
            "mt-0.5 text-[28px] font-heading font-bold leading-none tracking-tight",
            accent ? "text-primary" : "text-foreground",
          )}>
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

function ScheduleEditor({
  initialValue,
  onSave,
}: {
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
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Calendar className="size-5" />
          </div>
          <div>
            <h3 className="text-base font-heading font-bold text-foreground">Cronograma</h3>
            <p className="mt-0.5 text-sm text-muted-foreground">Configura los días y horarios del torneo.</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <TournamentSchedulePicker value={scheduledDays} onChange={setScheduledDays} />
        {daysWithoutTimes.length > 0 && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/8 px-4 py-3 text-sm text-red-400">
            <span className="font-semibold">Faltan horarios:</span>{" "}
            {daysWithoutTimes.map((d) => dayNames[d.day_of_week]).join(", ")}
          </div>
        )}
        <Button onClick={() => void handleSave()} disabled={updatingSchedule}>
          {updatingSchedule ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          {updatingSchedule ? "Guardando..." : "Guardar cronograma"}
        </Button>
      </CardContent>
    </Card>
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

  useEffect(() => { setLocal(value); setSaved(false); setError(false) }, [value])

  const isDirty = local !== value
  const handleSave = async () => {
    if (local < 2) { setError(true); return }
    setError(false); setSaved(false)
    const ok = await onSave(local)
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        min={2}
        value={local}
        onChange={(e) => { setLocal(Number(e.target.value)); setError(false) }}
        className={cn(
          "w-20 rounded-lg border bg-background px-3 py-2 text-sm text-foreground transition",
          error ? "border-red-500" : "border-border focus:border-primary/50",
        )}
      />
      {isDirty ? (
        <div className="flex items-center gap-1.5">
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
            Guardar
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setLocal(value); setError(false) }} disabled={saving}>
            Cancelar
          </Button>
        </div>
      ) : saved ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-primary">
          <Check className="size-3.5" /> Guardado
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
  const validate = (d: string) => {
    if (min && d && d < min) return "La fecha no puede ser anterior a hoy"
    if (max && d && d > max) return "El cierre debe ser anterior a la fecha de inicio"
    return null
  }

  const [local, setLocal] = useState(dateValue)
  const [saved, setSaved] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => { setLocal(dateValue); setSaved(false); setLocalError(null) }, [dateValue])
  const isDirty = local !== dateValue

  const handleSave = async () => {
    setSaved(false); setLocalError(null)
    const err = validate(local)
    if (err) { setLocalError(err); return }
    const now = new Date()
    const offset = -now.getTimezoneOffset()
    const sign = offset >= 0 ? "+" : "-"
    const pad = (n: number) => String(Math.abs(n)).padStart(2, "0")
    const tzSuffix = `${sign}${pad(Math.floor(offset / 60))}:${pad(offset % 60)}`
    const ok = await onSave(local ? `${local}T23:59:59${tzSuffix}` : null)
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
  }

  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
        <Icon className="size-4 text-muted-foreground" />
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
          className={cn(
            "flex-1 rounded-lg border bg-background px-3 py-2 text-sm text-foreground transition",
            validationError || localError ? "border-red-500" : "border-border focus:border-primary/50",
          )}
          min={min} max={max}
        />
        {isDirty ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
              Guardar
            </Button>
            <Button variant="outline" size="sm" onClick={() => { setLocal(dateValue); setSaved(false) }} disabled={saving}>
              Cancelar
            </Button>
          </div>
        ) : saved ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-primary shrink-0">
            <Check className="size-3.5" /> Guardado
          </span>
        ) : local && !helperText?.includes("obligatorio") ? (
          <Button variant="outline" size="sm" onClick={() => void handleClear()} disabled={saving}
            className="border-red-500/30 text-red-400 hover:bg-red-500/10">
            Quitar fecha
          </Button>
        ) : null}
      </div>
      {(localError ?? validationError) ? (
        <p className="text-xs text-red-400">{localError ?? validationError}</p>
      ) : helperText ? (
        <p className="text-xs text-muted-foreground">{helperText}</p>
      ) : null}
    </div>
  )

  function handleClear(this: void) {
    setLocal("")
    setSaved(false)
    onSave(null).then((ok) => { if (ok) { setSaved(true); setTimeout(() => setSaved(false), 2000) } })
  }
}

function ConfirmDialog({
  open, onClose, onConfirm, title, description,
  confirmLabel = "Confirmar", loading = false,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void
  title: string; description: string; confirmLabel?: string; loading?: boolean
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(n) => { if (!n) onClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm" />
        <DialogPrimitive.Popup className="fixed top-1/2 left-1/2 z-50 w-[90vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-popover p-6 text-sm text-popover-foreground shadow-lg transition-all duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 data-ending-style:scale-95 data-starting-style:scale-95">
          <DialogPrimitive.Title className="text-base font-heading font-bold text-foreground">{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</DialogPrimitive.Description>
          <div className="mt-5 flex items-center justify-end gap-2">
            <DialogPrimitive.Close render={<Button variant="outline" size="sm">Cancelar</Button>} />
            <Button size="sm" onClick={onConfirm} disabled={loading}>
              {loading ? <Loader2 className="size-3.5 animate-spin" /> : null}
              {loading ? "Actualizando..." : confirmLabel}
            </Button>
          </div>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/* ────── Loading Skeleton ────── */

function Skeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8">
        <div className="flex items-center gap-3">
          <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />
          <div className="h-9 w-64 animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-28 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    </div>
  )
}

/* ────── Main Component ────── */

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
    tournament, teams, payments, matchesCount, unscheduledMatchesCount,
    loading, error, refresh, updateStatus, updateSchedule, updateMaxTeams, updateDateField,
    updateTeamPaymentStatus,
  } = useTournamentManage(tournamentId)

  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [updatingMaxTeams, setUpdatingMaxTeams] = useState(false)
  const [updatingDate, setUpdatingDate] = useState(false)
  const [updatingPayment, setUpdatingPayment] = useState<string | null>(null)
  const [dateValidationError, setDateValidationError] = useState<string | null>(null)
  const [confirmingFinish, setConfirmingFinish] = useState(false)
  const [pendingStatusValue, setPendingStatusValue] = useState<"draft" | "open" | "in_progress" | "finished" | null>(null)
  const [copiedLink, setCopiedLink] = useState<string | null>(null)
  const [hoveredTeam, setHoveredTeam] = useState<string | null>(null)

  useEffect(() => {
    if (tournament?.registration_deadline && tournament?.starts_at &&
      new Date(tournament.registration_deadline) > new Date(tournament.starts_at)) {
      setDateValidationError("El cierre de inscripciones no puede ser después de la fecha de inicio")
    } else { setDateValidationError(null) }
  }, [tournament?.registration_deadline, tournament?.starts_at])

  useEffect(() => { if (!authLoading && !user) router.replace("/auth") }, [authLoading, router, user])

  const onChangeStatus = async (value: "draft" | "open" | "in_progress" | "finished") => {
    if (value === "finished") { setPendingStatusValue(value); setConfirmingFinish(true); return }
    setUpdatingStatus(true); await updateStatus(value); setUpdatingStatus(false)
  }

  const copyLink = async (key: string, value: string) => {
    try { await navigator.clipboard.writeText(value); setCopiedLink(key); setTimeout(() => setCopiedLink(null), 1500) }
    catch { setCopiedLink(null) }
  }

  if (authLoading || loading) return <Skeleton />
  if (!user) return null

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background px-4 py-16">
        <Card className="mx-auto max-w-md text-center">
          <CardContent className="p-8">
            <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
              <Flag className="size-6 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-heading font-bold text-foreground">Torneo no encontrado</h2>
            <p className="mt-1 text-sm text-muted-foreground">Puede que no tengas acceso o el link ya no sea válido.</p>
            <Link href="/dashboard" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              <ArrowLeft className="size-4" /> Volver al dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  /* ── Setup steps ── */
  const hasSchedule = Boolean(tournament.scheduled_days?.length && tournament.scheduled_days.every((d) => d.times.length > 0))
  const setupSteps: SetupStep[] = [
    { id: "publish", title: "Publicar", subtitle: "Activar inscripciones", done: tournament.status !== "draft", hintWhenMissing: "Cambia el estado a Abierto.", actionHref: "#settings" },
    { id: "schedule", title: "Cronograma", subtitle: "Días y horarios", done: hasSchedule, hintWhenMissing: "Define los horarios de juego.", actionHref: "#schedule" },
    { id: "teams", title: "Equipos", subtitle: "Mínimo 2", done: teams.length >= 2, hintWhenMissing: "Comparte el link de inscripción.", actionHref: "#links" },
    { id: "fixture", title: "Fixture", subtitle: "Generar jornadas", done: matchesCount > 0, hintWhenMissing: "Genera el fixture.", actionHref: `/tournaments/${tournament.id}/fixture` },
    { id: "times", title: "Horarios", subtitle: "Asignar a partidos", done: matchesCount === 0 || unscheduledMatchesCount === 0, hintWhenMissing: "Asigna horarios a los partidos.", actionHref: `/tournaments/${tournament.id}/fixture` },
  ]
  const completedSteps = setupSteps.filter((s) => s.done).length
  const pendingSteps = setupSteps.filter((s) => !s.done)
  const paidCount = payments.filter((p) => p.status === "paid").length

  const shareLinks = { register: `/tournaments/${tournamentId}/register`, payment: `/tournaments/${tournamentId}/register?mode=pay`, portal: `/tournaments/${tournamentId}` }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:py-8">

        {/* ══════ HEADER ══════ */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/dashboard"
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border text-foreground transition hover:bg-muted active:scale-95"
              aria-label="Volver al dashboard"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="truncate text-2xl font-heading font-bold text-foreground sm:text-3xl">
                  {tournament.name}
                </h1>
                <StatusPill status={tournament.status} />
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {teams.length} equipo{teams.length !== 1 ? "s" : ""} · {payments.length} pago{payments.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refresh()}>
            <RefreshCcw className="size-3.5" /> Refrescar
          </Button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/8 px-4 py-3 text-sm text-red-400">{error}</div>
        )}

        {/* ══════ PROGRESS BAR ══════ */}
        <Card className="border-border/60">
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Progreso</p>
                <p className="text-sm font-heading font-bold text-foreground">Checklist de configuración</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {completedSteps < setupSteps.length && (
                  <span className="hidden text-xs text-muted-foreground sm:inline">
                    Falta{pendingSteps.length !== 1 ? "n" : ""} {pendingSteps.length} paso{pendingSteps.length !== 1 ? "s" : ""}
                  </span>
                )}
                <div className={cn(
                  "rounded-lg border px-2.5 py-1 text-xs font-semibold",
                  completedSteps === setupSteps.length
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border bg-background/70 text-foreground",
                )}>
                  {completedSteps}/{setupSteps.length}
                </div>
              </div>
            </div>

            <div className="relative flex items-start justify-between">
              <div className="absolute left-[18px] right-[18px] top-[9px] h-[3px] rounded-full bg-border/60" />
              <div
                className="absolute left-[18px] top-[9px] h-[3px] rounded-full bg-primary transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                style={{ width: setupSteps.length > 1 ? `${(completedSteps / (setupSteps.length - 1)) * 94}%` : "0%" }}
              />
              {setupSteps.map((step) => {
                const done = step.done
                return (
                  <div key={step.id} className="relative z-10 flex flex-col items-center gap-1.5" style={{ width: `${100 / setupSteps.length}%` }}>
                    <button
                      type="button"
                      onClick={() => { if (!done && step.actionHref) {
                        if (step.actionHref.startsWith("/")) router.push(step.actionHref)
                        else document.querySelector(step.actionHref)?.scrollIntoView({ behavior: "smooth" })
                      }}}
                      disabled={done}
                      className={cn(
                        "flex size-[18px] shrink-0 items-center justify-center rounded-full transition-all duration-300",
                        done
                          ? "bg-primary text-primary-foreground cursor-default"
                          : "border-2 border-amber-500/40 bg-background cursor-pointer hover:border-amber-500/70 hover:scale-110 active:scale-90",
                      )}
                      aria-label={`${step.title}: ${done ? "completado" : "pendiente"}`}
                    >
                      {done ? <Check className="size-2.5" strokeWidth={4} /> : <span className="size-1.5 rounded-full bg-amber-500/60" />}
                    </button>
                    <span className={cn("text-[9px] leading-tight text-center px-0.5",
                      done ? "font-semibold text-foreground" : "text-amber-500/70")}>
                      {step.title}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* ══════ METRICS ══════ */}
        <section className="grid grid-cols-3 gap-3 sm:gap-4" aria-label="Métricas">
          <MetricCard icon={Users} label="Equipos" sub="inscritos" value={teams.length} />
          <MetricCard icon={Trophy} label="Cupos" sub="disponibles" value={Math.max(0, tournament.max_teams - teams.length)} accent />
          <MetricCard icon={Wallet} label="Pagos" sub="confirmados" value={paidCount} />
        </section>

        {/* ══════ SHARE LINKS — compacto horizontal ══════ */}
        <Card id="links">
          <CardContent className="flex flex-wrap items-center gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-2.5 shrink-0">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Link2 className="size-4" />
              </div>
              <span className="text-sm font-semibold text-foreground">Compartir</span>
            </div>
            <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
              {([
                { key: "register", label: "Inscripción", icon: ExternalLink, value: shareLinks.register },
                { key: "payment", label: "Pago directo", icon: Wallet, value: shareLinks.payment },
                { key: "portal", label: "Portal público", icon: Globe, value: shareLinks.portal },
              ] as const).map((item) => {
                const Icon = item.icon
                const isCopied = copiedLink === item.key
                return (
                  <div key={item.key}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-lg border bg-background/50 px-2.5 py-1.5 transition-all",
                      isCopied ? "border-primary/40 bg-primary/5" : "border-border",
                    )}>
                    <Icon className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">{item.label}</span>
                    <span className="mx-0.5 h-3 w-px bg-border/60" />
                    <button type="button" onClick={() => copyLink(item.key, item.value)}
                      className={cn(
                        "flex size-6 items-center justify-center rounded transition active:scale-90",
                        isCopied ? "text-primary" : "text-muted-foreground hover:text-foreground",
                      )}>
                      {isCopied ? <Check className="size-3" /> : <Copy className="size-3" />}
                    </button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* ══════ SETTINGS — compacto horizontal ══════ */}
        <Card id="settings">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Flag className="size-4" />
              </div>
              <span className="text-sm font-semibold text-foreground">Ajustes</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="space-y-1.5" title={
                tournament.status === "draft" ? "Solo tú lo ves. Pasa a Abierto para iniciar inscripciones." :
                tournament.status === "open" ? "Visible y aceptando equipos." :
                tournament.status === "in_progress" ? "En juego. Ya no se aceptan equipos." :
                "Finalizado. Resultados visibles."
              }>
                <p className="text-sm font-medium text-foreground">Estado</p>
                <Select value={tournament.status}
                  onValueChange={(v) => void onChangeStatus(v as "draft" | "open" | "in_progress" | "finished")}
                  disabled={updatingStatus}>
                  <SelectTrigger id="status" className="h-8 w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((o) => (<SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>))}
                  </SelectContent>
                </Select>
                {updatingStatus && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
              </div>
              <div className="space-y-1.5">
                <p className="text-sm font-medium text-foreground">Cupo</p>
                <TournamentMaxTeamsInput value={tournament.max_teams}
                  onSave={async (v) => { setUpdatingMaxTeams(true); const ok = await updateMaxTeams(v); setUpdatingMaxTeams(false); return ok }}
                  saving={updatingMaxTeams} />
              </div>
              <InlineDateEditor label="Inicio" icon={Calendar} value={tournament.starts_at}
                onSave={async (v) => { setUpdatingDate(true); const ok = await updateDateField("starts_at", v); setUpdatingDate(false); return ok }}
                saving={updatingDate} min={nowSlice || undefined}
                helperText={undefined} />
              <InlineDateEditor label="Cierre" icon={Calendar} value={tournament.registration_deadline}
                onSave={async (v) => { setUpdatingDate(true); const ok = await updateDateField("registration_deadline", v); setUpdatingDate(false); return ok }}
                saving={updatingDate} validationError={dateValidationError} min={nowSlice || undefined}
                max={tournament.starts_at ? tournament.starts_at.slice(0, 10) : undefined}
                helperText={undefined} />
            </div>
          </CardContent>
        </Card>

        {/* ══════ GRID: EQUIPOS + PAGOS | CRONOGRAMA ══════ */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Users className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-heading font-bold text-foreground">Equipos y pagos</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {teams.length} equipo{teams.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <div className="flex flex-col items-center py-12 text-center">
                  <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-muted">
                    <Users className="size-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-semibold text-foreground">Aún no hay equipos</p>
                  <p className="mt-1 text-xs text-muted-foreground max-w-xs">Comparte el link de inscripción para recibir equipos.</p>
                </div>
              ) : (
                <>
                  {/* Progress bar */}
                  <div className="mb-5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">
                        <span className="font-semibold text-foreground">{teams.filter(t => t.payment_status === "paid").length}</span> de{" "}
                        <span className="font-semibold text-foreground">{teams.length}</span> pagaron
                      </span>
                      <span className="text-muted-foreground">
                        {Math.round((teams.filter(t => t.payment_status === "paid").length / teams.length) * 100)}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)]"
                        style={{ width: `${(teams.filter(t => t.payment_status === "paid").length / teams.length) * 100}%` }}
                      />
                    </div>
                  </div>

                  <ul className="space-y-1.5">
                    {teams.map((team) => {
                      const isPaid = team.payment_status === "paid"
                      const isLoading = updatingPayment === team.id
                      const teamPayment = payments.find(p => p.team_id === team.id)
                      return (
                        <li key={team.id}
                          className={cn(
                            "group flex items-center gap-3 rounded-lg border bg-background/30 px-3.5 py-3 transition-all duration-200",
                            isPaid ? "border-primary/20" : "border-border",
                          )}>
                          <span className={cn(
                            "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors duration-200",
                            isPaid ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                          )}>
                            {team.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                          </span>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-foreground truncate">{team.name}</p>
                              {teamPayment && (
                                <span className="text-[10px] text-muted-foreground/50 shrink-0">
                                  ${Number(teamPayment.amount).toLocaleString("es-CO")}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground/70">Cap: {team.captain_name}</p>
                          </div>

                          <button
                            type="button"
                            onClick={async () => {
                              setUpdatingPayment(team.id)
                              await updateTeamPaymentStatus(team.id, isPaid ? "pending" : "paid")
                              setUpdatingPayment(null)
                            }}
                            onMouseEnter={() => setHoveredTeam(team.id)}
                            onMouseLeave={() => setHoveredTeam(null)}
                            onFocus={() => setHoveredTeam(team.id)}
                            onBlur={() => setHoveredTeam(null)}
                            disabled={isLoading}
                            className={cn(
                              "shrink-0 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-90 disabled:opacity-50 min-w-[132px] text-center",
                              isPaid
                                ? "border-primary/30 bg-primary/10 text-primary hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-400"
                                : "border-dashed border-muted-foreground/30 bg-transparent text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
                            )}
                          >
                            {isLoading ? (
                              <span className="inline-flex items-center justify-center gap-1.5">
                                <Loader2 className="size-3.5 animate-spin" />
                                Actualizando...
                              </span>
                            ) : isPaid ? (
                              <span className="inline-flex items-center justify-center gap-1.5">
                                {hoveredTeam === team.id ? (
                                  <><XCircle className="size-3.5" /> Revertir pago</>
                                ) : (
                                  <><Check className="size-3.5" /> Pagado</>
                                )}
                              </span>
                            ) : (
                              <span className="inline-flex items-center justify-center gap-1.5">
                                {hoveredTeam === team.id ? (
                                  <><Check className="size-3.5" /> Confirmar pago</>
                                ) : (
                                  <><Clock className="size-3.5" /> Pendiente de pago</>
                                )}
                              </span>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </>
              )}
            </CardContent>
          </Card>

          <div id="schedule">
            <ScheduleEditor
              initialValue={tournament.scheduled_days ?? []}
              onSave={async (input) => { await updateSchedule(input) }}
            />
          </div>
        </div>

        {/* ══════ RULES ══════ */}
        {tournament.rules_text && (
          <Card>
            <CardHeader>
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Flag className="size-5" />
                </div>
                <div>
                  <h2 className="text-base font-heading font-bold text-foreground">Reglas</h2>
                  <p className="mt-0.5 text-sm text-muted-foreground">Las reglas definidas al crear el torneo.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground leading-relaxed">
                <RichTextRenderer html={tournament.rules_text} />
              </div>
            </CardContent>
          </Card>
        )}

      </main>

      <ConfirmDialog
        open={confirmingFinish}
        onClose={() => { setConfirmingFinish(false); setPendingStatusValue(null) }}
        onConfirm={() => { if (pendingStatusValue) { setUpdatingStatus(true); setConfirmingFinish(false); updateStatus(pendingStatusValue).then(() => { setUpdatingStatus(false); setPendingStatusValue(null) }) }}}
        title="Finalizar torneo"
        description="¿Estás seguro? Una vez finalizado no se podrán inscribir más equipos ni modificar resultados."
        confirmLabel="Sí, finalizar"
        loading={updatingStatus}
      />
    </div>
  )
}
