"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
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
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            El ecosistema definitivo para deportistas.
            <span className="block mt-2">Organiza cotejos de manera gratuita.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/create"
              className="inline-block bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg transition-colors neon-glow btn-primary-fm"
            >
              Comenzar Gratis
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

      <section className="py-16 px-4 bg-muted">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-heading font-bold text-center text-foreground mb-12">
            ¿Qué puedes hacer en Vibesports?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="card p-6 text-center bg-card">
              <span className="text-4xl mb-4 block" aria-hidden>
                ⚽
              </span>
              <h3 className="text-xl font-semibold text-card-foreground mb-3">Cotejos Gratis</h3>
              <p className="text-muted-foreground mb-4">
                Organiza partidos rápidos con tus amigos. Define lugar, hora, costo y máximo de jugadores. ¡Todo gratis!
              </p>
              <Link
                href="/create"
                className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium transition-colors btn-primary-fm"
              >
                Crear Cotejo
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
          <h2 className="text-3xl font-heading font-bold text-foreground mb-6">¿Listo para jugar?</h2>
          <p className="text-xl text-muted-foreground mb-8">
            Crea tu cuenta gratis y empieza a organizar cotejos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/auth?mode=signup"
              className="inline-block bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg transition-colors neon-glow btn-primary-fm"
            >
              Crear Cuenta Gratis
            </Link>
            <Link
              href="/auth?mode=signin"
              className="inline-block border-2 border-primary text-primary px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
