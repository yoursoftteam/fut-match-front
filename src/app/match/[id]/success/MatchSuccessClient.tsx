"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import ShareLink from "@/components/ShareLink";
import { BrandLogo } from "@/components/BrandLogo";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMatchSummary } from "@/hooks/useMatchCreation";

interface MatchSuccessProps {
  matchId: string;
}

export default function MatchSuccessClient({ matchId }: MatchSuccessProps) {
  const router = useRouter();
  const summary = useMatchSummary(matchId);

  if (!summary) {
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

  const dateObj = new Date(summary.date);
  const formattedDate = dateObj.toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

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
                <span className="text-card-foreground font-medium">{summary.location}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-muted-foreground">Fecha:</span>
                <span className="text-card-foreground font-medium">{formattedDate}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-muted-foreground">Hora:</span>
                <span className="text-card-foreground font-medium">{summary.time}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-muted-foreground">Formato:</span>
                <span className="text-card-foreground font-medium tabular-nums">
                  {summary.playersPerTeam} vs {summary.playersPerTeam}
                </span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-muted-foreground">Valor de la cancha:</span>
                <span className="text-card-foreground font-medium tabular-nums">
                  {formatCurrency(summary.fieldCost)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-3">
                <span className="font-medium text-muted-foreground">Aporte por jugador:</span>
                <span className="font-bold text-primary text-xl tabular-nums">
                  {formatCurrency(summary.costPerPlayer)}
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