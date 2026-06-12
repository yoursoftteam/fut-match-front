'use client'

import * as React from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { supabase } from '@/lib/supabase'
import { XIcon, Loader2, AlertCircle, Trophy, Medal, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TournamentCategory } from '@/types/bet'

interface TournamentPick {
  team_id: string
  team_name: string
  fifa_code: string
  flag_svg_url: string | null
}

interface UserEntry {
  user_id: string
  name: string
  predictions: {
    champion: TournamentPick | null
    subchampion: TournamentPick | null
    third_place: TournamentPick | null
  }
}

interface TournamentPredictionsCompareModalProps {
  poolId: string
  category: TournamentCategory | null
  open: boolean
  onClose: () => void
}

const CATEGORY_META: Record<TournamentCategory, {
  label: string
  Icon: typeof Trophy
  color: string
}> = {
  champion: { label: 'Campeón', Icon: Trophy, color: 'text-amber-400' },
  subchampion: { label: 'Subcampeón', Icon: Medal, color: 'text-foreground' },
  third_place: { label: '3er puesto', Icon: Shield, color: 'text-orange-400' },
}

export function TournamentPredictionsCompareModal({
  poolId,
  category,
  open,
  onClose,
}: TournamentPredictionsCompareModalProps) {
  const [entries, setEntries] = React.useState<UserEntry[]>([])
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

        const res = await fetch(`/api/v1/bet/pools/${poolId}/tournament-predictions`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const json = await res.json()

        if (!cancelled) {
          if (json.success) {
            setEntries(json.data.predictions ?? [])
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
  }, [poolId, open])

  const meta = category ? CATEGORY_META[category] : null
  const Icon = meta?.Icon

  const filteredEntries = React.useMemo(
    () => category
      ? entries.filter((e) => e.predictions[category] !== null)
      : entries,
    [entries, category]
  )

  return (
    <Dialog.Root open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm" />
        <Dialog.Popup className="fixed z-50 max-h-[80dvh] w-[calc(100%-16px)] max-w-lg rounded-2xl border border-border bg-card shadow-2xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex max-h-[80dvh] flex-col rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-3 py-3 sm:px-4 shrink-0">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                {Icon && <Icon className={cn('size-4', meta?.color)} aria-hidden="true" />}
                {meta ? `${meta.label} — Predicciones` : 'Predicciones del torneo'}
              </span>
              <Dialog.Close
                className="flex size-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Cerrar"
              >
                <XIcon className="size-4" />
              </Dialog.Close>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                  Cargando predicciones…
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-2 text-sm text-red-300 sm:px-3 sm:py-2.5">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </div>
              ) : filteredEntries.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">No hay predicciones de otros participantes.</p>
              ) : (
                <div className="space-y-2">
                  {filteredEntries.map((entry) => {
                    const pick = category ? entry.predictions[category] : null
                    return (
                      <div
                        key={entry.user_id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2.5"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                          {entry.name}
                        </span>
                        {pick ? (
                          <div className="flex items-center gap-2 shrink-0">
                            {pick.flag_svg_url ? (
                              <img
                                src={pick.flag_svg_url}
                                alt=""
                                className="size-5 rounded-sm object-cover"
                              />
                            ) : (
                              <span className="size-5 rounded-sm border border-border bg-muted" />
                            )}
                            <span className={cn('text-sm font-semibold', meta?.color)}>
                              {pick.team_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {!loading && !error && filteredEntries.length > 0 && (
              <div className="border-t border-border px-3 py-2.5 text-center text-[10px] text-muted-foreground sm:px-4 shrink-0">
                {filteredEntries.length} participante{filteredEntries.length !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
