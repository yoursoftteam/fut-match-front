"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BrandLogo } from "@/components/BrandLogo";
import {
  Users,
  LayoutGrid,
  CreditCard,
  Share2,
  Trophy,
  BarChart2,
  Zap,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";


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
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Hero ── */}
      <section className="relative flex flex-col items-center justify-center text-center min-h-[calc(100vh-4rem)] px-4 pt-12 pb-20 overflow-hidden">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 60%, color-mix(in oklch, var(--primary) 12%, transparent), transparent)",
          }}
        />

        {/* Subtle field lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          aria-hidden
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, var(--foreground) 0 1px, transparent 1px 80px), repeating-linear-gradient(0deg, var(--foreground) 0 1px, transparent 1px 80px)",
          }}
        />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="mb-8 flex justify-center">
            <BrandLogo
              width={300}
              height={230}
              priority
              className="h-auto w-[200px] sm:w-[240px] md:w-[280px]"
            />
          </div>

          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Menos chat, más juego
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold leading-tight text-foreground mb-6">
            Organiza tu partido
            <br />
            <span className="text-primary">en 2 minutos.</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
            Arma equipos, gestiona pagos y comparte un link. Sin grupos de
            WhatsApp, sin Excel.{" "}
            <span className="text-foreground font-semibold">Sin excusas.</span>
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold text-lg transition-all hover:opacity-90 hover:scale-[1.02] neon-glow btn-primary-fm btn-neon-pulse cursor-pointer"
            >
              <Zap className="w-5 h-5" />
              Armar mi partido
            </Link>
            <Link
              href="/auth"
              className="inline-flex items-center gap-2 border-2 border-primary/40 text-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:border-primary hover:text-primary transition-colors cursor-pointer"
            >
              Iniciar sesión
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Social proof micro-copy */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-muted-foreground">
            {[
              "Gratis para siempre",
              "Sin descargas",
              "Listo en 2 minutos",
            ].map((item) => (
              <span key={item} className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-24 px-4 bg-muted/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-4">
              Todo lo que necesitas para{" "}
              <span className="text-primary">el picado perfecto</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              De la idea al pitazo inicial, sin fricciones.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                title: "Arma equipos en minutos",
                desc: "Organiza titulares y suplentes sin enredos de chat. Reparte jugadores más rápido y evita confusiones de última hora.",
                sub: "Menos coordinación manual, más tiempo para jugar.",
              },
              {
                icon: LayoutGrid,
                title: "Visualiza los equipos en cancha",
                desc: "Mira la distribución de jugadores en el campo para validar rápido si el partido está balanceado.",
                sub: "Todo claro antes del pitazo inicial.",
              },
              {
                icon: CreditCard,
                title: "Haz seguimiento de pagos",
                desc: "Lleva control de quién ya pagó y cuánto falta por cubrir, sin hojas sueltas ni cuentas improvisadas.",
                sub: "Transparencia para todo el grupo.",
              },
            ].map(({ icon: Icon, title, desc, sub }) => (
              <div
                key={title}
                className="card p-7 flex flex-col gap-4 hover:border-primary/30 cursor-default group"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-heading font-bold text-foreground mb-2">
                    {title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed mb-2">
                    {desc}
                  </p>
                  <p className="text-xs text-primary/80 font-medium">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Share CTA banner */}
          <div className="mt-8 flex flex-col md:flex-row items-center gap-6 rounded-2xl border border-primary/20 bg-primary/5 p-6 md:p-8">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Share2 className="w-5 h-5 text-primary flex-shrink-0" />
                <h3 className="text-xl font-heading font-bold text-foreground">
                  Comparte un link y llena los cupos
                </h3>
              </div>
              <p className="text-muted-foreground">
                Tus jugadores se inscriben en el enlace y pueden ver quiénes ya
                van apuntados. Organización simple, sin perseguir mensajes.
              </p>
            </div>
            <Link
              href="/create"
              className="flex-shrink-0 inline-flex items-center gap-2 bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold transition-all hover:opacity-90 btn-primary-fm cursor-pointer whitespace-nowrap"
            >
              Crear mi partido
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Services / Tiers ── */}
      <section className="py-24 px-4 bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-4">
              Servicios que ya tienes y{" "}
              <span className="text-primary">lo que viene</span>
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              parti2 crece contigo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Partido Gratis — disponible */}
            <div className="card p-7 flex flex-col gap-5 border-primary/30 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-0.5 bg-primary" />
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-lg font-heading font-bold text-foreground">
                    Partido Gratis
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    Disponible
                  </span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Arma partidos rápidos con tu gente. Define lugar, hora, costo
                  y cupos. ¡Sin complicaciones!
                </p>
              </div>
              <Link
                href="/create"
                className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-bold text-sm transition-all hover:opacity-90 btn-primary-fm cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                ¡Armar ahora!
              </Link>
            </div>

            {/* Torneos — próximamente */}
            <div className="card p-7 flex flex-col gap-5 opacity-60">
              <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center">
                <Trophy className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-lg font-heading font-bold text-foreground">
                    Torneos Profesionales
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    Próximamente
                  </span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Crea ligas con tabla de posiciones, fixture automático, fase
                  de grupos y reglas personalizadas.
                </p>
              </div>
              <span className="inline-flex items-center justify-center gap-2 bg-muted text-muted-foreground px-5 py-2.5 rounded-xl font-bold text-sm cursor-not-allowed">
                Próximamente
              </span>
            </div>

            {/* Estadísticas — próximamente */}
            <div className="card p-7 flex flex-col gap-5 opacity-60">
              <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center">
                <BarChart2 className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h4 className="text-lg font-heading font-bold text-foreground">
                    Estadísticas Completas
                  </h4>
                  <span className="text-[10px] font-bold uppercase tracking-wide bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                    Próximamente
                  </span>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Goles, tarjetas, diferencia de gol y más. Lleva el control
                  total de cada equipo y jugador.
                </p>
              </div>
              <span className="inline-flex items-center justify-center gap-2 bg-muted text-muted-foreground px-5 py-2.5 rounded-xl font-bold text-sm cursor-not-allowed">
                Próximamente
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="relative py-28 px-4 overflow-hidden bg-muted/40">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
          style={{
            background:
              "radial-gradient(ellipse 60% 60% at 50% 50%, color-mix(in oklch, var(--primary) 10%, transparent), transparent)",
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-heading font-bold text-foreground mb-4 leading-tight">
            El partido de tu vida
            <br />
            <span className="text-primary">te está esperando.</span>
          </h2>
          <p className="text-xl text-muted-foreground mb-10">
            Entra al campo.{" "}
            <span className="text-foreground font-semibold">Sin excusas.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/auth?mode=signup"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-10 py-4 rounded-xl font-bold text-lg transition-all hover:opacity-90 hover:scale-[1.02] neon-glow btn-primary-fm btn-neon-pulse cursor-pointer"
            >
              <Zap className="w-5 h-5" />
              Crear cuenta gratis
            </Link>
            <Link
              href="/auth?mode=signin"
              className="inline-flex items-center gap-2 border-2 border-primary/40 text-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:border-primary hover:text-primary transition-colors cursor-pointer"
            >
              Ya tengo cuenta
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
