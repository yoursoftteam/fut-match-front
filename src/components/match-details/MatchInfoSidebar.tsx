"use client";

import { useMatchDetailsContext } from "@/contexts/MatchDetailsContext";
import { useMatchPricing, MAX_SUBSTITUTE_SLOTS } from "@/hooks/useMatchPricing";
import { useMatchEditing } from "@/hooks/useMatchEditing";
import { formatCurrency } from "@/lib/currency";

interface MatchInfoSidebarProps {
  onOpenTeamBuilder?: () => void;
}

export function MatchInfoSidebar({ onOpenTeamBuilder }: MatchInfoSidebarProps) {
  const { matchData, isCreator, storedMatchPricing } = useMatchDetailsContext();
  const { formattedDate, formattedTime, tituloStatus, colorStatus, titulares, suplentes, registeredPercent } = useMatchPricing();
  const { showForm, openForm, message } = useMatchEditing();

  if (!matchData) return null;

  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
      <div className="card match-card rounded-2xl border border-border/80 bg-card p-6 shadow-lg">
        <h1 className="text-2xl font-bold text-foreground">{matchData.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Fecha: {formattedDate}</p>
        <p className="mt-1 text-sm text-muted-foreground">Hora: {formattedTime}</p>
        <p className="mt-1 text-sm text-muted-foreground">Ubicación: {matchData.location}</p>
        <p className="mt-3 text-sm text-muted-foreground">
          Titulares: {titulares.length}/{matchData.max_players} ({registeredPercent}% completo)
        </p>
        {suplentes.length > 0 && (
          <p className="mt-1 text-sm text-muted-foreground">Suplentes: {suplentes.length}/{MAX_SUBSTITUTE_SLOTS}</p>
        )}

        {storedMatchPricing && (
          <div className="mt-4 space-y-2 rounded border border-border bg-muted p-3 text-sm text-foreground">
            <p><span className="text-muted-foreground">Cancha:</span> {formatCurrency(storedMatchPricing.fieldCost)}</p>
            {storedMatchPricing.hasRentedGoalkeepers && storedMatchPricing.rentalCost ? (
              <p><span className="text-muted-foreground">Alquiler arqueros ({storedMatchPricing.rentedGoalkeepersCount}):</span> {formatCurrency(storedMatchPricing.rentalCost)}</p>
            ) : null}
            <p><span className="text-muted-foreground">Por jugador:</span> {formatCurrency(storedMatchPricing.costPerPlayer)}</p>
            <p><span className="text-muted-foreground">Formato:</span> {storedMatchPricing.playersPerTeam} vs {storedMatchPricing.playersPerTeam}</p>
          </div>
        )}

        <p className={`mt-3 text-sm ${colorStatus}`}>{tituloStatus}</p>

        {isCreator && !showForm && (
          <div className="mt-4 flex flex-col gap-2">
            <button
              type="button"
              onClick={openForm}
              className="btn-primary-fm rounded px-4 py-2 text-sm font-semibold transition"
            >
              Editar partido
            </button>
            <button
              type="button"
              onClick={onOpenTeamBuilder}
              className="rounded border border-blue-600 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Armar equipos
            </button>
          </div>
        )}

        {isCreator && !showForm && message && (
          <p className={`mt-3 text-sm ${message.includes("correctamente") ? "text-green-400" : "text-red-400"}`}>
            {message}
          </p>
        )}
      </div>
    </aside>
  );
}