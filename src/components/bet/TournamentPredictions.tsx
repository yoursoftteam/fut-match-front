'use client'

import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  ChevronDown,
  Globe,
  Loader2,
  Lock,
  Medal,
  Shield,
  Star,
  Trophy,
  Users,
} from 'lucide-react'
import { TournamentPredictionsCompareModal } from './TournamentPredictionsCompareModal'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useBetTeams } from '@/hooks/useBetTeams'
import { useTournamentPredictions } from '@/hooks/useTournamentPredictions'
import { cn } from '@/lib/utils'
import { TournamentCategory } from '@/types/bet'

const CATEGORY_META: Record<TournamentCategory, {
  label: string
  Icon: typeof Trophy
  description: string
  color: string
  podiumY: string
  podiumWidth: string
  borderColor: string
}> = {
  champion: {
    label: 'Campeón',
    Icon: Trophy,
    description: '¿Quién levantará la copa?',
    color: 'text-amber-400',
    podiumY: '-translate-y-4',
    podiumWidth: 'w-full sm:w-72',
    borderColor: 'border-amber-500/40',
  },
  subchampion: {
    label: 'Subcampeón',
    Icon: Medal,
    description: 'Equipo que pierde la final',
    color: 'text-slate-300',
    podiumY: '-translate-y-2',
    podiumWidth: 'w-full sm:w-56',
    borderColor: 'border-slate-500/30',
  },
  third_place: {
    label: 'Tercer puesto',
    Icon: Shield,
    description: 'Ganador del 3er puesto',
    color: 'text-orange-400',
    podiumY: 'translate-y-0',
    podiumWidth: 'w-full sm:w-56',
    borderColor: 'border-orange-500/30',
  },
}

const PODIUM_ORDER: TournamentCategory[] = ['subchampion', 'champion', 'third_place']

interface TournamentPredictionsProps {
  poolId: string | null
}

export function TournamentPredictions({ poolId }: TournamentPredictionsProps) {
  const { teams, loading: teamsLoading } = useBetTeams()
  const {
    loading: predsLoading,
    saving,
    error,
    locked,
    predictions,
    fetchPredictions,
    savePrediction,
    getPrediction,
  } = useTournamentPredictions()
  const [savingCategory, setSavingCategory] = useState<TournamentCategory | null>(null)
  const [savedCategory, setSavedCategory] = useState<TournamentCategory | null>(null)
  const [collapsed, setCollapsed] = useState(false)
  const [compareCategory, setCompareCategory] = useState<TournamentCategory | null>(null)

  useEffect(() => {
    if (!poolId) return
    fetchPredictions(poolId)
  }, [poolId, fetchPredictions])

  if (!poolId) return null

  const handleSelect = async (category: TournamentCategory, teamId: string) => {
    setSavingCategory(category)
    try {
      await savePrediction(poolId, category, teamId)
      setSavedCategory(category)
      setTimeout(() => setSavedCategory(null), 2000)
    } finally {
      setSavingCategory(null)
    }
  }

  const loading = teamsLoading || predsLoading

  return (
    <section
      aria-labelledby="tournament-predictions-heading"
      className="mb-6 rounded-lg border border-border bg-card"
    >
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="flex w-full items-center gap-3 border-b border-border bg-muted px-4 py-3 text-left transition-colors hover:bg-muted"
        aria-expanded={!collapsed}
        aria-controls="tournament-predictions-content"
      >
        <Globe className="size-5 text-emerald-400" aria-hidden="true" />
        <h2 id="tournament-predictions-heading" className="text-sm font-semibold text-foreground">
          Predicciones de torneo
        </h2>
        {saving && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" aria-hidden="true" />
            Guardando…
          </span>
        )}
        <ChevronDown
          className={cn(
            'ml-auto size-4 text-muted-foreground transition-transform duration-200',
            collapsed && '-rotate-90'
          )}
          aria-hidden="true"
        />
      </button>

      {!collapsed && (
        <div id="tournament-predictions-content">
          {error && (
            <div
              role="alert"
              className="mx-4 mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {locked && (
            <div className="mx-4 mt-3 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-300">
              <Lock className="size-3.5 shrink-0" aria-hidden="true" />
              <span>Predicciones bloqueadas — el torneo ya comenzó</span>
            </div>
          )}

          <TournamentPredictionsCompareModal
            poolId={poolId}
            category={compareCategory}
            open={compareCategory !== null}
            onClose={() => setCompareCategory(null)}
          />

          <div className="px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin text-emerald-400" />
            Cargando…
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:items-end">
            {PODIUM_ORDER.map((key) => {
              const meta = CATEGORY_META[key]
              const { label, Icon, description, color, podiumY, podiumWidth, borderColor } = meta
              const current = getPrediction(key)

              return (
                <div
                  key={key}
                  className={cn(
                    'flex flex-col rounded-lg border p-4 transition-all',
                    podiumY,
                    podiumWidth,
                      current
                        ? `${borderColor} bg-emerald-500/5`
                        : 'border-border bg-muted/50'
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <Icon className={cn('size-4', color)} aria-hidden="true" />
                    <span className="text-sm font-semibold text-foreground">
                      {label}
                    </span>
                    {savedCategory === key && (
                      <CheckCircle2 className="ml-auto size-3.5 text-emerald-400" />
                    )}
                  </div>
                  <p className="mb-3 text-[0.6875rem] text-muted-foreground">
                    {description}
                  </p>

                  <Select
                    value={current?.team_id ?? ''}
                    onValueChange={(v) => v && handleSelect(key, v)}
                    disabled={savingCategory === key || locked}
                  >
                    <SelectTrigger
                      className={cn(
                        'w-full border text-sm',
                        current
                          ? 'border-emerald-500/30 bg-card'
                          : 'border-border bg-card'
                      )}
                      aria-label={`Seleccionar ${label.toLowerCase()}`}
                    >
                      <SelectValue placeholder="Seleccionar…">
                        {current?.team && (
                          <span className="flex items-center gap-2">
                            {current.team.flag_svg_url ? (
                              <img
                                src={current.team.flag_svg_url}
                                alt=""
                                className="size-5 rounded-sm object-cover"
                              />
                            ) : (
                              <span className="size-5 rounded-sm border border-border bg-muted" />
                            )}
                            <span>{current.team.name}</span>
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {teams
                        .filter((t) => {
                          const pickedElsewhere = predictions
                            .filter((p) => p.category !== key)
                            .map((p) => p.team_id)
                          return !pickedElsewhere.includes(t.id)
                        })
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.flag_svg_url ? (
                              <img
                                src={team.flag_svg_url}
                                alt=""
                                className="size-5 rounded-sm object-cover"
                              />
                            ) : (
                              <span className="size-5 rounded-sm border border-border bg-muted" />
                            )}
                            {team.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  {current?.team && (
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-300">
                      <Star className="size-3" aria-hidden="true" />
                      {current.team.name}
                    </p>
                  )}

                  {locked && (
                    <button
                      type="button"
                      onClick={() => setCompareCategory(key)}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-emerald-500/15 px-3 py-2 text-xs font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/25 active:bg-emerald-500/35"
                    >
                      <Users className="size-3.5" aria-hidden="true" />
                      Comparar
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      </div>
    )}
    </section>
  )
}
