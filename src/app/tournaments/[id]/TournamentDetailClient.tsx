"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { type Tournament, type TournamentTeam } from "@/lib/tournament-schema"
import { CalendarDays, ChevronLeft, ShieldCheck, Swords, Trophy, Users } from "lucide-react"
import RichTextRenderer from "@/components/rich-editor/RichTextRenderer"

interface TournamentDetailClientProps {
  tournamentId: string
}

export default function TournamentDetailClient({ tournamentId }: TournamentDetailClientProps) {
  const { user, loading: authLoading } = useAuth()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<TournamentTeam[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const [tResult, teamsResult] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", tournamentId).maybeSingle(),
        supabase.from("tournament_teams").select("*").eq("tournament_id", tournamentId).order("name"),
      ])
      if (tResult.data) setTournament(tResult.data as Tournament)
      if (teamsResult.data) setTeams(teamsResult.data as TournamentTeam[])
      setLoading(false)
    }
    void fetch()
  }, [tournamentId])

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="mx-auto w-full max-w-lg space-y-4">
          <div className="card p-5 space-y-4">
            <div className="h-3 w-28 animate-pulse rounded-full bg-muted" />
            <div className="h-7 w-3/4 animate-pulse rounded-lg bg-muted" />
            <div className="h-4 w-full animate-pulse rounded-lg bg-muted" />
            <div className="space-y-2">
              <div className="h-4 w-48 animate-pulse rounded-lg bg-muted" />
              <div className="h-4 w-36 animate-pulse rounded-lg bg-muted" />
              <div className="h-4 w-40 animate-pulse rounded-lg bg-muted" />
            </div>
            <div className="h-24 w-full animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="card p-5 space-y-3">
            <div className="h-4 w-32 animate-pulse rounded-lg bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
          </div>
          <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-md card p-6 text-center">
          <p className="text-lg font-heading font-bold text-foreground">Torneo no encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">El torneo no existe o fue eliminado.</p>
          <Link href="/tournaments" className="mt-4 inline-block text-sm text-primary hover:text-primary/80">
            Ver torneos disponibles
          </Link>
        </div>
      </div>
    )
  }

  const isOwner = !authLoading && user && tournament.owner_id === user.id
  const userTeam = user?.email ? teams.find((t) => t.captain_email === user.email) ?? null : null
  const spotsLeft = tournament.max_teams - teams.length

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-lg space-y-4 px-4 py-6">
        <Link
          href="/tournaments"
          className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Torneos
        </Link>

        <header className="card p-5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest">
            <span className={`size-2 rounded-full ${
              tournament.status === "open" ? "bg-green-500" :
              tournament.status === "in_progress" ? "bg-blue-500" :
              tournament.status === "finished" ? "bg-muted-foreground" :
              "bg-yellow-500"
            }`} />
            <span className={
              tournament.status === "open" ? "text-green-500" :
              tournament.status === "in_progress" ? "text-blue-500" :
              tournament.status === "finished" ? "text-muted-foreground" :
              "text-yellow-500"
            }>
              {tournament.status === "open" && "Abierto"}
              {tournament.status === "draft" && "Borrador"}
              {tournament.status === "in_progress" && "En curso"}
              {tournament.status === "finished" && "Finalizado"}
            </span>
          </span>
          <h1 className="mt-1 text-2xl font-heading font-bold text-foreground">{tournament.name}</h1>

          {tournament.description && (
            <p className="mt-2 text-sm text-muted-foreground">{tournament.description}</p>
          )}

          <div className="mt-4 space-y-2 text-sm">
            {tournament.starts_at && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="size-4 shrink-0" />
                <span>{new Date(tournament.starts_at).toLocaleDateString("es-CO", { dateStyle: "long" })}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="size-4 shrink-0" />
              <span>
                {teams.length} / {tournament.max_teams} equipos
                {spotsLeft > 0 && <span className="text-primary"> ({spotsLeft} cupos)</span>}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Swords className="size-4 shrink-0" />
              <span className="capitalize">
                {tournament.tournament_type === "league" ? "Liga" : "Grupos + fase final"}
              </span>
            </div>
          </div>

          {tournament.rules_text && (
            <div className="mt-4 rounded-lg border border-border bg-background/60 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Reglas</p>
              <div className="text-sm text-muted-foreground leading-relaxed">
                <RichTextRenderer html={tournament.rules_text} />
              </div>
            </div>
          )}
        </header>

        <section className="card p-5">
          <h2 className="text-sm font-semibold text-foreground">Equipos inscritos</h2>
          {teams.length === 0 ? (
            <div className="mt-3 text-center py-6">
              <Users className="mx-auto size-8 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">Aún no hay equipos inscritos.</p>
              {tournament.status === "open" && !isOwner && !userTeam && (
                <Link
                  href={`/tournaments/${tournamentId}/register`}
                  className="mt-3 inline-block text-sm font-semibold text-primary hover:text-primary/80"
                >
                  Sé el primero en inscribirte
                </Link>
              )}
            </div>
          ) : (
            <ul className="mt-3 space-y-2">
              {teams.map((team) => {
                const isUsersTeam = userTeam?.id === team.id
                return (
                  <li
                    key={team.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                      isUsersTeam
                        ? "border-primary/30 bg-primary/5"
                        : "border-border bg-background/50"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {team.name}
                        {isUsersTeam && <span className="ml-1.5 text-xs text-primary">(tu equipo)</span>}
                      </p>
                      {team.kit_colors && (
                        <p className="text-xs text-muted-foreground">{team.kit_colors}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs ${isUsersTeam ? "text-primary" : "text-muted-foreground"}`}>
                      <ShieldCheck className="size-3" />
                      Inscrito
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <div className="flex flex-col gap-2">
          {tournament.status === "open" && !isOwner && !userTeam && (
            <Link
              href={`/tournaments/${tournamentId}/register`}
              className="btn-primary-fm inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
            >
              <ShieldCheck className="size-4" />
              Inscribir equipo
            </Link>
          )}

          {userTeam && (
            <Link
              href={`/tournaments/${tournamentId}/register`}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
            >
              <ShieldCheck className="size-4" />
              {userTeam.name} — inscrito
            </Link>
          )}

          {isOwner && (
            <Link
              href={`/tournaments/${tournamentId}/manage`}
              className="btn-primary-fm inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
            >
              <Trophy className="size-4" />
              Administrar torneo
            </Link>
          )}

          <Link
            href="/tournaments"
            className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-muted"
          >
            Ver torneos disponibles
          </Link>
        </div>
      </main>
    </div>
  )
}
