"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { ArrowLeft, CalendarRange, Clock3, Filter, Loader2, Sparkles } from "lucide-react"
import { useTournamentFixture } from "@/hooks/useTournamentFixture"
import { TournamentStandingsTable } from "@/components/tournaments/TournamentStandingsTable"

interface TournamentFixtureClientProps {
  tournamentId: string
}

function statusLabel(status: string): string {
  if (status === "pending") return "Pendiente"
  if (status === "played") return "Jugado"
  if (status === "live") return "En vivo"
  return status
}

function formatMatchStart(startsAt: string | null): string {
  if (!startsAt) return "Sin horario"

  return new Intl.DateTimeFormat("es-CO", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(startsAt))
}

function formatDayLabel(dayOfWeek: number): string {
  return ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][dayOfWeek] ?? "Día"
}

export default function TournamentFixtureClient({ tournamentId }: TournamentFixtureClientProps) {
  const {
    tournament,
    teams,
    matches,
    standingsByGroup,
    loading,
    generating,
    error,
    isOwner,
    refresh,
    generateFixture,
    assignSchedule,
  } = useTournamentFixture(tournamentId)

  const [selectedGroup, setSelectedGroup] = useState<string>("all")
  const [selectedRound, setSelectedRound] = useState<string>("all")

  const groupOptions = useMemo(() => {
    const labels = Array.from(new Set(matches.map((match) => match.group_label).filter(Boolean) as string[]))
    labels.sort((a, b) => a.localeCompare(b, "es"))
    return labels
  }, [matches])

  const roundOptions = useMemo(() => {
    const filteredByGroup =
      selectedGroup === "all"
        ? matches
        : matches.filter((match) => match.group_label === selectedGroup)

    const values = Array.from(new Set(filteredByGroup.map((match) => match.round_number).filter(Boolean)))
    return values.sort((a, b) => a - b)
  }, [matches, selectedGroup])

  const filteredMatches = useMemo(() => {
    return matches.filter((match) => {
      if (selectedGroup !== "all" && match.group_label !== selectedGroup) return false
      if (selectedRound !== "all" && String(match.round_number) !== selectedRound) return false
      return true
    })
  }, [matches, selectedGroup, selectedRound])

  const hasFixture = matches.length > 0

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <div className="h-8 w-60 animate-pulse rounded-lg bg-muted" />
          <div className="h-20 animate-pulse rounded-xl bg-muted" />
          <div className="h-72 animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-2xl card p-6 text-center">
          <p className="text-lg font-heading font-bold text-foreground">Torneo no encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">No fue posible cargar el fixture solicitado.</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
            Volver
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:py-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link
              href={`/tournaments/${tournament.id}/manage`}
              className="mb-2 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <ArrowLeft className="size-4" />
              Volver a gestión
            </Link>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Fixture</p>
            <h1 className="text-2xl font-heading font-bold text-foreground sm:text-3xl">{tournament.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Visualiza jornadas, grupos y tabla de posiciones en tiempo real.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <CalendarRange className="size-4" />
              Actualizar
            </button>

            {isOwner && (
              <>
                <button
                  type="button"
                  onClick={() => void assignSchedule()}
                  disabled={generating || !hasFixture}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
                >
                  {generating ? <Loader2 className="size-4 animate-spin" /> : <Clock3 className="size-4" />}
                  {generating ? "Asignando..." : "Asignar horarios"}
                </button>

                <button
                  type="button"
                  onClick={() => void generateFixture(false)}
                  disabled={generating || hasFixture || teams.length < 2}
                  className="btn-primary-fm inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold disabled:opacity-60"
                >
                  {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {generating ? "Generando..." : "Generar fixture"}
                </button>
              </>
            )}
          </div>
        </header>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {!hasFixture ? (
          <section className="card p-6 text-center">
            <p className="text-lg font-heading font-bold text-foreground">Aún no hay fixture generado</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isOwner
                ? "Pulsa Generar fixture para crear jornadas automáticamente."
                : "El organizador todavía no publica jornadas."}
            </p>
          </section>
        ) : (
          <>
            <section className="card p-4 sm:p-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Cronograma</p>
              {tournament.scheduled_days && tournament.scheduled_days.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {tournament.scheduled_days.map((day) => (
                    <div key={day.day_of_week} className="rounded-lg border border-border bg-background/70 p-3">
                      <p className="text-sm font-semibold text-foreground">{formatDayLabel(day.day_of_week)}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {day.times.length > 0 ? day.times.join(", ") : "Sin horarios"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-1 text-sm text-foreground">Sin días configurados</p>
              )}
            </section>

            <section className="card p-4 sm:p-5">
              <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Filter className="size-3.5" />
                Filtros
              </p>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:max-w-xl">
                <div>
                  <label htmlFor="group-filter" className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Grupo
                  </label>
                  <select
                    id="group-filter"
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground"
                  >
                    <option value="all">Todos</option>
                    {groupOptions.map((group) => (
                      <option key={group} value={group}>
                        {group}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="round-filter" className="mb-1 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Jornada
                  </label>
                  <select
                    id="round-filter"
                    value={selectedRound}
                    onChange={(e) => setSelectedRound(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground"
                  >
                    <option value="all">Todas</option>
                    {roundOptions.map((round) => (
                      <option key={round} value={String(round)}>
                        Jornada {round}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
              <div className="card p-4 sm:p-5">
                <h2 className="text-lg font-heading font-bold text-foreground">Partidos</h2>
                {filteredMatches.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">No hay partidos con ese filtro.</p>
                ) : (
                  <ul className="mt-4 space-y-2">
                    {filteredMatches.map((match) => {
                      const homeName = teams.find((team) => team.id === match.home_team_id)?.name ?? "TBD"
                      const awayName = teams.find((team) => team.id === match.away_team_id)?.name ?? "TBD"

                      return (
                        <li key={match.id} className="rounded-lg border border-border bg-background/70 p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {match.group_label && (
                              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                                {match.group_label}
                              </span>
                            )}
                            <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                              Jornada {match.round_number}
                            </span>
                            <span className="rounded-full bg-muted px-2 py-1 text-xs font-semibold text-muted-foreground">
                              {statusLabel(match.match_status)}
                            </span>
                          </div>

                          <p className="mt-2 text-sm font-semibold text-foreground">
                            {homeName} vs {awayName}
                          </p>

                          <p className="text-xs text-muted-foreground">{match.phase_label ?? "Sin fase"}</p>
                          <p className="mt-1 text-xs text-primary">{formatMatchStart(match.starts_at)}</p>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>

              <div className="space-y-4">
                {Object.entries(standingsByGroup).map(([group, rows]) => (
                  <TournamentStandingsTable key={group} title={group} rows={rows} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
