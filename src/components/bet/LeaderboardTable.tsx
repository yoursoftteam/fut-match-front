'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface ScoreRow {
  user_id: string
  name: string
  points_total: number
  rank: number
  completion_percent: number
}

export interface LeaderboardTableProps {
  scores: ScoreRow[]
  mode: 'pool' | 'global'
  currentUserId?: string
  onRowClick?: (userId: string) => void
}

type SortKey = 'rank' | 'points_total' | 'name'

export function LeaderboardTable({
  scores,
  mode,
  currentUserId,
  onRowClick,
}: LeaderboardTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>('rank')
  const [sortAsc, setSortAsc] = useState(true)
  const [page, setPage] = useState(0)

  const sorted = [...scores].sort((a, b) => {
    const aVal: any = a[sortBy]
    const bVal: any = b[sortBy]
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
    return sortAsc ? cmp : -cmp
  })

  const pageSize = 10
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize)
  const totalPages = Math.ceil(sorted.length / pageSize)

  const handleSort = (key: SortKey) => {
    if (sortBy === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortBy(key)
      setSortAsc(true)
    }
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th
                className="cursor-pointer px-2 sm:px-3 py-3 text-left font-semibold text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 md:px-4 text-xs sm:text-sm"
                onClick={() => handleSort('rank')}
              >
                # {sortBy === 'rank' && (sortAsc ? '↑' : '↓')}
              </th>
              <th
                className="cursor-pointer px-2 sm:px-3 py-3 text-left font-semibold text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 md:px-4 text-xs sm:text-sm"
                onClick={() => handleSort('name')}
              >
                Nombre {sortBy === 'name' && (sortAsc ? '↑' : '↓')}
              </th>
              <th
                className="cursor-pointer px-2 sm:px-3 py-3 text-right font-semibold text-foreground hover:text-emerald-600 dark:hover:text-emerald-400 md:px-4 text-xs sm:text-sm"
                onClick={() => handleSort('points_total')}
              >
                Pts {sortBy === 'points_total' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="hidden px-2 sm:px-3 py-3 text-right font-semibold text-foreground md:px-4 lg:table-cell text-xs sm:text-sm">
                % Complet.
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => (
              <tr
                key={row.user_id}
                onClick={() => onRowClick?.(row.user_id)}
                className={cn(
                  'border-b border-border/50 transition-colors',
                  currentUserId === row.user_id && 'bg-emerald-500/10',
                  onRowClick && 'cursor-pointer hover:bg-muted/50'
                )}
              >
                <td className="px-2 sm:px-3 py-3 font-bold text-foreground md:px-4 text-sm">{row.rank}</td>
                <td className="px-2 sm:px-3 py-3 text-foreground md:px-4 text-sm truncate max-w-[140px] sm:max-w-none">{row.name}</td>
                <td className="px-2 sm:px-3 py-3 text-right font-semibold text-emerald-400 md:px-4 text-sm">
                  {row.points_total}
                </td>
                <td className="hidden px-2 sm:px-3 py-3 text-right text-muted-foreground md:px-4 lg:table-cell text-sm">
                  {row.completion_percent}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="rounded-md bg-card border border-border px-4 sm:px-3 py-2.5 sm:py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 min-w-[5rem] sm:min-w-0"
          >
            Anterior
          </button>
          <span className="text-xs sm:text-sm text-muted-foreground">
            Pág. {page + 1} de {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page === totalPages - 1}
            className="rounded-md bg-card border border-border px-4 sm:px-3 py-2.5 sm:py-2 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-50 min-w-[5rem] sm:min-w-0"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  )
}
