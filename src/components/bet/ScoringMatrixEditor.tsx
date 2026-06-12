"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";

interface ScoringMatrixEditorProps {
  config: Record<string, number>;
  onConfigChange: (key: string, value: number) => void;
  onResetDefault: () => void;
  defaultConfig: Record<string, number>;
}

const RULE_GROUPS = [
  {
    key: "matches",
    label: "Partidos",
    rules: [
      { key: "pts_winner_selection", label: "Ganador / empate correcto" },
      { key: "pts_exact_score", label: "Marcador exacto" },
      { key: "pts_team_goals", label: "Goles de un equipo correctos" },
      { key: "pts_goal_difference", label: "Diferencia de gol correcta" },
    ],
  },
  {
    key: "phases",
    label: "Fases",
    rules: [
      { key: "pts_qualified_round_2", label: "Clasificado a segunda ronda" },
    ],
  },
  {
    key: "prizes",
    label: "Premios",
    rules: [
      { key: "pts_champion", label: "Campeón" },
      { key: "pts_subchampion", label: "Subcampeón" },
      { key: "pts_third_place", label: "Tercer puesto" },
    ],
  },
  {
    key: "lock",
    label: "Cierre",
    rules: [
      { key: "lock_minutes", label: "Cierre antes del partido (minutos)", min: 1, max: 60 },
    ],
  },
];

export function ScoringMatrixEditor({
  config,
  onConfigChange,
  onResetDefault,
  defaultConfig,
}: ScoringMatrixEditorProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    matches: true,
    phases: true,
    prizes: false,
    lock: true,
  });

  const toggleGroup = (key: string) => {
    setExpandedGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const hasChanges = Object.keys(config).some(
    (key) => config[key] !== defaultConfig[key]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-50">Reglas claras, pique limpio</h2>
          <p className="mt-1 text-sm text-slate-400">
            Usa el modo default o tunea los puntos antes de invitar.
          </p>
        </div>
        {hasChanges && (
          <button
            type="button"
            onClick={onResetDefault}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-[#22C55E]/50 hover:text-[#22C55E] focus-visible:ring-2 focus-visible:ring-[#22C55E]/70"
          >
            <RotateCcw className="size-3" />
            Restaurar default
          </button>
        )}
      </div>

      <div className="space-y-2">
        {RULE_GROUPS.map((group) => (
          <div
            key={group.key}
            className="rounded-lg border border-slate-800 bg-slate-900/70 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleGroup(group.key)}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-300 hover:text-slate-50 transition-colors"
            >
              <span>{group.label}</span>
              {expandedGroups[group.key] ? (
                <ChevronDown className="size-4 text-slate-500" />
              ) : (
                <ChevronRight className="size-4 text-slate-500" />
              )}
            </button>

            {expandedGroups[group.key] && (
              <div className="divide-y divide-slate-800/50 border-t border-slate-800/50">
                {group.rules.map((rule) => {
                  const currentValue = config[rule.key] ?? 0;
                  const defaultValue = defaultConfig[rule.key] ?? 0;
                  const isTuned = currentValue !== defaultValue;
                  const min = "min" in rule ? (rule as { min: number }).min : 0;
                  const max = "max" in rule ? (rule as { max: number }).max : 100;

                  return (
                    <div
                      key={rule.key}
                      className="flex items-center justify-between gap-4 px-4 py-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm text-slate-400 truncate">
                          {rule.label}
                        </span>
                        {isTuned && (
                          <span className="shrink-0 rounded-full bg-[#22C55E]/15 px-2 py-0.5 text-[10px] font-medium text-[#22C55E]">
                            Tuneado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() =>
                            onConfigChange(rule.key, Math.max(min, currentValue - 1))
                          }
                          className="flex size-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-slate-400 transition-colors hover:border-[#22C55E]/50 hover:text-[#22C55E] disabled:opacity-50"
                          disabled={currentValue <= min}
                          aria-label={`Reducir ${rule.label}`}
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={currentValue}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            if (!isNaN(val)) {
                              onConfigChange(
                                rule.key,
                                Math.max(min, Math.min(max, val))
                              );
                            }
                          }}
                          className={cn(
                            "w-14 rounded-lg border bg-slate-950/70 px-2 py-1.5 text-center text-sm text-slate-50",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/70",
                            "[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                            isTuned
                              ? "border-[#22C55E]/40"
                              : "border-slate-700"
                          )}
                          min={min}
                          max={max}
                          aria-label={rule.label}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            onConfigChange(rule.key, Math.min(max, currentValue + 1))
                          }
                          className="flex size-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-950/70 text-slate-400 transition-colors hover:border-[#22C55E]/50 hover:text-[#22C55E] disabled:opacity-50"
                          disabled={currentValue >= max}
                          aria-label={`Aumentar ${rule.label}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
