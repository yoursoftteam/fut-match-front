"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMatchDetailsContext } from "@/contexts/MatchDetailsContext";
import { useMatchPricing, MAX_SUBSTITUTE_SLOTS } from "@/hooks/useMatchPricing";
import { useMatchEditing } from "@/hooks/useMatchEditing";
import type { UseMatchEditingReturn } from "@/hooks/useMatchEditing";
import { useMatches } from "@/hooks/useMatches";
import { useFrecuentes } from "@/hooks/useFrecuentes";
import { formatCurrency } from "@/lib/currency";
import SaveFrecuenteCard from "@/components/SaveFrecuenteCard";
import ShareLink from "@/components/ShareLink";

interface MatchInfoSidebarProps {
  onOpenTeamBuilder?: () => void;
  editing?: UseMatchEditingReturn;
}

export function MatchInfoSidebar({ onOpenTeamBuilder, editing }: MatchInfoSidebarProps) {
  const { matchData, isCreator, registrations } = useMatchDetailsContext();
  const { formattedDate, formattedTime, tituloStatus, colorStatus, titulares, suplentes, registeredPercent } = useMatchPricing();
  const router = useRouter();
  const { deleteMatch } = useMatches();
  const fallbackEditing = useMatchEditing();
  const { showForm, openForm, message } = editing ?? fallbackEditing;
  const { templates, getTemplateByMatchId, deleteTemplateByMatchId, loading: loadingFrec } = useFrecuentes();
  const [showSaveFrecuente, setShowSaveFrecuente] = useState(false);
  const [existingTemplateId, setExistingTemplateId] = useState<string | null>(null);
  const [deletingMatch, setDeletingMatch] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!matchData?.id) return;

    const matchLocation = matchData.location;
    const matchPlayersPerTeam = Math.round(matchData.max_players / 2);

    const byMatchId = templates.find((t) => t.match_id === matchData.id);
    if (byMatchId) {
      setExistingTemplateId(byMatchId.id);
      return;
    }

    const byContent = templates.find(
      (t) =>
        t.location === matchLocation &&
        t.players_per_team === matchPlayersPerTeam,
    );
    if (byContent) {
      setExistingTemplateId(byContent.id);
      return;
    }

    getTemplateByMatchId(matchData.id).then((tmpl) => {
      setExistingTemplateId(tmpl?.id ?? null);
    });
  }, [matchData?.id, getTemplateByMatchId, templates]);

  if (!matchData) return null;

  const totalPlayers = matchData.max_players;
  const costPerPlayer = totalPlayers > 0
    ? Math.ceil((matchData.field_cost + matchData.rental_cost) / totalPlayers)
    : 0;

  const handleDeleteMatch = async () => {
    if (!confirm("¿Eliminar este partido? Esta acción no se puede deshacer.")) return;

    setDeletingMatch(true);
    setDeleteError(null);
    try {
      const result = await deleteMatch(matchData.id);
      if (result.error) {
        throw result.error;
      }

      router.push("/dashboard");
    } catch {
      setDeleteError("No se pudo eliminar el partido. Intenta nuevamente.");
    } finally {
      setDeletingMatch(false);
    }
  };

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

        {matchData.field_cost > 0 && (
          <div className="mt-4 space-y-2 rounded border border-border bg-muted p-3 text-sm text-foreground">
            <p><span className="text-muted-foreground">Cancha:</span> {formatCurrency(matchData.field_cost)}</p>
            {matchData.has_rented_goalkeepers && matchData.rental_cost > 0 ? (
              <p><span className="text-muted-foreground">Alquiler arqueros ({matchData.rented_goalkeepers_count}):</span> {formatCurrency(matchData.rental_cost)}</p>
            ) : null}
            <p><span className="text-muted-foreground">Por jugador:</span> {formatCurrency(costPerPlayer)}</p>
            <p><span className="text-muted-foreground">Formato:</span> {matchData.players_per_team} vs {matchData.players_per_team}</p>
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

            <button
              type="button"
              onClick={handleDeleteMatch}
              disabled={deletingMatch}
              className="rounded border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {deletingMatch ? "Eliminando..." : "Eliminar partido"}
            </button>
          </div>
        )}

        {isCreator && deleteError && (
          <p className="mt-3 text-sm text-red-400">{deleteError}</p>
        )}

        {isCreator && !existingTemplateId && showSaveFrecuente && (
          <div className="mt-4">
            <SaveFrecuenteCard
              location={matchData.location}
              defaultName={`Partido en ${matchData.location}`}
              playersPerTeam={matchData.players_per_team}
              hasRentedGoalkeepers={matchData.has_rented_goalkeepers}
              rentedGoalkeepersCount={matchData.rented_goalkeepers_count}
              fieldCost={matchData.field_cost}
              rentalCost={matchData.rental_cost}
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

        {isCreator && matchData && (
          <div className="mt-4">
            <ShareLink matchId={matchData.id} />
          </div>
        )}
      </div>
    </aside>
  );
}
