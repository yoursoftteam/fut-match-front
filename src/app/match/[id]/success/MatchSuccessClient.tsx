"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, Loader2 } from "lucide-react";
import ShareLink from "@/components/ShareLink";
import SaveFrecuenteCard from "@/components/SaveFrecuenteCard";
import { BrandLogo } from "@/components/BrandLogo";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold text-destructive mb-2">Resumen no disponible</h2>
            <p className="text-muted-foreground mb-4">
              Los datos del partido no están disponibles. Es posible que la página haya sido recargada.
            </p>
            <Button onClick={() => router.push("/create")}>Volver a crear partido</Button>
          </CardContent>
        </Card>
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
  const costPerPlayer = totalPlayers > 0
    ? Math.ceil((match.field_cost + match.rental_cost) / totalPlayers)
    : 0;

  const matchTime =
    match.date.includes("T")
      ? match.date.split("T")[1].slice(0, 5)
      : "";

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8 mt-4">
          <div className="mb-2 flex justify-center">
            <BrandLogo width={220} height={96} className="h-auto w-[160px] sm:w-[200px]" />
          </div>
          <p className="text-muted-foreground">
            ¡Tu partido está listo para compartir!
          </p>
        </header>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-muted-foreground">Lugar:</span>
                <span className="text-card-foreground font-medium">{match.location}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-muted-foreground">Fecha:</span>
                <span className="text-card-foreground font-medium">{formattedDate}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-muted-foreground">Hora:</span>
                <span className="text-card-foreground font-medium">{matchTime}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-muted-foreground">Formato:</span>
                <span className="text-card-foreground font-medium tabular-nums">
                  {match.players_per_team} vs {match.players_per_team}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-muted-foreground">Valor de la cancha:</span>
                <span className="text-card-foreground font-medium tabular-nums">
                  {formatCurrency(match.field_cost)}
                </span>
              </div>
              {match.has_rented_goalkeepers && match.rental_cost > 0 && (
                <div className="flex justify-between items-center border-b border-border pb-3">
                  <span className="font-medium text-muted-foreground">Alquiler arqueros ({match.rented_goalkeepers_count}):</span>
                  <span className="text-card-foreground font-medium tabular-nums">
                    {formatCurrency(match.rental_cost)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-3">
                <span className="font-medium text-muted-foreground">Aporte por jugador:</span>
                <span className="font-bold text-primary text-xl tabular-nums">
                  {formatCurrency(costPerPlayer)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Button
            onClick={() => router.push(`/match/${matchId}`)}
            className="w-full"
          >
            Ver Detalles del Partido
          </Button>

          <ShareLink matchId={matchId} />

          <SaveFrecuenteCard
            location={match.location}
            defaultName={`Partido en ${match.location}`}
            playersPerTeam={match.players_per_team}
            hasRentedGoalkeepers={match.has_rented_goalkeepers}
            rentedGoalkeepersCount={match.rented_goalkeepers_count}
            fieldCost={match.field_cost}
            rentalCost={match.rental_cost}
            time={matchTime}
            matchId={matchId}
          />

          <div className="text-center">
            <Link
              href="/create"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm"
            >
              <ArrowLeftIcon className="h-4 w-4" />
              Crear otro partido
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
