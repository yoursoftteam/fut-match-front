"use client";

import { useSyncExternalStore } from "react";
import { Zap, Trophy, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCarousel } from "@/hooks/useCarousel";
import { ServiceSlide, type SlideData } from "./ServiceSlide";
import { CarouselControls } from "./CarouselControls";

const SLIDES: SlideData[] = [
  {
    icon: Zap,
    title: "Partido Gratis",
    description:
      "Arma partidos rápidos con tu gente. Define lugar, hora, costo y cupos. ¡Sin complicaciones!",
    features: [
      "Crea y comparte en segundos",
      "Elige cancha, hora y costo",
      "Hasta 2 arqueros por equipo",
    ],
    badge: { label: "Disponible", variant: "available" },
    cta: { label: "¡Armar ahora!", href: "/create" },
  },
  {
    icon: Trophy,
    title: "Predicciones FIFA 2026",
    description:
      "Compite con amigos: pronostica resultados del Mundial 2026. ¡Gana la copa de la predicción!",
    features: [
      "Pronostica cada partido del Mundial",
      "Tabla de posiciones en tiempo real",
      "Invita a tus amigos y sé el mejor",
    ],
    badge: { label: "Nuevo", variant: "new" },
    cta: { label: "Comenzar", href: "/bet" },
    featured: true,
  },
  {
    icon: LayoutGrid,
    title: "Torneos Profesionales",
    description:
      "Crea ligas con tabla de posiciones, fixture automático, fase de grupos y reglas personalizadas.",
    features: [
      "Fixture automático inteligente",
      "Fase de grupos + eliminatorias",
      "Estadísticas por jugador y equipo",
    ],
    badge: { label: "Próximamente", variant: "coming" },
    cta: { label: "Próximamente" },
  },
];

function useMediaQuery(query: string): boolean {
  const getSnapshot = () => window.matchMedia(query).matches;
  const getServerSnapshot = () => false;
  return useSyncExternalStore(
    (callback) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", callback);
      return () => mq.removeEventListener("change", callback);
    },
    getSnapshot,
    getServerSnapshot
  );
}

export function ServiceCarousel() {
  const isMobile = useMediaQuery("(max-width: 767px)");
  const { currentIndex, goTo, goNext, goPrev, handlers } = useCarousel({
    totalSlides: SLIDES.length,
  });

  return (
    <section
      className="py-24 px-4 bg-background"
      aria-labelledby="services-title"
      {...handlers}
    >
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2
            id="services-title"
            className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-4"
          >
            Servicios que ya tienes y{" "}
            <span className="text-primary">lo que viene</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            parti2 crece contigo.
          </p>
        </div>

        <div
          className="relative overflow-hidden md:overflow-visible"
          role="region"
          aria-roledescription="carousel"
          aria-label="Servicios destacados"
        >
          <div
            className={cn(
              "flex transition-transform duration-[400ms] ease-[cubic-bezier(0.36,0.07,0.19,0.97)]",
              "md:justify-center md:transform-none md:gap-6"
            )}
            style={
              isMobile
                ? { transform: `translateX(-${currentIndex * 100}%)` }
                : undefined
            }
          >
            {SLIDES.map((slide, i) => (
              <div
                key={i}
                className={cn(
                  "min-w-0 shrink-0 w-full px-4 transition-all duration-[400ms] ease-[cubic-bezier(0.36,0.07,0.19,0.97)]",
                  "md:w-[350px] md:shrink md:grow-0",
                  i === currentIndex
                    ? "opacity-100 scale-[1.02]"
                    : "opacity-60 scale-[0.95]"
                )}
              >
                <ServiceSlide slide={slide} isActive={i === currentIndex} />
              </div>
            ))}
          </div>
        </div>

        <CarouselControls
          total={SLIDES.length}
          current={currentIndex}
          onGoTo={goTo}
          onPrev={goPrev}
          onNext={goNext}
        />
      </div>
    </section>
  );
}
