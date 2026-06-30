'use client'

import * as React from 'react'
import { Dialog } from '@base-ui/react/dialog'
import { supabase } from '@/lib/supabase'
import { XIcon, Loader2, AlertCircle, Download, Trophy, Calendar, LayoutGrid } from 'lucide-react'
import type { PointsSummaryResponse } from '@/app/api/v1/bet/pools/[id]/my-points-summary/route'

interface MyPointsSummaryModalProps {
  poolId: string
  open: boolean
  onClose: () => void
}

function csvEscape(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`
  }
  return val
}

function downloadCsv(data: PointsSummaryResponse, poolName: string): void {
  const rows: string[][] = []

  rows.push(['Sección', 'Detalle', 'Puntos', 'Subtotal'])
  rows.push([])

  if (data.sections.matches.entries.length > 0) {
    rows.push(['PARTIDOS', '', '', String(data.sections.matches.points)])
    for (const entry of data.sections.matches.entries) {
      const label = [entry.home_team_name ?? '?', 'vs', entry.away_team_name ?? '?'].join(' ')
      const score = entry.home_score_official !== null ? `${entry.home_score_official}-${entry.away_score_official}` : 'pendiente'
      rows.push(['', `${label} (${score})`, String(entry.points), ''])
    }
    rows.push([])
  }

  if (data.sections.tournament.entries.length > 0) {
    rows.push(['TORNEO', '', '', String(data.sections.tournament.points)])
    const labels: Record<string, string> = { champion: 'Campeón', subchampion: 'Subcampeón', third_place: 'Tercero' }
    for (const entry of data.sections.tournament.entries) {
      const label = labels[entry.category] ?? entry.category
      const team = entry.team_name ?? '?'
      rows.push(['', `${label}: ${team}`, String(entry.points), ''])
    }
    rows.push([])
  }

  if (data.sections.group_prediction.entries.length > 0) {
    rows.push(['PREDICCIÓN GRUPOS', '', '', String(data.sections.group_prediction.points)])
    for (const entry of data.sections.group_prediction.entries) {
      const label = entry.group_name === 'best_third' ? 'Mejores terceros' : `Grupo ${entry.group_name}`
      rows.push(['', label, String(entry.points), ''])
    }
    rows.push([])
  }

  rows.push(['TOTAL', '', '', String(data.total_points)])

  const csv = rows.map(r => r.map(cell => csvEscape(cell)).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${poolName.replace(/[^a-zA-Z0-9_-]/g, '_')}_puntos.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const SECTION_ICONS: Record<string, React.ElementType> = {
  matches: Calendar,
  tournament: Trophy,
  group_prediction: LayoutGrid,
}

const SECTION_LABELS: Record<string, string> = {
  matches: 'Partidos',
  tournament: 'Torneo',
  group_prediction: 'Predicción grupos',
}

function SectionCard({
  sectionKey,
  points,
  children,
}: {
  sectionKey: string
  points: number
  children: React.ReactNode
}) {
  const Icon = SECTION_ICONS[sectionKey] ?? Trophy
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5 sm:px-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Icon className="size-4 text-muted-foreground" />
          {SECTION_LABELS[sectionKey] ?? sectionKey}
        </div>
        <span className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
          {points > 0 ? '+' : ''}{points} pts
        </span>
      </div>
      <div className="space-y-1 px-3 py-2 sm:px-4">
        {children}
      </div>
    </div>
  )
}

export function MyPointsSummaryModal({
  poolId,
  open,
  onClose,
}: MyPointsSummaryModalProps) {
  const [data, setData] = React.useState<PointsSummaryResponse | null>(null)
  const [poolName, setPoolName] = React.useState('')
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

        const [summaryRes, poolRes] = await Promise.all([
          fetch(`/api/v1/bet/pools/${poolId}/my-points-summary`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/v1/bet/pools/${poolId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ])

        const summaryJson = await summaryRes.json()
        const poolJson = await poolRes.json()

        if (!cancelled) {
          if (summaryJson.success) {
            setData(summaryJson.data)
          } else {
            setError(summaryJson.error?.message ?? 'Error al cargar resumen')
          }
          if (poolJson.success) {
            setPoolName(poolJson.data.name)
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

  const nonEmptySections = data
    ? (['matches', 'tournament', 'group_prediction'] as const).filter(
        k => data.sections[k].entries.length > 0
      )
    : []

  return (
    <Dialog.Root open={open} onOpenChange={(v: boolean) => { if (!v) onClose() }}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-black/60 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-sm" />
        <Dialog.Popup className="fixed z-50 max-h-[85dvh] w-[calc(100%-16px)] max-w-lg rounded-2xl border border-border bg-background shadow-2xl left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0">
          <div className="flex max-h-[85dvh] flex-col rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-3 py-3 sm:px-4 shrink-0">
              <h2 className="text-sm font-semibold text-foreground">Resumen de puntos</h2>
              <div className="flex items-center gap-1">
                {data && (
                  <button
                    type="button"
                    onClick={() => downloadCsv(data, poolName)}
                    className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Descargar CSV"
                    title="Descargar CSV"
                  >
                    <Download className="size-4" />
                  </button>
                )}
                <Dialog.Close
                  className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  aria-label="Cerrar"
                >
                  <XIcon className="size-4" />
                </Dialog.Close>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin text-emerald-600 dark:text-emerald-400" />
                  Cargando resumen…
                </div>
              ) : error ? (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-2 text-sm text-red-600 dark:text-red-300 sm:px-3 sm:py-2.5">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </div>
              ) : data ? (
                <div className="space-y-3">
                  {nonEmptySections.length === 0 ? (
                    <p className="py-12 text-center text-sm text-muted-foreground">
                      Aún no tienes puntos en esta polla.
                    </p>
                  ) : (
                    nonEmptySections.map((sectionKey) => (
                      <SectionCard
                        key={sectionKey}
                        sectionKey={sectionKey}
                        points={data.sections[sectionKey].points}
                      >
                        {sectionKey === 'matches' && data.sections.matches.entries.map((entry) => (
                          <div
                            key={entry.source_id}
                            className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1.5 text-sm sm:px-3"
                          >
                            <span className="min-w-0 flex-1 truncate text-foreground">
                              {entry.home_team_name ?? '?'} vs {entry.away_team_name ?? '?'}
                              {entry.home_score_official !== null && (
                                <span className="ml-1.5 text-muted-foreground">
                                  ({entry.home_score_official}–{entry.away_score_official})
                                </span>
                              )}
                            </span>
                            <span className="shrink-0 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                              {entry.points > 0 ? '+' : ''}{entry.points} pts
                            </span>
                          </div>
                        ))}
                        {sectionKey === 'tournament' && data.sections.tournament.entries.map((entry) => {
                          const labels: Record<string, string> = { champion: 'Campeón', subchampion: 'Subcampeón', third_place: 'Tercero' }
                          return (
                            <div
                              key={entry.category}
                              className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1.5 text-sm sm:px-3"
                            >
                              <span className="min-w-0 flex-1 truncate text-foreground">
                                <span className="text-muted-foreground">{labels[entry.category] ?? entry.category}:</span>{' '}
                                {entry.team_name ?? '?'}
                              </span>
                              <span className="shrink-0 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                {entry.points > 0 ? '+' : ''}{entry.points} pts
                              </span>
                            </div>
                          )
                        })}
                        {sectionKey === 'group_prediction' && data.sections.group_prediction.entries.map((entry) => {
                          return (
                            <div
                              key={entry.group_name}
                              className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-2 py-1.5 text-sm sm:px-3"
                            >
                              <span className="text-foreground">
                                {entry.group_name === 'best_third'
                                  ? 'Mejores terceros'
                                  : `Grupo ${entry.group_name}`}
                              </span>
                              <span className="shrink-0 font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                                {entry.points > 0 ? '+' : ''}{entry.points} pts
                              </span>
                            </div>
                          )
                        })}
                      </SectionCard>
                    ))
                  )}
                </div>
              ) : null}
            </div>

            {data && nonEmptySections.length > 0 && (
              <div className="flex items-center justify-between border-t border-border px-3 py-2.5 sm:px-4 shrink-0">
                <span className="text-sm font-medium text-foreground">Total</span>
                <span className="text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                  {data.total_points} pts
                </span>
              </div>
            )}
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
