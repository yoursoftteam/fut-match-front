'use client'

import { CheckCircle2, Clock3, Goal, Trophy } from 'lucide-react'
import { calculateExactScorePoints } from '@/lib/bet-scoring'

const RULE_LABELS: Record<string, string> = {
  lock_minutes: 'Cierre antes del partido',
  pts_winner_selection: 'Ganador / empate correcto',
  pts_exact_score: 'Bonus marcador exacto',
  pts_team_goals: 'Goles de un equipo correctos',
  pts_goal_difference: 'Diferencia de gol correcta',
  pts_qualified_round_2: 'Clasificado a segunda ronda',
  pts_champion: 'Campeón',
  pts_subchampion: 'Subcampeón',
  pts_third_place: 'Tercer puesto',
}

const PREDICTION_RULES = [
  { key: 'pts_winner_selection', label: 'Ganador o empate', helper: 'Acertar el resultado base del partido.', Icon: Trophy },
  { key: 'pts_team_goals', label: 'Goles por equipo', helper: 'Se suma por cada equipo con goles correctos.', Icon: Goal },
  { key: 'pts_goal_difference', label: 'Diferencia de gol', helper: 'La resta entre goles local y visitante coincide.', Icon: CheckCircle2 },
  { key: 'lock_minutes', label: 'Cierre de picks', helper: 'Antes del kickoff de cada partido.', Icon: Clock3 },
]

const ALL_RULES_ORDER = [
  'lock_minutes',
  'pts_winner_selection',
  'pts_exact_score',
  'pts_team_goals',
  'pts_goal_difference',
  'pts_qualified_round_2',
  'pts_champion',
  'pts_subchampion',
  'pts_third_place',
]

interface PoolRulesProps {
  competitionType: string
  config: Record<string, unknown>
}

export function PoolRules({ competitionType, config }: PoolRulesProps) {
  const cfg = config as Record<string, number>
  const isPredictions = competitionType === 'predictions'

  if (isPredictions) {
    const exactScoreTotal = calculateExactScorePoints({
      pts_winner_selection: cfg.pts_winner_selection ?? 5,
      pts_exact_score: cfg.pts_exact_score ?? 0,
      pts_team_goals: cfg.pts_team_goals ?? 2,
      pts_goal_difference: cfg.pts_goal_difference ?? 1,
    })

    return (
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Esta modalidad no pide campeón, subcampeón ni premios. Todo se gana partido a partido.
        </p>

        <div className="rounded-lg border border-[#22C55E]/30 bg-[#22C55E]/10 p-4">
          <p className="text-xs font-medium uppercase text-[#22C55E]">Marcador exacto</p>
          <div className="mt-2 flex items-end gap-2">
            <span className="font-mono text-4xl font-bold tabular-nums text-foreground">{exactScoreTotal}</span>
            <span className="pb-1 text-sm font-medium text-muted-foreground">pts</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {cfg.pts_winner_selection ?? 5} por resultado, {cfg.pts_team_goals ?? 2} por cada equipo con goles correctos y {cfg.pts_goal_difference ?? 1} por diferencia.
          </p>
        </div>

        <div className="space-y-2">
          {PREDICTION_RULES.map(({ key, label, helper, Icon }) => (
            <div key={key} className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 p-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-card text-[#22C55E]">
                <Icon className="size-4" aria-hidden="true" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{helper}</p>
              </div>
              <div className="font-mono text-sm font-bold tabular-nums text-foreground">
                {cfg[key] ?? 0} {key === 'lock_minutes' ? 'min' : 'pts'}
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground">
          Los marcadores no tienen en cuenta tiempo extra, solo resultado oficial de los 90 minutos del partido.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {ALL_RULES_ORDER.map((key) => {
          const label = RULE_LABELS[key]
          const value = cfg[key]
          if (value === undefined) return null
          const suffix = key === 'lock_minutes' ? 'min' : 'pts'
          return (
            <div key={key} className="flex justify-between text-sm">
              <span className="truncate pr-2 text-muted-foreground">{label}</span>
              <span className="shrink-0 font-medium text-foreground">{value} {suffix}</span>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-muted-foreground">
        Los marcadores no tienen en cuenta tiempo extra, solo resultado oficial de los 90 minutos del partido.
      </p>
    </div>
  )
}
