"use client";

import { useState, useEffect, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface HeadlineSlide {
  headline: ReactNode;
  description: string;
  cta?: { label: string; href: string };
}

const SLIDES: HeadlineSlide[] = [
  {
    headline: (
      <>
        Organiza tu partido
        <br />
        <span className="text-primary">en 2 minutos.</span>
      </>
    ),
    description:
      "Arma equipos, gestiona pagos y comparte un link. Sin grupos de WhatsApp, sin Excel. Sin excusas.",
    cta: { label: "Armar mi partido", href: "/create" },
  },
  {
    headline: (
      <>
        Ganate la copa
        <br />
        <span className="text-primary">de la predicción.</span>
      </>
    ),
    description:
      "Pronosticá los resultados del Mundial 2026 y demostrá quién la pega más. ¿Tenés lo que hay que tener?",
    cta: { label: "Crear Polla", href: "/bet" },
  },
  {
    headline: (
      <>
        Armá tu propia
        <br />
        <span className="text-primary">liga profesional.</span>
      </>
    ),
    description:
      "Fixture automático, tabla de posiciones y fase de grupos. El football manager que siempre quisiste, pronto.",
    cta: { label: "Próximamente", href: "#" },
  },
];

const INTERVAL_MS = 8000;
const FADE_DURATION = 250;

export function HeroHeadline() {
  const router = useRouter();
  const { user } = useAuth();
  const [active, setActive] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  const advance = useCallback(() => {
    setIsVisible(false);
  }, []);

  useEffect(() => {
    const interval = setInterval(advance, INTERVAL_MS);
    return () => clearInterval(interval);
  }, [advance]);

  useEffect(() => {
    if (isVisible) return;
    const timeout = setTimeout(() => {
      setActive((prev) => {
        const next = (prev + 1) % SLIDES.length;
        return next;
      });
      setIsVisible(true);
    }, FADE_DURATION);
    return () => clearTimeout(timeout);
  }, [isVisible]);

  const slide = SLIDES[active];

  const handlePrimaryClick = () => {
    if (!slide.cta?.href) return;
    if (slide.cta.href === "/bet" && !user) {
      router.push("/auth");
    } else {
      router.push(slide.cta.href);
    }
  };

  return (
    <div className="relative">
      <div
        className={cn(
          "transition-all duration-[250ms] ease-out",
          isVisible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2"
        )}
      >
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-heading font-bold leading-tight text-foreground mb-6">
          {slide.headline}
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto mb-10 leading-relaxed">
          {slide.description}
        </p>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => {
              setIsVisible(false);
              setTimeout(() => {
                setActive(i);
                setIsVisible(true);
              }, FADE_DURATION);
            }}
            aria-label={`Ver slide ${i + 1}`}
            className={cn(
              "h-1.5 rounded-full transition-all duration-300 cursor-pointer",
              i === active
                ? "w-8 bg-primary"
                : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>

      {/* CTA buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        {slide.cta?.href ? (
          <button
            onClick={handlePrimaryClick}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-xl font-bold text-lg transition-all hover:opacity-90 hover:scale-[1.02] neon-glow btn-primary-fm btn-neon-pulse cursor-pointer"
          >
            <Zap className="w-5 h-5" />
            {slide.cta.label}
          </button>
        ) : (
          <span className="inline-flex items-center gap-2 bg-muted text-muted-foreground px-8 py-4 rounded-xl font-bold text-lg cursor-not-allowed">
            <Zap className="w-5 h-5" />
            {slide.cta!.label}
          </span>
        )}
        <Link
          href="/auth"
          className="inline-flex items-center gap-2 border-2 border-primary/40 text-foreground px-8 py-4 rounded-xl font-semibold text-lg hover:border-primary hover:text-primary transition-colors cursor-pointer"
        >
          {active === 1 ? "Ya tengo cuenta" : "Iniciar sesión"}
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
