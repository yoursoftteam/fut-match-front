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
    <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-800/40 px-2 py-2.5 sm:gap-3 sm:px-3">
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-200">
        {entry.name}
      </span>

      <span className="w-16 shrink-0 text-sm font-bold tabular-nums text-slate-300">
        {entry.home_score_predicted} – {entry.away_score_predicted}
      </span>

      <span
        className={cn(
          'w-14 shrink-0 text-xs font-semibold tabular-nums',
          evaluation ? ACCURACY_THEMES[evaluation.accuracy].points : 'text-slate-500'
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
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm" />
        <Dialog.Popup className="fixed z-50 flex h-fit max-h-[80vh] w-[calc(100%-16px)] max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900 p-0 shadow-2xl transition-all duration-150 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex items-center justify-between border-b border-slate-800 px-3 py-3 sm:px-4">
            <div className="min-w-0 flex-1">
              {match ? (
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                  <span className="truncate">{match.home_team?.name ?? 'Local'}</span>
                  <span className="text-slate-500">vs</span>
                  <span className="truncate">{match.away_team?.name ?? 'Visitante'}</span>
                </div>
              ) : (
                <span className="text-sm text-slate-400">Predicciones del partido</span>
              )}
            </div>
            <Dialog.Close
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-300"
              aria-label="Cerrar"
            >
              <XIcon className="size-4" />
            </Dialog.Close>
          </div>

          {match && match.home_score_official !== null && match.status === 'finished' && (
            <div className="flex items-center justify-center gap-2 border-b border-slate-800 bg-slate-800/30 px-3 py-2 sm:gap-3 sm:px-4">
              <span className="text-xs text-slate-500">Marcador final:</span>
              <span className="text-base font-bold tabular-nums text-slate-100">
                {match.home_score_official} – {match.away_score_official}
              </span>
            </div>
          )}

          <div className="flex-1 overflow-y-auto px-3 py-3 sm:px-4 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin text-emerald-400" />
                Cargando predicciones…
              </div>
            ) : error ? (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-2 text-sm text-red-300 sm:px-3 sm:py-2.5">
                <AlertCircle className="size-4 shrink-0" />
                {error}
              </div>
            ) : entries.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">No hay predicciones de otros participantes.</p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:gap-3 sm:px-3">
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

          <div className="border-t border-slate-800 px-3 py-2.5 text-center text-[10px] text-slate-600 sm:px-4">
            {entries.length} predicción{entries.length !== 1 ? 'es' : ''}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
