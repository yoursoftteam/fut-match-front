"use client";

import { useState, useEffect } from "react";
import { useMatchDetailsContext } from "@/contexts/MatchDetailsContext";
import { useMatchPricing, MAX_SUBSTITUTE_SLOTS } from "@/hooks/useMatchPricing";
import { useMatchEditing } from "@/hooks/useMatchEditing";
import { useFrecuentes } from "@/hooks/useFrecuentes";
import { formatCurrency } from "@/lib/currency";
import SaveFrecuenteCard from "@/components/SaveFrecuenteCard";

interface MatchInfoSidebarProps {
  onOpenTeamBuilder?: () => void;
}

// TODO: After ALTER TABLE migration, read pricing from matchData instead of storedMatchPricing
export function MatchInfoSidebar({ onOpenTeamBuilder }: MatchInfoSidebarProps) {
  const { matchData, isCreator, storedMatchPricing, registrations } = useMatchDetailsContext();
  const { formattedDate, formattedTime, tituloStatus, colorStatus, titulares, suplentes, registeredPercent } = useMatchPricing();
  const { showForm, openForm, message } = useMatchEditing();
  const { templates, getTemplateByMatchId, deleteTemplateByMatchId, loading: loadingFrec } = useFrecuentes();
  const [showSaveFrecuente, setShowSaveFrecuente] = useState(false);
  const [existingTemplateId, setExistingTemplateId] = useState<string | null>(null);

  useEffect(() => {
    if (!matchData?.id) return;

    const matchLocation = matchData.location;
    const matchPlayersPerTeam = Math.round(matchData.max_players / 2);

    // 1) Direct match by match_id (new templates)
    const byMatchId = templates.find((t) => t.match_id === matchData.id);
    if (byMatchId) {
      setExistingTemplateId(byMatchId.id);
      return;
    }

    // 2) Content match for old templates saved before match_id existed
    const byContent = templates.find(
      (t) =>
        t.location === matchLocation &&
        t.players_per_team === matchPlayersPerTeam,
    );
    if (byContent) {
      setExistingTemplateId(byContent.id);
      return;
    }

    // 3) DB fallback (template not yet in local state)
    getTemplateByMatchId(matchData.id).then((tmpl) => {
      setExistingTemplateId(tmpl?.id ?? null);
    });
  }, [matchData?.id, getTemplateByMatchId, templates]);

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

            {existingTemplateId ? (
              <button
                type="button"
                disabled={loadingFrec}
                onClick={async () => {
                  const ok = await deleteTemplateByMatchId(matchData.id)
                  if (ok) setExistingTemplateId(null)
                }}
                className="rounded border border-red-400/30 text-red-400 px-4 py-2 text-sm font-semibold transition hover:bg-red-500/10"
              >
                {loadingFrec ? "Eliminando..." : "Remover de frecuentes"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowSaveFrecuente(!showSaveFrecuente)}
                className="rounded border border-red-400/30 text-red-400 px-4 py-2 text-sm font-semibold transition hover:bg-red-500/10"
              >
                {showSaveFrecuente ? "Cancelar" : "Guardar como frecuente"}
              </button>
            )}
          </div>
        )}

        {isCreator && !existingTemplateId && showSaveFrecuente && (
          <div className="mt-4">
            <SaveFrecuenteCard
              location={matchData.location}
              defaultName={`Partido en ${matchData.location}`}
              playersPerTeam={storedMatchPricing?.playersPerTeam ?? 5}
              hasRentedGoalkeepers={storedMatchPricing?.hasRentedGoalkeepers}
              rentedGoalkeepersCount={storedMatchPricing?.rentedGoalkeepersCount}
              fieldCost={storedMatchPricing?.fieldCost ?? 0}
              rentalCost={storedMatchPricing?.rentalCost ?? 0}
              time={formattedTime}
              matchId={matchData.id}
              participants={registrations.map((r) => ({ name: r.name, is_goalkeeper: r.is_goalkeeper }))}
              onSaved={() => setShowSaveFrecuente(false)}
            />
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
