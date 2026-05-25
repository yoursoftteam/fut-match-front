"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import MatchGroupedList from "@/components/MatchGroupedList";
import { Calendar, MapPin, Users, Zap } from "lucide-react";

export default function MatchesPage() {
  const { user, loading: authLoading } = useAuth();
  const { matches, loading: matchesLoading, registrationCounts } = useMatches({
    autoFetch: true,
    onlyOwnedByCurrentUser: true,
  });
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
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <p className="text-muted-foreground text-sm">Cargando…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        {/* Page header */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
              Historial
            </p>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold text-foreground leading-tight">
              Mis Partidos
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Todos los partidos que creaste.
            </p>
          </div>
          <Link
            href="/create"
            className="inline-flex items-center gap-2 btn-primary-fm rounded-xl px-5 py-3 text-sm font-bold neon-glow shrink-0 cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            Armar partido
          </Link>
        </div>

        {matchesLoading ? (
          <div className="py-16 text-center">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-primary border-r-transparent" />
            <p className="text-muted-foreground text-sm">Cargando encuentros…</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-7 h-7 text-muted-foreground" />
            </div>
            <p className="text-lg font-heading font-semibold text-foreground mb-1">
              La cancha está vacía
            </p>
            <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
              Ármate el primero y convoca a tu gente.
            </p>
            <Link
              href="/create"
              className="inline-flex items-center gap-2 btn-primary-fm rounded-xl px-6 py-3 font-bold cursor-pointer"
            >
              <Zap className="w-4 h-4" />
              Armar primer partido
            </Link>
          </div>
        ) : (
          <MatchGroupedList
            matches={matches}
            registrationCounts={registrationCounts}
            renderCard={(match, registeredCount, isFull) => {
              const maxP = match.max_players;
              const level =
                maxP <= 6
                  ? { label: 'Casual', cls: 'level-casual' }
                  : maxP <= 10
                    ? { label: 'Semi-Pro', cls: 'level-semipro' }
                    : { label: 'Pro', cls: 'level-pro' };
              const spotsLeft = maxP - registeredCount;
              const fillPercent = Math.min(100, (registeredCount / maxP) * 100);

              return (
                <div className="card match-card relative p-5 flex flex-col gap-3">
                  {/* Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`level-badge ${level.cls}`}>{level.label}</span>
                    {isFull && (
                      <span className="level-badge bg-red-600/15 text-red-400">Completo</span>
                    )}
                  </div>

                  {/* Title */}
                  <h2 className="font-heading text-base font-bold text-card-foreground leading-tight">
                    {match.title}
                  </h2>

                  {/* Meta */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{match.location}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {registeredCount}/{maxP}
                          {' · '}
                          {!isFull ? (
                            <span className="text-primary font-semibold">
                              {spotsLeft} cupo{spotsLeft !== 1 ? 's' : ''} libre{spotsLeft !== 1 ? 's' : ''}
                            </span>
                          ) : (
                            <span className="text-red-400 font-semibold">Sin cupos</span>
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {new Date(match.date).toLocaleDateString("es-ES", {
                            day: "2-digit",
                            month: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${fillPercent}%` }}
                    />
                  </div>

                  {/* CTA */}
                  <Link
                    href={`/match/${match.id}`}
                    className="btn-primary-fm inline-block w-full rounded-xl px-4 py-2.5 text-center text-sm font-bold cursor-pointer"
                  >
                    {isFull ? 'Ver detalles' : 'Ver partido'}
                  </Link>
                </div>
              );
            }}
          />
        )}
      </main>
    </div>
  );
}
