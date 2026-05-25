"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Loader2, Users, Calendar, MapPin, CreditCard, Zap } from "lucide-react";
import ShareLink from "@/components/ShareLink";
import SaveFrecuenteCard from "@/components/SaveFrecuenteCard";
import { getMatchTitleFromLocation } from "@/lib/match-title";
import { BrandLogo } from "@/components/BrandLogo";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { useMatches } from "@/hooks/useMatches";

interface MatchSuccessProps {
  matchId: string;
}

export default function MatchSuccessClient({ matchId }: MatchSuccessProps) {
  const router = useRouter();
  const { getMatchById } = useMatches();
  const [match, setMatch] = useState<{
    location: string;
    date: string;
    field_cost: number;
    rental_cost: number;
    has_rented_goalkeepers: boolean;
    rented_goalkeepers_count: number;
    players_per_team: number;
    max_players: number;
    source_template_id?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await getMatchById(matchId);
      if (error || !data) {
        setLoading(false);
        return;
      }
      setMatch({
        location: data.location,
        date: data.date,
        field_cost: data.field_cost,
        rental_cost: data.rental_cost,
        has_rented_goalkeepers: data.has_rented_goalkeepers,
        rented_goalkeepers_count: data.rented_goalkeepers_count,
        players_per_team: data.players_per_team,
        max_players: data.max_players,
        source_template_id: data.source_template_id,
      });
      setLoading(false);
    })();
  }, [matchId, getMatchById]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="card max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-heading font-semibold text-destructive mb-2">
            Resumen no disponible
          </h2>
          <p className="text-muted-foreground text-sm mb-6">
            Los datos del partido no están disponibles. Es posible que la página haya sido recargada.
          </p>
          <Button onClick={() => router.push("/create")} className="w-full">
            Volver a crear partido
          </Button>
        </div>
      </div>
    );
  }

  const dateObj = new Date(match.date);
  const formattedDate = dateObj.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalPlayers = match.max_players;
  const costPerPlayer =
    totalPlayers > 0
      ? Math.ceil((match.field_cost + match.rental_cost) / totalPlayers)
      : 0;

  const matchTime = match.date.includes("T")
    ? match.date.split("T")[1].slice(0, 5)
    : "";

  const infoRows = [
    { icon: MapPin, label: "Lugar", value: match.location },
    { icon: Calendar, label: "Fecha", value: formattedDate },
    { icon: Calendar, label: "Hora", value: matchTime },
    { icon: Users, label: "Formato", value: `${match.players_per_team} vs ${match.players_per_team}` },
    ...(match.field_cost > 0
      ? [{ icon: CreditCard, label: "Valor cancha", value: formatCurrency(match.field_cost) }]
      : []),
    ...(match.has_rented_goalkeepers && match.rental_cost > 0
      ? [
          {
            icon: CreditCard,
            label: `Alquiler arqueros (${match.rented_goalkeepers_count})`,
            value: formatCurrency(match.rental_cost),
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, color-mix(in oklch, var(--primary) 8%, transparent), transparent)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 sm:py-10">
        {/* Header */}
        <header className="text-center mb-8 mt-2">
          <div className="mb-4 flex justify-center">
            <BrandLogo
              width={220}
              height={96}
              className="h-auto w-[130px] sm:w-[160px]"
            />
          </div>

          {/* Success badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-4">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Partido creado
          </div>

          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-2">
            ¡Ya estás fichado!
          </h1>
          <p className="text-muted-foreground text-sm">
            Tu partido está listo. Comparte el link y llena los cupos.
          </p>
        </header>

        {/* Match summary card */}
        <div className="card p-6 mb-5">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Resumen del partido
          </h2>
          <div className="space-y-3">
            {infoRows.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-sm">{label}</span>
                </div>
                <span className="text-sm font-medium text-foreground text-right">
                  {value}
                </span>
              </div>
            ))}

            {/* Cost per player highlight */}
            {costPerPlayer > 0 && (
              <div className="flex items-center justify-between gap-3 pt-3 mt-1">
                <span className="text-sm font-semibold text-foreground">
                  Aporte por jugador
                </span>
                <span className="font-bold text-primary text-2xl tabular-nums">
                  {formatCurrency(costPerPlayer)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={() => router.push(`/match/${matchId}`)}
            className="w-full btn-primary-fm neon-glow font-bold gap-2"
          >
            <Zap className="w-4 h-4" />
            Ver Detalles del Partido
          </Button>

          <ShareLink matchId={matchId} />

          {match.source_template_id ? (
            <p className="text-center text-xs text-muted-foreground px-2">
              Este partido se creó desde una plantilla. Para guardar una variante, ve a los detalles.
            </p>
          ) : (
            <SaveFrecuenteCard
              location={match.location}
              defaultName={getMatchTitleFromLocation(match.location)}
              playersPerTeam={match.players_per_team}
              hasRentedGoalkeepers={match.has_rented_goalkeepers}
              rentedGoalkeepersCount={match.rented_goalkeepers_count}
              fieldCost={match.field_cost}
              rentalCost={match.rental_cost}
              time={matchTime}
              matchId={matchId}
              matchDate={match.date}
            />
          )}

          <div className="text-center pt-2">
            <Link
              href="/create"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Crear otro partido
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
