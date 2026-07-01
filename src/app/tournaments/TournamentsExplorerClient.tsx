"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowLeft, Search, Trophy, Users, Calendar, MapPin } from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Tournament } from "@/lib/tournament-schema"

export default function TournamentsExplorerClient() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")

  useEffect(() => {
    const fetchOpen = async () => {
      setLoading(true)
      setError(null)

      try {
        const { data, error: dbError } = await supabase
          .from("tournaments")
          .select("*")
          .eq("status", "open")
          .order("starts_at", { ascending: true, nullsFirst: false })

        if (dbError) throw dbError
        setTournaments((data ?? []) as Tournament[])
      } catch (err) {
        const message = err instanceof Error ? err.message : "No se pudieron cargar los torneos"
        setError(message)
      } finally {
        setLoading(false)
      }
    }

    void fetchOpen()
  }, [])

  const filtered = tournaments.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-6xl space-y-5 px-4 py-6 sm:py-8">
        <header>
          <Link
            href="/"
            className="mb-2 inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
          >
            <ArrowLeft className="size-4" />
            Volver al inicio
          </Link>
          <h1 className="mt-2 text-2xl font-heading font-bold text-foreground sm:text-3xl">Torneos Abiertos</h1>
          <p className="mt-1 text-sm text-muted-foreground">Explora torneos públicos e inscribe tu equipo.</p>
        </header>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar torneo..."
            className="w-full rounded-xl border border-border bg-background py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-10 text-center">
            <Trophy className="mx-auto size-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-heading font-bold text-foreground">
              {search ? "Sin resultados" : "No hay torneos abiertos"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {search
                ? "Ningún torneo coincide con tu búsqueda."
                : "Vuelve más tarde o crea tu propio torneo."}
            </p>
            {!search && (
              <Link
                href="/tournaments/new"
                className="btn-primary-fm mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold"
              >
                <Trophy className="size-4" />
                Crear torneo
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((tournament) => (
              <div key={tournament.id} className="card match-card p-5 flex flex-col gap-3">
                <h3 className="text-base font-heading font-bold text-card-foreground leading-tight">
                  {tournament.name}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {tournament.tournament_type === "league" ? "Liga" : "Grupos"}
                  {tournament.max_teams ? ` · ${tournament.max_teams} equipos` : ""}
                  {tournament.registration_fee > 0
                    ? ` · $${Number(tournament.registration_fee).toLocaleString("es-CO")}/equipo`
                    : " · Gratuito"}
                </p>

                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  {tournament.starts_at && (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="size-3.5" />
                      {new Date(tournament.starts_at).toLocaleDateString("es-CO", {
                        weekday: "short",
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>

                <Link
                  href={`/tournaments/${tournament.id}/register`}
                  className="btn-primary-fm mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold"
                >
                  <Users className="size-4" />
                  Inscribir equipo
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
