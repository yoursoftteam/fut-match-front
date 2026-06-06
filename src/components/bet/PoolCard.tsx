'use client'

import { Globe, Lock, Users } from 'lucide-react'
import type { Pool } from '@/types/bet'

interface PoolCardProps {
  pool: Pool & { member_count: number }
  onClick: () => void
  children?: React.ReactNode
}

export function PoolCard({ pool, onClick, children }: PoolCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-left transition-colors hover:border-[#22C55E]/50"
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold text-slate-50 truncate">
            {pool.name}
          </h3>
          <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              {pool.visibility === 'public' ? (
                <Globe className="size-3" />
              ) : (
                <Lock className="size-3" />
              )}
              {pool.visibility === 'public' ? 'Pública' : 'Privada'}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3" />
              {pool.member_count} miembro{pool.member_count !== 1 ? 's' : ''}
            </span>
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
