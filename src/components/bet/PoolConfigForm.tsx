'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

export interface BetPoolConfig {
  pts_winner_selection: number
  pts_exact_score: number
  pts_goal_difference: number
  pts_correct_side: number
  pts_all_correct_predictions: number
  [key: string]: number
}

export interface PoolConfigFormProps {
  pool_id: string
  initialConfig: BetPoolConfig
  onSubmit: (config: BetPoolConfig) => Promise<void>
  isOwner: boolean
  isFrozen: boolean
}

const fieldDescriptions: Record<string, string> = {
  pts_winner_selection: 'Points for correctly predicting match winner',
  pts_exact_score: 'Points for exact final score prediction',
  pts_goal_difference: 'Points for correct goal difference',
  pts_correct_side: 'Points for correct team winning side',
  pts_all_correct_predictions: 'Bonus points for all predictions correct',
}

export function PoolConfigForm({
  pool_id,
  initialConfig,
  onSubmit,
  isOwner,
  isFrozen,
}: PoolConfigFormProps) {
  const [config, setConfig] = useState<BetPoolConfig>(initialConfig)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleChange = (key: string, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: Math.max(0, value) }))
    setError(null)
    setSuccess(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const errors = []
    Object.entries(config).forEach(([key, val]) => {
      if (val < 0) errors.push(`${key} must be >= 0`)
      if (val > 50) errors.push(`${key} cannot exceed 50`)
    })

    if (errors.length > 0) {
      setError(errors[0])
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit(config)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save rules')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-lg border border-slate-700 bg-slate-900/50 p-4 md:p-6">
      <h2 className="text-lg font-bold text-slate-50">Pool Scoring Rules</h2>

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(initialConfig).map(([key, _]) => (
          <div key={key} className="space-y-1.5">
            <label className="text-sm font-medium text-slate-300">
              {key.replace(/_/g, ' ').toUpperCase()}
            </label>
            <p className="text-xs text-slate-400">{fieldDescriptions[key]}</p>
            <input
              type="number"
              min="0"
              max="50"
              value={config[key]}
              onChange={(e) => handleChange(key, parseInt(e.target.value, 10) || 0)}
              disabled={!isOwner || isFrozen}
              className={cn(
                'w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-50 outline-none focus:border-emerald-500',
                (!isOwner || isFrozen) && 'opacity-50 cursor-not-allowed'
              )}
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-emerald-500/10 p-3 text-sm text-emerald-400">
          Scoring rules saved successfully
        </div>
      )}

      <button
        type="submit"
        disabled={!isOwner || isFrozen || isSubmitting}
        className={cn(
          'w-full rounded-md bg-emerald-500 px-4 py-2 font-semibold text-slate-950 transition-all hover:bg-emerald-400',
          (!isOwner || isFrozen || isSubmitting) && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isSubmitting ? 'Saving...' : 'Guardar reglas'}
      </button>

      {isFrozen && <p className="text-xs text-slate-400">Pool rules are frozen and cannot be edited.</p>}
    </form>
  )
}
