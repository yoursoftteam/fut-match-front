"use client";

import { Globe, Lock } from "lucide-react";
import { calculateExactScorePoints } from "@/lib/bet-scoring";
import { cn } from "@/lib/utils";
import { PoolCompetitionType } from "@/types/bet";

interface CreatePoolReviewProps {
  name: string;
  description?: string;
  visibility: "public" | "private";
  config: Record<string, number>;
  status: "idle" | "submitting" | "optimistic_success" | "confirmed" | "failed";
  errorMessage?: string;
  competitionType?: PoolCompetitionType;
  onCreatePool: () => void;
}

const RULE_LABELS: Record<string, string> = {
  lock_minutes: "Cierre antes del partido",
  pts_winner_selection: "Ganador / empate correcto",
  pts_exact_score: "Bonus marcador exacto",
  pts_team_goals: "Goles de un equipo correctos",
  pts_goal_difference: "Diferencia de gol correcta",
  pts_qualified_round_2: "Clasificado a segunda ronda",
  pts_champion: "Campeon",
  pts_subchampion: "Subcampeon",
  pts_third_place: "Tercer puesto",
  pts_top_scorer: "Goleador",
  pts_top_assistant: "Mayor asistidor",
  pts_mvp: "MVP",
  pts_best_goalkeeper: "Mejor arquero",
  pts_least_conceded: "Valla menos vencida",
};

function getPredictionRules(config: Record<string, number>) {
  const exactScore = calculateExactScorePoints({
    pts_winner_selection: config.pts_winner_selection ?? 0,
    pts_exact_score: config.pts_exact_score ?? 0,
    pts_team_goals: config.pts_team_goals ?? 0,
    pts_goal_difference: config.pts_goal_difference ?? 0,
  });

  return [
    ["Ganador / empate correcto", `${config.pts_winner_selection ?? 0}`],
    ["Goles correctos por equipo", `${config.pts_team_goals ?? 0}`],
    ["Diferencia de gol correcta", `${config.pts_goal_difference ?? 0}`],
    ["Marcador exacto", `${exactScore}`],
    ["Cierre antes del partido", `${config.lock_minutes ?? 10} min`],
  ];
}

export function CreatePoolReview({
  name,
  description,
  visibility,
  config,
  status,
  errorMessage,
  competitionType = "pool",
  onCreatePool,
}: CreatePoolReviewProps) {
  const showOptimistic = status === "optimistic_success" || status === "confirmed";
  const isLoading = status === "submitting";
  const isPredictions = competitionType === "predictions";
  const rules = isPredictions ? getPredictionRules(config) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-50">Confirmacion</h2>
        <p className="mt-1 text-sm text-slate-400">
          Revisa los datos antes de crear {isPredictions ? "la competencia" : "la polla"}.
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
                Solo con codigo
              </>
            )}
          </div>
        </div>

        {description && (
          <div className="border-t border-slate-800 pt-4">
            <p className="mb-1 text-xs text-slate-500">Descripcion</p>
            <p className="whitespace-pre-wrap text-sm text-slate-400">{description}</p>
          </div>
        )}

        <div className="border-t border-slate-800 pt-4">
          <p className="mb-2 text-xs font-medium text-slate-500">Reglas de juego</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            {rules
              ? rules.map(([label, value]) => (
                  <div key={label} className="flex justify-between text-sm">
                    <span className="truncate pr-2 text-slate-400">{label}</span>
                    <span className="shrink-0 font-medium text-slate-50">{value}</span>
                  </div>
                ))
              : Object.entries(config).map(([key, value]) => {
                  const label = RULE_LABELS[key];
                  if (!label) return null;
                  return (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="truncate pr-2 text-slate-400">{label}</span>
                      <span className="shrink-0 font-medium text-slate-50">{value}</span>
                    </div>
                  );
                })}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Los marcadores no tienen en cuenta tiempo extra, solo resultado oficial de los 90 minutos del partido.
          </p>
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
          {isPredictions ? "La competencia esta lista. Link en camino." : "La polla esta lista. Link en camino."}
        </div>
      )}
    </div>
  );
}
