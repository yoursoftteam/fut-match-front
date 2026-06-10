'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { Trophy, Users, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ShareActions } from '@/components/ShareLink'
import { RemoveMemberDialog } from '@/components/bet/RemoveMemberDialog'

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
  isOwner?: boolean
}

export function PoolRanking({ poolId, poolName, maxEntries, isOwner }: PoolRankingProps) {
  const [allEntries, setAllEntries] = useState<RankingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [removingUserId, setRemovingUserId] = useState<string | null>(null)
  const [pendingRemove, setPendingRemove] = useState<{ userId: string; name: string } | null>(null)

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

  const execRemove = useCallback(async (memberUserId: string) => {
    setRemovingUserId(memberUserId)
    setPendingRemove(null)
    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: authData } = await supabase.auth.getSession()
      const token = authData?.session?.access_token
      if (!token) return

      const response = await fetch(`/api/v1/bet/pools/${poolId}/members/${memberUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setAllEntries((prev) => prev.filter((e) => e.user_id !== memberUserId))
      }
    } catch {
      // ignore
    } finally {
      setRemovingUserId(null)
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
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <div className="border-b border-border bg-muted px-4 py-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
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
        <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
          <div className="size-5 animate-spin rounded-full border-2 border-border border-t-emerald-400" />
          Cargando ranking…
        </div>
      ) : empty ? (
        <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
          <Users className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">Aún no hay participantes en esta polla</p>
          <p className="text-xs text-muted-foreground">Comparte el enlace de invitación para agregar participantes</p>
        </div>
      ) : (
        <div className="overflow-x-auto [&::-webkit-scrollbar]:h-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-700">
          <table className="w-full min-w-[360px] text-sm">
            <caption className="sr-only">Ranking de participantes ordenados por puntaje</caption>
            <thead className="border-b border-border bg-muted/50 text-left text-[0.6875rem] uppercase text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-semibold w-10">#</th>
                <th scope="col" className="px-3 py-2 font-semibold">Participante</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold w-14">Pts</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold w-16">Exactas</th>
                {isOwner && <th scope="col" className="px-2 py-2 text-right font-semibold w-10 sr-only">Acción</th>}
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
                      'border-b border-border/60 transition-colors hover:bg-muted/50',
                      isPodium && style.bg
                    )}
                  >
                    <td className="px-2 sm:px-3 py-2 sm:py-2.5">
                      <div
                        className={cn(
                          'flex size-6 sm:size-7 items-center justify-center rounded-md font-mono text-xs font-bold tabular-nums',
                          isPodium
                            ? `${style.border} ${style.text} border`
                            : 'text-muted-foreground'
                        )}
                      >
                        {entry.rank <= 3 ? (
                          <span className="text-sm sm:text-base leading-none">{MEDAL_EMOJI[entry.rank - 1]}</span>
                        ) : (
                          entry.rank
                        )}
                      </div>
                    </td>
                    <td className="max-w-[140px] sm:max-w-[200px] truncate px-2 sm:px-3 py-2 sm:py-2.5 font-medium text-foreground">
                      {entry.name}
                    </td>
                    <td className={cn('px-2 sm:px-3 py-2 sm:py-2.5 text-right font-mono text-sm font-bold tabular-nums', isPodium ? style.text : 'text-foreground')}>
                      {entry.points_total}
                    </td>
                    <td className="px-2 sm:px-3 py-2 sm:py-2.5 text-right font-mono text-xs tabular-nums text-muted-foreground">
                      {entry.exact_predictions}
                    </td>
                    {isOwner && (
                      <td className="px-1 py-2 sm:py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => setPendingRemove({ userId: entry.user_id, name: entry.name })}
                          disabled={removingUserId === entry.user_id}
                          className="rounded p-1.5 sm:p-1 text-red-400 transition hover:bg-red-900/30 hover:text-red-300 disabled:opacity-40 min-w-[2.75rem] min-h-[2.75rem] sm:min-w-0 sm:min-h-0 flex items-center justify-center"
                          aria-label={`Eliminar a ${entry.name} de la polla`}
                        >
                          {removingUserId === entry.user_id ? (
                            <span className="inline-block size-4 sm:size-3.5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                          ) : (
                            <Trash2 size={16} aria-hidden />
                          )}
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <RemoveMemberDialog
        open={!!pendingRemove}
        memberName={pendingRemove?.name ?? ""}
        loading={!!removingUserId}
        onConfirm={() => pendingRemove && execRemove(pendingRemove.userId)}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  )
}
