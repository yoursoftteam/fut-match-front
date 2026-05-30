'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Trophy, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ShareActions } from '@/components/ShareLink'

const MEDAL_EMOJI = ['🥇', '🥈', '🥉']

const RANK_STYLES = {
  1: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400' },
  2: { bg: 'bg-slate-300/5', border: 'border-slate-400/30', text: 'text-slate-300' },
  3: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
}

interface RankingEntry {
  rank: number
  user_id: string
  name: string
  email: string
  points_total: number
  exact_predictions: number
  total_predictions: number
}

interface PoolRankingProps {
  poolId: string
  poolName: string
  maxEntries?: number
}

export function PoolRanking({ poolId, poolName, maxEntries }: PoolRankingProps) {
  const [allEntries, setAllEntries] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)

  const entries = maxEntries ? allEntries.slice(0, maxEntries) : allEntries

  const fetchRanking = useCallback(async () => {
    setLoading(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: authData } = await supabase.auth.getSession()
      const token = authData?.session?.access_token
      if (!token) return

      const response = await fetch(`/api/v1/bet/pools/${poolId}/ranking`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const result = await response.json()
      if (result.success && Array.isArray(result.data)) {
        setAllEntries(result.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [poolId])

  useEffect(() => {
    fetchRanking()
  }, [fetchRanking])

  const rankingText = useMemo(() => {
    const top10 = entries.slice(0, 10)
    if (top10.length === 0) return ''

    const lines = [`🏆 ${poolName} — Top 10`, '']
    top10.forEach((e, i) => {
      const medal = i < 3 ? ` ${MEDAL_EMOJI[i]}` : ''
      lines.push(`${i + 1}.${medal} ${e.name} — ${e.points_total} pts (${e.exact_predictions} exactas)`)
    })
    return lines.join('\n')
  }, [entries, poolName])

  const empty = entries.length === 0

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950">
      <div className="border-b border-slate-800 bg-slate-900/70 px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Trophy className="size-4 text-emerald-400" aria-hidden="true" />
            Ranking
          </h2>
        </div>
        {entries.length > 0 && (
          <div className="mt-3">
            <ShareActions
              copyText={rankingText}
              copyTooltip="Copiar resultados"
              copiedStatusText="Resultados copiados al portapapeles"
              whatsappText={rankingText}
              emailSubject={`Ranking - ${poolName}`}
              emailBody={rankingText}
              nativeShare={{
                title: `Ranking - ${poolName}`,
                text: rankingText,
              }}
            />
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-3 py-12 text-sm text-slate-400">
          <div className="size-5 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400" />
          Cargando ranking…
        </div>
      ) : empty ? (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <Users className="size-8 text-slate-600" aria-hidden="true" />
          <p className="text-sm text-slate-500">Aún no hay participantes con puntaje</p>
          <p className="text-xs text-slate-600">Los resultados aparecerán cuando haya partidos finalizados</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[400px] text-sm">
            <caption className="sr-only">Ranking de participantes ordenados por puntaje</caption>
            <colgroup>
              <col className="w-14" />
              <col />
              <col className="w-20" />
              <col className="w-24" />
            </colgroup>
            <thead className="border-b border-slate-800 bg-slate-900/50 text-left text-[0.6875rem] uppercase text-slate-500">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold">#</th>
                <th scope="col" className="px-3 py-2 font-semibold">Participante</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Pts</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Exactas</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const style = RANK_STYLES[entry.rank as keyof typeof RANK_STYLES]
                const isPodium = !!style

                return (
                  <tr
                    key={entry.user_id}
                    className={cn(
                      'border-b border-slate-800/60 transition-colors hover:bg-slate-900/50',
                      isPodium && style.bg
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <div
                        className={cn(
                          'flex size-7 items-center justify-center rounded-md font-mono text-xs font-bold tabular-nums',
                          isPodium
                            ? `${style.border} ${style.text} border`
                            : 'text-slate-500'
                        )}
                      >
                        {entry.rank <= 3 ? (
                          <span className="text-base leading-none">{MEDAL_EMOJI[entry.rank - 1]}</span>
                        ) : (
                          entry.rank
                        )}
                      </div>
                    </td>
                    <td className="max-w-[200px] truncate px-3 py-2.5 font-medium text-slate-100">
                      {entry.name}
                    </td>
                    <td className={cn('px-3 py-2.5 text-right font-mono text-sm font-bold tabular-nums', isPodium ? style.text : 'text-slate-200')}>
                      {entry.points_total}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-slate-400">
                      {entry.exact_predictions}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
