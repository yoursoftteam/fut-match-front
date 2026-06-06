'use client'

import { useState } from 'react'
import { KeyRound } from 'lucide-react'

interface JoinByCodeSectionProps {
  onJoin: (code: string) => Promise<{ success: boolean; error?: string }>
  loading: boolean
  error: string | null
  onClearError: () => void
}

export function JoinByCodeSection({ onJoin, loading, error, onClearError }: JoinByCodeSectionProps) {
  const [showInput, setShowInput] = useState(false)
  const [code, setCode] = useState('')

  const handleSubmit = async () => {
    const result = await onJoin(code)
    if (result.success) setCode('')
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowInput(!showInput)}
        className="mb-6 flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-800 px-4 py-2.5 text-sm text-slate-500 transition-colors hover:border-slate-700 hover:text-slate-400"
      >
        <KeyRound className="size-4" />
        {showInput ? 'Ocultar' : '¿Tienes un código de invitación?'}
      </button>

      {showInput && (
        <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase())
                onClearError()
              }}
              placeholder="Ej: ABC123DEF0"
              maxLength={10}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-50 placeholder-slate-600 focus:border-[#22C55E]/50 focus:outline-none uppercase tracking-widest"
            />
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-50 shrink-0"
            >
              {loading ? '...' : 'Unirse'}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-xs text-red-400">{error}</p>
          )}
        </div>
      )}
    </>
  )
}
