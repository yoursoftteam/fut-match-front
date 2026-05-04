"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function getLevelInfo(maxPlayers: number): { label: string; cls: string } {
  if (maxPlayers <= 6)  return { label: "Casual",   cls: "level-casual" };
  if (maxPlayers <= 10) return { label: "Semi-Pro",  cls: "level-semipro" };
  return                       { label: "Pro",       cls: "level-pro" };
}

export default function Home() {
  const { user, loading } = useAuth();
  const { matches, loading: matchesLoading, registrationCounts } = useMatches();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground">
        Cargando…
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <section className="py-20 px-4 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-7xl sm:text-8xl md:text-9xl font-heading font-bold text-foreground mb-6 neon-text">
            Vibesports
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-4">
            ¿Listo para demostrar tu nivel en la cancha?
          </p>
          <p className="text-base text-muted-foreground max-w-xl mx-auto mb-10">
            Encuentra partidos, arma tu equipo y juega. <span className="text-foreground font-semibold">Sin excusas.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/create"
              className="inline-block bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg transition-colors neon-glow btn-primary-fm btn-neon-pulse"
            >
              ⚡ Armar mi cotejo
            </Link>
            <Link
              href="/auth"
              className="inline-block border-2 border-primary text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </section>

      {/* Live match feed */}
      <section className="py-14 px-4 bg-muted">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-heading font-bold text-foreground">
                🔥 Partidos en curso
              </h2>
              <p className="text-sm text-muted-foreground mt-1">Súmate ahora — los cupos se llenan rápido</p>
            </div>
            <Link href="/auth" className="text-primary hover:text-primary/80 transition-colors text-sm font-semibold">
              Ver todos →
            </Link>
          </div>
          {matchesLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : matches.length === 0 ? (
            <div className="card p-8 text-center">
              <span className="text-4xl mb-3 block">📅</span>
              <p className="text-card-foreground font-semibold mb-1">No hay partidos aún</p>
              <p className="text-muted-foreground text-sm">¡Sé el primero en armar uno!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 card-grid">
              {matches.slice(0, 6).map((match) => {
                const registeredCount = registrationCounts[match.id] || 0;
                const isFull = registeredCount >= match.max_players;
                const level = getLevelInfo(match.max_players);
                const spotsLeft = match.max_players - registeredCount;
                return (
                  <div key={match.id} className="card match-card p-5 relative">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-3xl" aria-hidden>⚽</span>
                      <div className="flex items-center gap-2">
                        <span className={`level-badge ${level.cls}`}>{level.label}</span>
                        {isFull && (
                          <span className="level-badge bg-red-600/15 text-red-400">Completo</span>
                        )}
                      </div>
                    </div>
                    <h3 className="text-base font-semibold text-card-foreground mb-1 leading-tight">
                      {match.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">📍 {match.location}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <span>👥 {registeredCount}/{match.max_players}</span>
                      {!isFull && (
                        <span className="text-primary font-medium">{spotsLeft} cupo{spotsLeft !== 1 ? "s" : ""} libre{spotsLeft !== 1 ? "s" : ""}</span>
                      )}
                      <span>📅 {new Date(match.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}</span>
                    </div>
                    <Link
                      href={`/auth`}
                      className="btn-primary-fm px-4 py-2 text-sm inline-block text-center w-full rounded-lg font-semibold"
                    >
                      {isFull ? "Ver detalles" : "¡Quiero jugar!"}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 px-4 bg-muted">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-heading font-bold text-center text-foreground mb-12">
            Tu próxima cancha, a un clic
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card p-6 text-center bg-card">
              <span className="text-4xl mb-4 block" aria-hidden>
                ⚽
              </span>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">Partido Gratis</h3>
              <p className="text-muted-foreground mb-4">
                Arma partidos rápidos con tu gente. Define lugar, hora, costo y cupos. ¡Sin complicaciones!
              </p>
              <Link
                href="/create"
                className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors btn-primary-fm"
              >
                ¡Armar ahora!
              </Link>
            </div>

            <div className="card p-6 text-center bg-card">
              <span className="text-4xl mb-4 block" aria-hidden>
                🏆
              </span>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">Torneos Profesionales</h3>
              <p className="text-muted-foreground mb-4">
                Crea ligas con tabla de posiciones, fixture automático, fase de grupos y reglas personalizadas.
              </p>
              <span className="inline-block bg-muted text-muted-foreground px-4 py-2 rounded-lg font-medium text-sm">
                Próximamente
              </span>
            </div>

            <div className="card p-6 text-center bg-card">
              <span className="text-4xl mb-4 block" aria-hidden>
                📊
              </span>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">Estadísticas Completas</h3>
              <p className="text-muted-foreground mb-4">
                Goles, tarjetas, diferencia de gol y más. Lleva el control total de cada equipo y jugador.
              </p>
              <span className="inline-block bg-muted text-muted-foreground px-4 py-2 rounded-lg font-medium text-sm">
                Próximamente
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-background">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-heading font-bold text-foreground mb-4">¿A qué esperas?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            El partido de tu vida te está esperando. <span className="text-foreground font-semibold">Entra al campo.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/auth?mode=signup"
              className="inline-block bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg transition-colors neon-glow btn-primary-fm btn-neon-pulse"
            >
              ⚡ Crear cuenta gratis
            </Link>
            <Link
              href="/auth?mode=signin"
              className="inline-block border-2 border-primary text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
