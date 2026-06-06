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
      <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 bg-slate-800/50">
              <th
                className="cursor-pointer px-3 py-3 text-left font-semibold text-slate-300 hover:text-emerald-400 md:px-4"
                onClick={() => handleSort('rank')}
              >
                Rank {sortBy === 'rank' && (sortAsc ? '↑' : '↓')}
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-left font-semibold text-slate-300 hover:text-emerald-400 md:px-4"
                onClick={() => handleSort('name')}
              >
                Name {sortBy === 'name' && (sortAsc ? '↑' : '↓')}
              </th>
              <th
                className="cursor-pointer px-3 py-3 text-right font-semibold text-slate-300 hover:text-emerald-400 md:px-4"
                onClick={() => handleSort('points_total')}
              >
                Points {sortBy === 'points_total' && (sortAsc ? '↑' : '↓')}
              </th>
              <th className="hidden px-3 py-3 text-right font-semibold text-slate-300 md:px-4 lg:table-cell">
                Completion %
              </th>
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => (
              <tr
                key={row.user_id}
                onClick={() => onRowClick?.(row.user_id)}
                className={cn(
                  'border-b border-slate-700/50 transition-colors',
                  currentUserId === row.user_id && 'bg-emerald-500/10',
                  onRowClick && 'cursor-pointer hover:bg-slate-800/50'
                )}
              >
                <td className="px-3 py-3 font-bold text-slate-50 md:px-4">{row.rank}</td>
                <td className="px-3 py-3 text-slate-50 md:px-4">{row.name}</td>
                <td className="px-3 py-3 text-right font-semibold text-emerald-400 md:px-4">
                  {row.points_total}
                </td>
                <td className="hidden px-3 py-3 text-right text-slate-400 md:px-4 lg:table-cell">
                  {row.completion_percent}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-slate-50 hover:bg-slate-700 disabled:opacity-50 md:px-4"
          >
            Prev
          </button>
          <span className="text-sm text-slate-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page === totalPages - 1}
            className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-slate-50 hover:bg-slate-700 disabled:opacity-50 md:px-4"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
