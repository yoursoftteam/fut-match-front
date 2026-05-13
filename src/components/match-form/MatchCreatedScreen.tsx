"use client";

import { useRouter } from "next/navigation";
import { type CreatedMatch } from "@/hooks/useMatchCreation";
import { formatCurrency } from "@/lib/currency";
import ShareLink from "@/components/ShareLink";

interface MatchCreatedScreenProps {
  match: CreatedMatch;
}

export function MatchCreatedScreen({ match }: MatchCreatedScreenProps) {
  const router = useRouter();

  return (
    <div className="card p-6 bg-card">
      <h2 className="text-2xl font-bold mb-6 text-center text-card-foreground">¡Partido Creado!</h2>
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <span className="font-medium text-muted-foreground">Lugar:</span>
          <span className="text-card-foreground font-medium">{match.location}</span>
        </div>
        <div className="flex justify-between items-center border-b border-border pb-3">
          <span className="font-medium text-muted-foreground">Fecha:</span>
          <span className="text-card-foreground font-medium">{match.date}</span>
        </div>
        <div className="flex justify-between items-center border-b border-border pb-3">
          <span className="font-medium text-muted-foreground">Hora:</span>
          <span className="text-card-foreground font-medium">{match.time}</span>
        </div>
        <div className="flex justify-between items-center border-b border-border pb-3">
          <span className="font-medium text-muted-foreground">Formato:</span>
          <span className="text-card-foreground font-medium tabular-nums">{match.playersPerTeam} vs {match.playersPerTeam}</span>
        </div>
        <div className="flex justify-between items-center border-b border-border pb-3">
          <span className="font-medium text-muted-foreground">Valor de la cancha:</span>
          <span className="text-card-foreground font-medium tabular-nums">{formatCurrency(match.fieldCost)}</span>
        </div>
        <div className="flex justify-between items-center pt-3">
          <span className="font-medium text-muted-foreground">Aporte por jugador:</span>
          <span className="font-bold text-primary text-xl tabular-nums">
            {formatCurrency(match.costPerPlayer)}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <button
          onClick={() => router.push(`/match/${match.id}`)}
          className="w-full btn btn-primary"
        >
          Ver Detalles del Partido
        </button>

        <ShareLink matchId={match.id} />
      </div>
    </div>
  );
}