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
            <h1 className="font-heading text-3xl font-bold text-foreground">Mis encuentros ⚽</h1>
            <p className="mt-1 text-muted-foreground">
              Los encuentros que armaste o en los que estás anotado.
            </p>
          </div>
          <Link
            href="/create"
            className="btn-primary-fm inline-block rounded-lg px-6 py-2 text-center text-sm font-semibold neon-glow"
          >
            ⚡ Armar encuentro
          </Link>
        </div>

        {matchesLoading ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
            <p className="text-muted-foreground">Cargando encuentros…</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="card p-10 text-center">
            <span className="text-4xl mb-3 block" aria-hidden>📅</span>
            <p className="text-lg font-semibold text-card-foreground mb-1">La cancha está vacía</p>
            <p className="text-muted-foreground text-sm mb-5">¡Ármate el primero y convoca a tu gente!</p>
            <Link href="/create" className="btn-primary-fm inline-block rounded-lg px-6 py-3 font-semibold">
              ⚽ Armar primer encuentro
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3 card-grid">
            {matches.map((match) => {
              const registeredCount = registrationCounts[match.id] || 0;
              const isFull = registeredCount >= match.max_players;
              const maxP = match.max_players;
              const level = maxP <= 6 ? { label: 'Casual', cls: 'level-casual' } : maxP <= 10 ? { label: 'Semi-Pro', cls: 'level-semipro' } : { label: 'Pro', cls: 'level-pro' };
              const spotsLeft = maxP - registeredCount;
              return (
                <div key={match.id} className="card match-card relative p-5">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl" aria-hidden>⚽</span>
                    <div className="flex items-center gap-1.5">
                      <span className={`level-badge ${level.cls}`}>{level.label}</span>
                      {isFull && <span className="level-badge bg-red-600/15 text-red-400">Completo</span>}
                    </div>
                  </div>
                  <h2 className="mb-1 text-base font-semibold text-card-foreground leading-tight">{match.title}</h2>
                  <p className="text-xs text-muted-foreground mb-3">📍 {match.location}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                    <span>👥 {registeredCount}/{maxP}</span>
                    {!isFull ? (
                      <span className="text-primary font-semibold">{spotsLeft} cupo{spotsLeft !== 1 ? 's' : ''} libre{spotsLeft !== 1 ? 's' : ''}</span>
                    ) : (
                      <span className="text-red-400 font-semibold">Sin cupos</span>
                    )}
                    <span>📅 {new Date(match.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}</span>
                  </div>
                  <Link
                    href={`/match/${match.id}`}
                    className="btn-primary-fm inline-block w-full rounded-lg px-4 py-2 text-center text-sm font-semibold"
                  >
                    {isFull ? 'Ver detalles' : '¡Ver encuentro!'}
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
