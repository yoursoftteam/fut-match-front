"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MatchesPage() {
  const { user, loading: authLoading } = useAuth();
  const { matches, loading: matchesLoading, registrationCounts } = useMatches();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
          <p className="text-muted-foreground">Cargando…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold text-foreground">Mis partidos</h1>
            <p className="mt-1 text-muted-foreground">
              Lista de partidos que creaste o en los que participas.
            </p>
          </div>
          <Link
            href="/create"
            className="btn-primary-fm inline-block rounded-lg px-6 py-2 text-center text-sm font-semibold"
          >
            Crear partido
          </Link>
        </div>

        {matchesLoading ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
            <p className="text-muted-foreground">Cargando partidos…</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-lg text-card-foreground">No hay partidos todavía.</p>
            <Link href="/create" className="btn-primary-fm mt-6 inline-block rounded-lg px-6 py-3 font-semibold">
              Crear tu primer partido
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {matches.map((match) => {
              const registeredCount = registrationCounts[match.id] || 0;
              const isFull = registeredCount >= match.max_players;
              return (
                <div key={match.id} className="card relative p-6">
                  {isFull && (
                    <div className="absolute right-3 top-3 rounded-full bg-red-600 px-2 py-1 text-xs font-bold text-white">
                      ¡Completo!
                    </div>
                  )}
                  <h2 className="mb-2 pr-16 text-lg font-semibold text-card-foreground">{match.title}</h2>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>📍 {match.location}</p>
                    <p>
                      👥 {registeredCount}/{match.max_players} jugadores
                    </p>
                    <p>📅 {new Date(match.date).toLocaleDateString("es-ES")}</p>
                  </div>
                  <Link
                    href={`/match/${match.id}`}
                    className="btn-primary-fm mt-4 inline-block w-full rounded-lg px-4 py-2 text-center text-sm"
                  >
                    Ver detalles
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
