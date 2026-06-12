'use client'

import { AlertCircle, Globe, Lock, Users } from 'lucide-react'
import { NextMatchCountdown } from './NextMatchCountdown'
import type { Pool } from '@/types/bet'

interface PoolCardProps {
  pool: Pool & { member_count: number }
  onClick: () => void
  children?: React.ReactNode
  nextMatchKickoffAt?: string
  rank?: number
  totalMembers?: number
  predicted?: boolean
}

export function PoolCard({ pool, onClick, children, nextMatchKickoffAt, rank, totalMembers, predicted }: PoolCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-[#22C55E]/50"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-foreground truncate">
            {pool.name}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1 whitespace-nowrap">
              {pool.visibility === 'public' ? (
                <Globe className="size-3" />
              ) : (
                <Lock className="size-3" />
              )}
              {pool.visibility === 'public' ? 'Pública' : 'Privada'}
            </span>
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Users className="size-3" />
              <span>{pool.member_count}</span>
              <span>miembro{pool.member_count !== 1 ? 's' : ''}</span>
            </span>
            {rank !== undefined && rank > 0 && (
              <span className="whitespace-nowrap font-medium text-foreground">
                🏆 {rank}/{totalMembers}
              </span>
            )}
            {nextMatchKickoffAt && (
              <NextMatchCountdown kickoffAt={nextMatchKickoffAt} />
            )}
            {predicted === false && (
              <span className="flex items-center gap-1 whitespace-nowrap text-[11px] text-red-400">
                <AlertCircle className="size-3" aria-hidden="true" />
                Sin Pronóstico
              </span>
            )}
          </div>
        </div>
        {children && (
          <div className="shrink-0 ml-3">
            {children}
          </div>
        )}
      </div>
    </button>
  )
}
