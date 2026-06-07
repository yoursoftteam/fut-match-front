"use client";

import { CheckCircle2, Clock3, Goal, Trophy } from "lucide-react";
import { calculateExactScorePoints } from "@/lib/bet-scoring";
import { PREDICTION_COMPETITION_CONFIG } from "@/types/bet";

const RULES = [
  {
    label: "Ganador o empate",
    value: PREDICTION_COMPETITION_CONFIG.pts_winner_selection,
    helper: "Acertar el resultado base del partido.",
    Icon: Trophy,
  },
  {
    label: "Goles por equipo",
    value: PREDICTION_COMPETITION_CONFIG.pts_team_goals,
    helper: "Se suma por cada equipo con goles correctos.",
    Icon: Goal,
  },
  {
    label: "Diferencia de gol",
    value: PREDICTION_COMPETITION_CONFIG.pts_goal_difference,
    helper: "La resta entre goles local y visitante coincide.",
    Icon: CheckCircle2,
  },
  {
    label: "Cierre de picks",
    value: PREDICTION_COMPETITION_CONFIG.lock_minutes,
    suffix: "min",
    helper: "Antes del kickoff de cada partido.",
    Icon: Clock3,
  },
];

export function PredictionScoringSummary() {
  const exactScoreTotal = calculateExactScorePoints(PREDICTION_COMPETITION_CONFIG);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Solo marcadores</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta modalidad no pide campeon, subcampeon ni premios. Todo se gana partido a partido.
        </p>
      </div>

      <div className="rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 p-4">
        <p className="text-xs font-medium uppercase text-[#22C55E]">
          Marcador exacto
        </p>
        <div className="mt-2 flex items-end gap-2">
          <span className="font-mono text-4xl font-bold tabular-nums text-foreground">
            {exactScoreTotal}
          </span>
          <span className="pb-1 text-sm font-medium text-muted-foreground">pts</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          5 por resultado, 2 por cada equipo con goles correctos y 1 por diferencia.
        </p>
      </div>

      <div className="space-y-2">
        {RULES.map(({ label, value, suffix = "pts", helper, Icon }) => (
          <div
            key={label}
            className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3"
          >
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-[#22C55E]">
              <Icon className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground">{helper}</p>
            </div>
            <div className="font-mono text-sm font-bold tabular-nums text-foreground">
              {value} {suffix}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
