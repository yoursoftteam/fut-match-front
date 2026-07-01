"use client"

import Link from "next/link"
import { useMemo } from "react"
import { ArrowLeft, CalendarRange, ChevronRight, Loader2, RefreshCcw } from "lucide-react"
import { useTournamentResults } from "@/hooks/useTournamentResults"
import { TournamentResultEditor } from "@/components/tournaments/TournamentResultEditor"
import { TournamentStandingsTable } from "@/components/tournaments/TournamentStandingsTable"

interface TournamentMatchesClientProps {
  tournamentId: string
}

export default function TournamentMatchesClient({ tournamentId }: TournamentMatchesClientProps) {
  const {
    tournament,
    teams,
    matches,
    rounds,
    selectedRound,
    standings,
    loading,
    saving,
    error,
    isOwner,
    selectRound,
    updateMatchScore,
    updateMatchStatus,
    refresh,
  } = useTournamentResults(tournamentId)

  const roundMatches = useMemo(
    () => matches.filter((m) => m.round_number === selectedRound),
    [matches, selectedRound]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
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
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Resultados</p>
            <h1 className="text-2xl font-heading font-bold text-foreground sm:text-3xl">{tournament.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Registra los marcadores de cada jornada.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refresh()}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <RefreshCcw className="size-4" />
              Actualizar
            </button>
            <Link
              href={`/tournaments/${tournament.id}/knockout`}
              className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-primary/15"
            >
              Ver knockout
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </header>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {rounds.length > 0 && (
          <section className="card p-4 sm:p-5">
            <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <CalendarRange className="size-3.5" />
              Jornada
            </p>
            <div className="flex flex-wrap gap-2">
              {rounds.map((round) => (
                <button
                  key={round}
                  type="button"
                  onClick={() => selectRound(round)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    selectedRound === round
                      ? "border-primary bg-primary/15 text-foreground"
                      : "border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  Jornada {round}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div>
            {isOwner ? (
              <TournamentResultEditor
                matches={roundMatches}
                teams={teams}
                isOwner={isOwner}
                saving={saving}
                onUpdateScore={updateMatchScore}
                onUpdateStatus={updateMatchStatus}
              />
            ) : (
              <div className="space-y-2">
                {roundMatches.map((match) => {
                  const homeName = teams.find((t) => t.id === match.home_team_id)?.name ?? "TBD"
                  const awayName = teams.find((t) => t.id === match.away_team_id)?.name ?? "TBD"
                  return (
                    <div key={match.id} className="card p-4">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-foreground truncate">{homeName}</span>
                        <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                          {match.home_goals ?? "?"}:{match.away_goals ?? "?"}
                        </span>
                        <span className="text-sm font-semibold text-foreground truncate">{awayName}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{match.phase_label}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <TournamentStandingsTable title="Tabla General" rows={standings} />
          </div>
        </section>

        {saving && (
          <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Guardando resultados...
          </p>
        )}
      </main>
    </div>
  )
}
