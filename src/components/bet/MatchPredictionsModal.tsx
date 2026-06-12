'use client'

import * as React from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { XIcon, Loader2, AlertCircle } from 'lucide-react'
import { evaluatePrediction, ACCURACY_THEMES } from '@/lib/bet-result-utils'
import type { MatchPredictionEntry, MatchPredictionsResponse } from '@/app/api/v1/bet/matches/[id]/predictions/route'

interface MatchPredictionsModalProps {
  matchId: string
  poolId: string
  open: boolean
  onClose: () => void
}

function PredictionRow({
  entry,
  officialHome,
  officialAway,
}: {
  entry: MatchPredictionEntry
  officialHome: number | null
  officialAway: number | null
}) {
  const hasResult = officialHome !== null && officialAway !== null
  const evaluation = hasResult
    ? evaluatePrediction(
        { home: entry.home_score_predicted, away: entry.away_score_predicted },
        { home: officialHome!, away: officialAway! }
      )
    : null

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-2.5 sm:gap-3 sm:px-3">
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
        {entry.name}
      </span>

      <span className="w-16 shrink-0 text-sm font-bold tabular-nums text-foreground">
        {entry.home_score_predicted} – {entry.away_score_predicted}
      </span>

      <span
        className={cn(
          'w-14 shrink-0 text-xs font-semibold tabular-nums',
          evaluation ? ACCURACY_THEMES[evaluation.accuracy].points : 'text-muted-foreground'
        )}
      >
        {entry.points_earned > 0 ? '+' : ''}{entry.points_earned} pts
      </span>
    </div>
  )
}

export function MatchPredictionsModal({
  matchId,
  poolId,
  open,
  onClose,
}: MatchPredictionsModalProps) {
  const [data, setData] = React.useState<MatchPredictionsResponse | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!open) return

    let cancelled = false
    setLoading(true)
    setError(null)

    const fetchData = async () => {
      try {
        const { data: authData } = await supabase.auth.getSession()
        const token = authData?.session?.access_token
        if (!token) {
          setError('No autorizado')
          return
        }

        const res = await fetch(`/api/v1/bet/matches/${matchId}/predictions?pool_id=${poolId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()

        if (!cancelled) {
          if (json.success) {
            setData(json.data)
          } else {
            setError(json.error?.message ?? 'Error al cargar predicciones')
          }
        }
      } catch {
        if (!cancelled) setError('Error de conexión')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchData()
    return () => { cancelled = true }
  }, [matchId, poolId, open])

  const match = data?.match
  const entries = data?.predictions ?? []

  return (
    <Dialog.Root open={open} onOpenChange={(v: boolean) => { if (!v) onClose() }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm" />
        <Dialog.Popup className="fixed z-50 max-h-[80dvh] w-[calc(100%-16px)] max-w-lg rounded-2xl border border-border bg-background shadow-2xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex max-h-[80dvh] flex-col rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-3 py-3 sm:px-4 shrink-0">
              <div className="min-w-0 flex-1">
                {match ? (
                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <span className="truncate">{match.home_team?.name ?? 'Local'}</span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="truncate">{match.away_team?.name ?? 'Visitante'}</span>
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">Predicciones del partido</span>
                )}
              </div>
              <Dialog.Close
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Cerrar"
              >
                <XIcon className="size-4" />
              </Dialog.Close>
            </div>

            {match && match.home_score_official !== null && match.status === 'finished' && (
              <div className="flex items-center justify-center gap-2 border-b border-border bg-muted/30 px-3 py-2 sm:gap-3 sm:px-4 shrink-0">
                <span className="text-xs text-muted-foreground">Marcador final:</span>
                <span className="text-base font-bold tabular-nums text-foreground">
                  {match.home_score_official} – {match.away_score_official}
                </span>
              </div>
            )}

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                  Cargando predicciones…
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-2 text-sm text-red-600 dark:text-red-300 sm:px-3 sm:py-2.5">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </div>
              ) : entries.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No hay predicciones de otros participantes.</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground sm:gap-3 sm:px-3">
                    <span className="flex-1">Participante</span>
                    <span className="w-16">Pred.</span>
                    <span className="w-14">Pts</span>
                  </div>
                  {entries.map((entry) => (
                    <PredictionRow
                      key={entry.user_id}
                      entry={entry}
                      officialHome={match?.home_score_official ?? null}
                      officialAway={match?.away_score_official ?? null}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border px-3 py-2.5 text-center text-[10px] text-muted-foreground sm:px-4 shrink-0">
              {entries.length} predicción{entries.length !== 1 ? 'es' : ''}
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
