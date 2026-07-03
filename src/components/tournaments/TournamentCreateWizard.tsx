"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Trophy } from "lucide-react"
import { useTournaments } from "@/hooks/useTournaments"
import {
  createTournamentInputSchema,
  type CreateTournamentInput,
  type Tournament,
  type TournamentScheduleDay,
} from "@/lib/tournament-schema"
import { TournamentDynamicLinksCard } from "@/components/tournaments/TournamentDynamicLinksCard"
import { TournamentSchedulePicker } from "@/components/tournaments/TournamentSchedulePicker"
import RichEditor from "@/components/rich-editor/RichEditor"

type Step = 1 | 2 | 3

interface TournamentWizardState {
  name: string
  logo_url: string
  description: string
  registration_fee: number
  status: "draft" | "open"
  max_teams: number
  min_players_per_team: number
  starts_at: string
  registration_deadline: string
  rules_text: string
  rules_pdf_url: string
  tournament_type: "league" | "groups"
  league_mode: "single_leg" | "home_away"
  groups_count: number
  qualifiers_per_group: number
  has_knockout: boolean
  knockout_phase: "round_of_16" | "quarterfinals" | "semifinals" | "final"
  scheduled_days: TournamentScheduleDay[]
}

const initialState: TournamentWizardState = {
  name: "",
  logo_url: "",
  description: "",
  registration_fee: 0,
  status: "open",
  max_teams: 16,
  min_players_per_team: 7,
  starts_at: "",
  registration_deadline: "",
  rules_text: "",
  rules_pdf_url: "",
  tournament_type: "league",
  league_mode: "single_leg",
  groups_count: 4,
  qualifiers_per_group: 2,
  has_knockout: true,
  knockout_phase: "quarterfinals",
  scheduled_days: [],
}

const STORAGE_KEY = "tournament-create-wizard"

function loadSavedState(): TournamentWizardState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as TournamentWizardState
  } catch {
    return null
  }
}

function saveState(state: TournamentWizardState) {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch { /* quota exceeded */ }
}

function clearSavedState() {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch { /* ignore */ }
}

function stepClass(currentStep: Step, target: Step) {
  if (currentStep === target) return "bg-primary text-primary-foreground"
  if (currentStep > target) return "bg-primary/20 text-primary"
  return "bg-muted text-muted-foreground"
}

export function TournamentCreateWizard() {
  const [step, setStep] = useState<Step>(1)
  const [form, setForm] = useState<TournamentWizardState>(initialState)
  const [createdTournament, setCreatedTournament] = useState<Tournament | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [focusField, setFocusField] = useState<string | null>(null)

  const { createTournament, loading, error } = useTournaments()

  useEffect(() => {
    const saved = loadSavedState()
    if (saved) {
      setForm({ ...initialState, ...saved })
    }
  }, [])

  useEffect(() => {
    saveState(form)
  }, [form])

  useEffect(() => {
    if (!focusField) return
    const el = document.getElementById(focusField)
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      el.focus({ preventScroll: true })
    }
    setFocusField(null)
  }, [step, focusField])

  const goToField = (targetStep: Step, fieldId: string) => {
    setStep(targetStep)
    setFocusField(fieldId)
  }

  const normalizedPayload: CreateTournamentInput = useMemo(() => {
    const base: CreateTournamentInput = {
      name: form.name,
      logo_url: form.logo_url,
      description: form.description,
      registration_fee: Number(form.registration_fee) || 0,
      tournament_type: form.tournament_type,
      status: form.status,
      max_teams: Number(form.max_teams),
      min_players_per_team: Number(form.min_players_per_team),
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : "",
      registration_deadline: form.registration_deadline ? new Date(form.registration_deadline).toISOString() : "",
      rules_text: form.rules_text,
      rules_pdf_url: form.rules_pdf_url,
      league_mode: form.league_mode,
      groups_count: Number(form.groups_count),
      qualifiers_per_group: Number(form.qualifiers_per_group),
      has_knockout: form.has_knockout,
      knockout_phase: form.knockout_phase,
      scheduled_days: form.scheduled_days.length > 0 ? form.scheduled_days : undefined,
    }

    return base
  }, [form])

  const validateCurrentStep = () => {
    if (step === 1) {
      if (!form.name.trim()) return "Dale un nombre al torneo"
      if (!form.starts_at) return "Define la fecha de inicio"
      if (form.max_teams < 2) return "Debe haber al menos 2 equipos"
      if (form.min_players_per_team < 5) return "Mínimo 5 jugadores por equipo"
      return null
    }

    if (step === 2 && form.tournament_type === "groups") {
      if (form.groups_count < 2) return "Debe haber mínimo 2 grupos"
      if (form.qualifiers_per_group < 1) return "Define clasificados por grupo"
    }

    return null
  }

  const goNext = () => {
    const msg = validateCurrentStep()
    if (msg) {
      setLocalError(msg)
      return
    }

    setLocalError(null)
    setStep((prev) => (prev < 3 ? ((prev + 1) as Step) : prev))
  }

  const goBack = () => {
    setLocalError(null)
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev))
  }

  const onSubmit = async () => {
    setLocalError(null)

    const parsed = createTournamentInputSchema.safeParse(normalizedPayload)
    if (!parsed.success) {
      setLocalError(parsed.error.issues[0]?.message ?? "Revisa los datos del torneo")
      return
    }

    const created = await createTournament(parsed.data)
    if (!created) return

    clearSavedState()
    setCreatedTournament(created)
  }

  if (createdTournament) {
    return (
      <div className="space-y-5">
        <section className="card p-6">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary">
            <CheckCircle2 className="size-3.5" />
            Torneo creado
          </p>
          <h2 className="mt-3 text-2xl font-heading font-bold text-foreground">{createdTournament.name}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Listo para convocar. Comparte el link y arma el squad.</p>

          <div className="mt-4">
            <Link
              href={`/tournaments/${createdTournament.id}/manage`}
              className="btn-primary-fm inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
            >
              Gestionar torneo
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </section>

        <TournamentDynamicLinksCard tournamentId={createdTournament.id} />
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="card p-5 sm:p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="inline-flex items-center gap-2 text-lg font-heading font-bold text-foreground">
            <Trophy className="size-5 text-primary" />
            Crear torneo
          </h2>
          <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Paso {step} de 3</span>
        </div>

        <div className="mb-6 grid grid-cols-3 gap-2">
          <div className={`rounded-lg px-3 py-2 text-center text-xs font-semibold ${stepClass(step, 1)}`}>Info</div>
          <div className={`rounded-lg px-3 py-2 text-center text-xs font-semibold ${stepClass(step, 2)}`}>Formato</div>
          <div className={`rounded-lg px-3 py-2 text-center text-xs font-semibold ${stepClass(step, 3)}`}>Revisión</div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-foreground">Nombre del torneo</label>
              <input
                id="name"
                type="text"
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                placeholder="Copa Barrios 2026"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="starts_at" className="mb-1.5 block text-sm font-medium text-foreground">Fecha de inicio</label>
                <input
                  id="starts_at"
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={(e) => setForm((prev) => ({ ...prev, starts_at: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                />
              </div>

              <div>
                <label htmlFor="registration_deadline" className="mb-1.5 block text-sm font-medium text-foreground">Cierre de inscripciones</label>
                <input
                  id="registration_deadline"
                  type="datetime-local"
                  value={form.registration_deadline}
                  onChange={(e) => setForm((prev) => ({ ...prev, registration_deadline: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="registration_fee" className="mb-1.5 block text-sm font-medium text-foreground">Valor inscripción por equipo</label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <input
                    id="registration_fee"
                    type="text"
                    inputMode="numeric"
                    value={form.registration_fee ? Number(form.registration_fee).toLocaleString("es-CO") : "0"}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, "")
                      setForm((prev) => ({ ...prev, registration_fee: raw ? Number(raw) : 0 }))
                    }}
                    className="w-full rounded-lg border border-border bg-background px-8 py-3 text-foreground"
                  />
                </div>
              </div>
            </div>

            <TournamentSchedulePicker
              value={form.scheduled_days}
              onChange={(scheduled_days) => setForm((prev) => ({ ...prev, scheduled_days }))}
            />

            {form.scheduled_days.length > 0 && form.scheduled_days.every((d) => d.times.length === 0) && (
              <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                Seleccionaste días pero no agregaste horarios. Puedes hacerlo ahora o dejarlo para después desde la gestión del torneo.
              </p>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="max_teams" className="mb-1.5 block text-sm font-medium text-foreground">Máximo de equipos</label>
                <input
                  id="max_teams"
                  type="number"
                  min={2}
                  value={form.max_teams}
                  onChange={(e) => setForm((prev) => ({ ...prev, max_teams: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                />
              </div>

              <div>
                <label htmlFor="min_players" className="mb-1.5 block text-sm font-medium text-foreground">Mín. jugadores por equipo</label>
                <input
                  id="min_players"
                  type="number"
                  min={5}
                  value={form.min_players_per_team}
                  onChange={(e) => setForm((prev) => ({ ...prev, min_players_per_team: Number(e.target.value) }))}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                />
              </div>
            </div>

            <div>
              <span className="mb-1.5 block text-sm font-medium text-foreground">Reglas del torneo</span>
              <RichEditor
                value={form.rules_text}
                onChange={(html) => setForm((prev) => ({ ...prev, rules_text: html }))}
                placeholder="Duración, sanciones, desempates..."
                minHeight={140}
                id="rules_text"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="rules_pdf_url" className="mb-1.5 block text-sm font-medium text-foreground">URL de reglas PDF</label>
                <input
                  id="rules_pdf_url"
                  type="url"
                  value={form.rules_pdf_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, rules_pdf_url: e.target.value }))}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                  placeholder="https://..."
                />
              </div>

              <div>
                <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-foreground">Estado inicial</label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value as "draft" | "open" }))}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                >
                  <option value="open">Abierto</option>
                  <option value="draft">Borrador</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Formato del torneo</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, tournament_type: "league" }))}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    form.tournament_type === "league"
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Liga
                </button>
                <button
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, tournament_type: "groups" }))}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    form.tournament_type === "groups"
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Grupos
                </button>
              </div>
            </div>

            {form.tournament_type === "league" ? (
              <div>
                <label htmlFor="league_mode" className="mb-1.5 block text-sm font-medium text-foreground">Vueltas</label>
                <select
                  id="league_mode"
                  value={form.league_mode}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      league_mode: e.target.value as "single_leg" | "home_away",
                    }))
                  }
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                >
                  <option value="single_leg">Solo ida</option>
                  <option value="home_away">Ida y vuelta</option>
                </select>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="groups_count" className="mb-1.5 block text-sm font-medium text-foreground">Número de grupos</label>
                    <input
                      id="groups_count"
                      type="number"
                      min={2}
                      value={form.groups_count}
                      onChange={(e) => setForm((prev) => ({ ...prev, groups_count: Number(e.target.value) }))}
                      className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                    />
                  </div>

                  <div>
                    <label htmlFor="qualifiers_per_group" className="mb-1.5 block text-sm font-medium text-foreground">Clasifican por grupo</label>
                    <input
                      id="qualifiers_per_group"
                      type="number"
                      min={1}
                      value={form.qualifiers_per_group}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, qualifiers_per_group: Number(e.target.value) }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                    />
                  </div>
                </div>

                <label htmlFor="has_knockout" className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <input
                    id="has_knockout"
                    type="checkbox"
                    checked={form.has_knockout}
                    onChange={(e) => setForm((prev) => ({ ...prev, has_knockout: e.target.checked }))}
                    className="size-4 rounded border-border"
                  />
                  Knockout posterior
                </label>

                {form.has_knockout && (
                  <div>
                    <label htmlFor="knockout_phase" className="mb-1.5 block text-sm font-medium text-foreground">Fase inicial knockout</label>
                    <select
                      id="knockout_phase"
                      value={form.knockout_phase}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          knockout_phase: e.target.value as
                            | "round_of_16"
                            | "quarterfinals"
                            | "semifinals"
                            | "final",
                        }))
                      }
                      className="w-full rounded-lg border border-border bg-background px-4 py-3 text-foreground"
                    >
                      <option value="round_of_16">Octavos</option>
                      <option value="quarterfinals">Cuartos</option>
                      <option value="semifinals">Semifinales</option>
                      <option value="final">Final</option>
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5 text-sm">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Información general</p>

            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Nombre</p>
                <button
                  type="button"
                  onClick={() => goToField(1, "name")}
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition"
                >
                  Editar
                </button>
              </div>
              <p className="mt-1 font-semibold text-foreground">{form.name || "-"}</p>
            </div>

            <div className="rounded-xl border border-border bg-background/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Fecha de inicio</p>
                <button
                  type="button"
                  onClick={() => goToField(1, "starts_at")}
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition"
                >
                  Editar
                </button>
              </div>
              <p className="mt-1 font-semibold text-foreground">
                {form.starts_at
                  ? new Date(form.starts_at).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })
                  : "Sin definir"}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Valor inscripción</p>
                <p className="mt-1 font-semibold text-foreground">${form.registration_fee.toLocaleString("es-CO")}</p>
                <button
                  type="button"
                  onClick={() => goToField(1, "registration_fee")}
                  className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 transition"
                >
                  Editar
                </button>
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Máx. equipos</p>
                <p className="mt-1 font-semibold text-foreground">{form.max_teams}</p>
                <button
                  type="button"
                  onClick={() => goToField(1, "max_teams")}
                  className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 transition"
                >
                  Editar
                </button>
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Mín. jugadores</p>
                <p className="mt-1 font-semibold text-foreground">{form.min_players_per_team}</p>
                <button
                  type="button"
                  onClick={() => goToField(1, "min_players")}
                  className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 transition"
                >
                  Editar
                </button>
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Estado inicial</p>
                <p className="mt-1 font-semibold text-foreground">{form.status === "open" ? "Abierto" : "Borrador"}</p>
                <button
                  type="button"
                  onClick={() => goToField(1, "status")}
                  className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 transition"
                >
                  Editar
                </button>
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-4 col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Cierre inscripciones</p>
                  <button
                    type="button"
                    onClick={() => goToField(1, "registration_deadline")}
                    className="text-xs font-semibold text-primary hover:text-primary/80 transition"
                  >
                    Editar
                  </button>
                </div>
                <p className="mt-1 font-semibold text-foreground">
                  {form.registration_deadline
                    ? new Date(form.registration_deadline).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" })
                    : "Sin definir"}
                </p>
              </div>
            </div>

            <div className={`rounded-xl border p-4 col-span-2 ${
              form.scheduled_days.length === 0
                ? "border-amber-500/40 bg-amber-500/8"
                : "border-border bg-background/70"
            }`}>
              <div className="flex items-center justify-between gap-3">
                <p className={`text-xs uppercase tracking-widest ${
                  form.scheduled_days.length === 0 ? "text-amber-400" : "text-muted-foreground"
                }`}>Cronograma</p>
                <button
                  type="button"
                  onClick={() => goToField(1, "starts_at")}
                  className="text-xs font-semibold text-primary hover:text-primary/80 transition"
                >
                  Editar
                </button>
              </div>
              {form.scheduled_days.length === 0 ? (
                <p className="mt-1 text-xs text-amber-300">Sin configurar — los horarios se asignarán manualmente después</p>
              ) : form.scheduled_days.every((d) => d.times.length === 0) ? (
                <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                  Seleccionaste días pero no agregaste horarios. Puedes hacerlo ahora o dejarlo para después desde la gestión del torneo.
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">{form.scheduled_days.length} día(s) configurado(s)</p>
              )}
            </div>

            {form.rules_text && (
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Reglas</p>
                  <button
                    type="button"
                    onClick={() => goToField(1, "rules_text")}
                    className="text-xs font-semibold text-primary hover:text-primary/80 transition"
                  >
                    Editar
                  </button>
                </div>
                <div className="mt-1 text-xs text-muted-foreground leading-relaxed [&_ol]:list-decimal [&_ul]:list-disc [&_li]:ml-4" dangerouslySetInnerHTML={{ __html: form.rules_text }} />
              </div>
            )}

            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Formato</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-widest text-muted-foreground">Tipo</p>
                <p className="mt-1 font-semibold text-foreground">{form.tournament_type === "league" ? "Liga" : "Grupos"}</p>
                <button
                  type="button"
                  onClick={() => goToField(2, "tournament_type")}
                  className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 transition"
                >
                  Editar
                </button>
              </div>

              {form.tournament_type === "league" ? (
                <div className="rounded-xl border border-border bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Vueltas</p>
                  <p className="mt-1 font-semibold text-foreground">{form.league_mode === "single_leg" ? "Solo ida" : "Ida y vuelta"}</p>
                  <button
                    type="button"
                    onClick={() => goToField(2, "league_mode")}
                    className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 transition"
                  >
                    Editar
                  </button>
                </div>
              ) : (
                <>
                  <div className="rounded-xl border border-border bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Grupos</p>
                    <p className="mt-1 font-semibold text-foreground">{form.groups_count}</p>
                    <button
                      type="button"
                      onClick={() => goToField(2, "groups_count")}
                      className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 transition"
                    >
                      Editar
                    </button>
                  </div>
                  <div className="rounded-xl border border-border bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">Clasifican por grupo</p>
                    <p className="mt-1 font-semibold text-foreground">{form.qualifiers_per_group}</p>
                    <button
                      type="button"
                      onClick={() => goToField(2, "qualifiers_per_group")}
                      className="mt-2 text-xs font-semibold text-primary hover:text-primary/80 transition"
                    >
                      Editar
                    </button>
                  </div>
                  <div className="rounded-xl border border-border bg-background/70 p-4 col-span-2">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-widest text-muted-foreground">Knockout</p>
                      <button
                        type="button"
                        onClick={() => goToField(2, "has_knockout")}
                        className="text-xs font-semibold text-primary hover:text-primary/80 transition"
                      >
                        Editar
                      </button>
                    </div>
                    <p className="mt-1 font-semibold text-foreground">
                      {form.has_knockout
                        ? `Sí · ${form.knockout_phase === "round_of_16" ? "Octavos" : form.knockout_phase === "quarterfinals" ? "Cuartos" : form.knockout_phase === "semifinals" ? "Semifinales" : "Final"}`
                        : "No"}
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {(localError || error) && <p className="mt-4 text-sm text-red-400">{localError ?? error}</p>}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 1 || loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ChevronLeft className="size-4" />
            Atrás
          </button>

          {step < 3 ? (
            <button
              type="button"
              onClick={goNext}
              className="btn-primary-fm inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold"
            >
              Siguiente
              <ChevronRight className="size-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              disabled={loading}
              className="btn-primary-fm inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold disabled:opacity-60"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
              {loading ? "Creando torneo..." : "Crear torneo"}
            </button>
          )}
        </div>
      </section>
    </div>
  )
}
