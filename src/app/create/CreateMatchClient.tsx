"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MatchFormSteps, { type MatchFormSubmitData } from "@/components/MatchFormSteps";
import ShareLink from "@/components/ShareLink";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import { formatCurrency } from "@/lib/currency";
import { BrandLogo } from "@/components/BrandLogo";

interface CreatedMatch extends MatchFormSubmitData {
  id: string;
  created_at: string;
}

export default function CreateMatchClient() {
  const [createdMatch, setCreatedMatch] = useState<CreatedMatch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { createMatch, registerRentedGoalkeepers } = useMatches();
  const router = useRouter();
  const requiresLogin = !user;
  const submitLabel = loading
    ? "Creando partido…"
    : user
      ? "Crear Partido"
      : "Inicia sesión para crear el partido";

  const handleMatchCreate = async (data: MatchFormSubmitData) => {
    if (!user) {
      setError("Debes iniciar sesión para crear un partido");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const matchData = {
        title: `Partido en ${data.location}`,
        location: data.location,
        date: `${data.date}T${data.time}:00`,
        max_players: data.totalPlayers,
        created_by: user.id,
      };

      const { data: newMatch, error: createError } = await createMatch(matchData);

      if (createError) {
        throw createError;
      }

      if (!newMatch) {
        throw new Error("No se pudo crear el partido");
      }

      if (data.hasRentedGoalkeepers && data.rentedGoalkeepersCount > 0) {
        await registerRentedGoalkeepers(newMatch.id, data.rentedGoalkeepersCount);
      }

      const fullMatchData = {
        ...data,
        id: newMatch.id,
        created_at: newMatch.created_at,
      };

      setCreatedMatch(fullMatchData);

      try {
        const storedMatches = sessionStorage.getItem("matches");
        const matches = storedMatches ? JSON.parse(storedMatches) : [];
        matches.push({
          ...data,
          id: newMatch.id,
          created_at: newMatch.created_at,
        });
        sessionStorage.setItem("matches", JSON.stringify(matches));
      } catch {
        // ignore storage errors
      }

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear el partido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8 mt-4">
          <div className="mb-2 flex justify-center">
            <BrandLogo width={220} height={96} className="h-auto w-[160px] sm:w-[200px]" />
          </div>
          <p className="text-muted-foreground">
            Crea partidos de fútbol y comparte con tus amigos
          </p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg" role="alert">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {!user && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <p className="text-yellow-600 text-sm">
              Debes <a href="/auth?mode=signin" className="underline hover:text-yellow-700">iniciar sesión</a> para crear un partido.
            </p>
          </div>
        )}

        {createdMatch ? (
          <div className="card p-6 bg-card">
            <h2 className="text-2xl font-bold mb-6 text-center text-card-foreground">¡Partido Creado!</h2>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-muted-foreground">Lugar:</span>
                <span className="text-card-foreground font-medium">{createdMatch.location}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-muted-foreground">Fecha:</span>
                <span className="text-card-foreground font-medium">{createdMatch.date}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-muted-foreground">Hora:</span>
                <span className="text-card-foreground font-medium">{createdMatch.time}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-muted-foreground">Formato:</span>
                <span className="text-card-foreground font-medium tabular-nums">{createdMatch.playersPerTeam} vs {createdMatch.playersPerTeam}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border pb-3">
                <span className="font-medium text-muted-foreground">Valor de la cancha:</span>
                <span className="text-card-foreground font-medium tabular-nums">{formatCurrency(createdMatch.fieldCost)}</span>
              </div>
              <div className="flex justify-between items-center pt-3">
                <span className="font-medium text-muted-foreground">Aporte por jugador:</span>
                <span className="font-bold text-primary text-xl tabular-nums">
                  {formatCurrency(createdMatch.costPerPlayer)}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => router.push(`/match/${createdMatch.id}`)}
                className="w-full btn btn-primary"
              >
                Ver Detalles del Partido
              </button>

              <ShareLink matchId={createdMatch.id} />
            </div>
          </div>
        ) : (
          <MatchFormSteps
            onMatchCreate={handleMatchCreate}
            disabled={loading}
            submitLabel={submitLabel}
            submitButtonType={requiresLogin ? "button" : "submit"}
            onSubmitButtonClick={requiresLogin ? () => router.push("/auth?mode=signin") : undefined}
          />
        )}
      </div>
    </div>
  );
}
