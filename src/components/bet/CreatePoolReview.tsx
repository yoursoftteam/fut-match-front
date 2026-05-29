"use client";

import { Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreatePoolReviewProps {
  name: string;
  description?: string;
  visibility: "public" | "private";
  config: Record<string, number>;
  status: "idle" | "submitting" | "optimistic_success" | "confirmed" | "failed";
  errorMessage?: string;
  onCreatePool: () => void;
}

const RULE_LABELS: Record<string, string> = {
  lock_minutes: "Cierre antes del partido",
  pts_winner_selection: "Ganador / empate correcto",
  pts_exact_score: "Marcador exacto",
  pts_team_goals: "Goles de un equipo correctos",
  pts_goal_difference: "Diferencia de gol correcta",
  pts_qualified_round_2: "Clasificado a segunda ronda",
  pts_champion: "Campeón",
  pts_subchampion: "Subcampeón",
  pts_third_place: "Tercer puesto",
  pts_top_scorer: "Goleador",
  pts_top_assistant: "Mayor asistidor",
  pts_mvp: "MVP",
  pts_best_goalkeeper: "Mejor arquero",
  pts_least_conceded: "Valla menos vencida",
};

export function CreatePoolReview({
  name,
  description,
  visibility,
  config,
  status,
  errorMessage,
  onCreatePool,
}: CreatePoolReviewProps) {
  const showOptimistic = status === "optimistic_success" || status === "confirmed";
  const isLoading = status === "submitting";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-50">Confirmación</h2>
        <p className="mt-1 text-sm text-slate-400">
          Revisa los datos antes de crear la polla.
        </p>
      </div>

      <div className="space-y-4 rounded-lg border border-slate-800 bg-slate-900/70 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-500">Nombre</p>
            <p className="text-sm font-medium text-slate-50">{name}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            {visibility === "public" ? (
              <>
                <Globe className="size-3" />
                Abierta al barrio
              </>
            ) : (
              <>
                <Lock className="size-3" />
                Solo con código
              </>
            )}
          </div>
        </div>

        {description && (
          <div className="border-t border-slate-800 pt-4">
            <p className="mb-1 text-xs text-slate-500">Descripción</p>
            <p className="text-sm text-slate-400 whitespace-pre-wrap">{description}</p>
          </div>
        )}

        <div className="border-t border-slate-800 pt-4">
          <p className="mb-2 text-xs font-medium text-slate-500">Reglas de juego</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {Object.entries(config).map(([key, value]) => {
              const label = RULE_LABELS[key];
              if (!label) return null;
              return (
                <div key={key} className="flex justify-between text-sm">
                  <span className="text-slate-400 truncate pr-2">{label}</span>
                  <span className="text-slate-50 font-medium shrink-0">{value}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {status === "failed" && errorMessage && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300" role="alert">
          {errorMessage}
        </div>
      )}

      <button
        type="button"
        onClick={onCreatePool}
        disabled={isLoading}
        className={cn(
          "w-full rounded-lg px-4 py-3 text-sm font-semibold transition-all",
          "bg-[#22C55E] text-slate-950 hover:bg-emerald-400",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/70",
          "disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        {isLoading ? "Creando la reta..." : "Crear y soltar link"}
      </button>

      {showOptimistic && (
        <div className="rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 px-4 py-3 text-sm text-[#22C55E]">
          La polla está naciendo. Link en camino.
        </div>
      )}
    </div>
  );
}
