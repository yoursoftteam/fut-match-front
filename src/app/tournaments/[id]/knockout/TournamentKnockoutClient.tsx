"use client"

import Link from "next/link"
import { ArrowLeft, ChevronRight, Loader2, Sparkles, Trophy } from "lucide-react"
import { useTournamentKnockout } from "@/hooks/useTournamentKnockout"
import { TournamentBracketView } from "@/components/tournaments/TournamentBracketView"
import { TournamentStandingsTable } from "@/components/tournaments/TournamentStandingsTable"

interface TournamentKnockoutClientProps {
  tournamentId: string
}

export default function TournamentKnockoutClient({ tournamentId }: TournamentKnockoutClientProps) {
  const {
    tournament,
    teams,
    standingsByGroup,
    qualifiedTeams,
    bracketMatches,
    loading,
    generating,
    error,
    isOwner,
    canGenerateKnockout,
    generateBracket,
    updateKnockoutScore,
    refresh,
  } = useTournamentKnockout(tournamentId)

  const hasBracket = bracketMatches.length > 0

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-6xl space-y-4">
          <div className="h-8 w-60 animate-pulse rounded-lg bg-muted" />
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
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Knockout</p>
            <h1 className="text-2xl font-heading font-bold text-foreground sm:text-3xl">{tournament.name}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Fase de eliminación directa.</p>
          </div>

          <div className="flex items-center gap-2">
            {isOwner && !hasBracket && canGenerateKnockout && (
              <button
                type="button"
                onClick={() => void generateBracket()}
                disabled={generating}
                className="btn-primary-fm inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold disabled:opacity-60"
              >
                {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {generating ? "Generando..." : "Generar bracket"}
              </button>
            )}

            {isOwner && hasBracket && (
              <button
                type="button"
                onClick={() => void generateBracket()}
                disabled={generating}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                Regenerar
              </button>
            )}

            <Link
              href={`/tournaments/${tournament.id}/matches`}
              className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              Resultados
              <ChevronRight className="size-4" />
            </Link>
          </div>
        </header>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {tournament.has_knockout && canGenerateKnockout && (
          <section className="card p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Clasificados</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {qualifiedTeams.map((qt) => (
                <div key={`${qt.group_label}-${qt.position}`} className="rounded-lg border border-border bg-background/70 p-2.5">
                  <p className="text-xs text-muted-foreground">
                    {qt.group_label} · {qt.position}°
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-foreground">{qt.team_name}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!tournament.has_knockout && tournament.tournament_type === "groups" && (
          <section className="card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Este torneo no tiene fase knockout configurada. La tabla de grupos define las posiciones finales.
            </p>
          </section>
        )}

        {tournament.tournament_type === "league" && (
          <section className="card p-6 text-center">
            <Trophy className="mx-auto size-8 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              Este torneo es formato liga. El equipo con más puntos al finalizar todas las jornadas es el campeón.
            </p>
          </section>
        )}

        <section className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div>
            {hasBracket ? (
              <TournamentBracketView
                matches={bracketMatches}
                teams={teams}
                isOwner={isOwner}
                saving={generating}
                onUpdateScore={updateKnockoutScore}
              />
            ) : (
              canGenerateKnockout && (
                <div className="card p-6 text-center">
                  <p className="text-sm text-foreground">
                    {isOwner ? "Genera el bracket para empezar la fase eliminatoria." : "El bracket aún no ha sido generado."}
                  </p>
                </div>
              )
            )}
          </div>

          <div className="space-y-4">
            {Object.entries(standingsByGroup).map(([group, rows]) => (
              <TournamentStandingsTable key={group} title={group} rows={rows} />
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
