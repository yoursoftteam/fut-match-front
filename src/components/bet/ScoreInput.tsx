'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

export interface ScoreInputProps {
  homeScore: number
  awayScore: number
  onChangeHome: (score: number) => void
  onChangeAway: (score: number) => void
  locked: boolean
  disabled?: boolean
  matchId: string
  compact?: boolean
}

export function ScoreInput({
  homeScore,
  awayScore,
  onChangeHome,
  onChangeAway,
  locked,
  disabled = false,
  matchId,
  compact = false,
}: ScoreInputProps) {
  const [homeInput, setHomeInput] = useState(String(homeScore))
  const [awayInput, setAwayInput] = useState(String(awayScore))
  const homeTimeoutRef = useRef<NodeJS.Timeout>()
  const awayTimeoutRef = useRef<NodeJS.Timeout>()

  const debouncedHome = useCallback(
    (value: number) => {
      if (homeTimeoutRef.current) clearTimeout(homeTimeoutRef.current)
      homeTimeoutRef.current = setTimeout(() => {
        onChangeHome(value)
      }, 500)
    },
    [onChangeHome]
  )

  const debouncedAway = useCallback(
    (value: number) => {
      if (awayTimeoutRef.current) clearTimeout(awayTimeoutRef.current)
      awayTimeoutRef.current = setTimeout(() => {
        onChangeAway(value)
      }, 500)
    },
    [onChangeAway]
  )

  useEffect(() => {
    return () => {
      if (homeTimeoutRef.current) clearTimeout(homeTimeoutRef.current)
      if (awayTimeoutRef.current) clearTimeout(awayTimeoutRef.current)
    }
  }, [])

  const handleHomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setHomeInput(val)
    const num = parseInt(val, 10)
    if (!isNaN(num) && num >= 0) {
      debouncedHome(num)
    }
  }

  const handleAwayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setAwayInput(val)
    const num = parseInt(val, 10)
    if (!isNaN(num) && num >= 0) {
      debouncedAway(num)
    }
  }

  const handleHomeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (locked || disabled) return
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newVal = Math.max(0, homeScore + 1)
      setHomeInput(String(newVal))
      onChangeHome(newVal)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newVal = Math.max(0, homeScore - 1)
      setHomeInput(String(newVal))
      onChangeHome(newVal)
    } else if (e.key === 'Enter') {
      const num = parseInt(homeInput, 10)
      if (!isNaN(num) && num >= 0) {
        onChangeHome(num)
      }
    }
  }

  const handleAwayKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (locked || disabled) return
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newVal = Math.max(0, awayScore + 1)
      setAwayInput(String(newVal))
      onChangeAway(newVal)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newVal = Math.max(0, awayScore - 1)
      setAwayInput(String(newVal))
      onChangeAway(newVal)
    } else if (e.key === 'Enter') {
      const num = parseInt(awayInput, 10)
      if (!isNaN(num) && num >= 0) {
        onChangeAway(num)
      }
    }
  }

  const handleIncrement = (team: 'home' | 'away') => {
    if (team === 'home') {
      const newVal = homeScore + 1
      setHomeInput(String(newVal))
      onChangeHome(newVal)
    } else {
      const newVal = awayScore + 1
      setAwayInput(String(newVal))
      onChangeAway(newVal)
    }
  }

  const handleDecrement = (team: 'home' | 'away') => {
    if (team === 'home') {
      const newVal = Math.max(0, homeScore - 1)
      setHomeInput(String(newVal))
      onChangeHome(newVal)
    } else {
      const newVal = Math.max(0, awayScore - 1)
      setAwayInput(String(newVal))
      onChangeAway(newVal)
    }
  }

  const borderColor = locked
    ? 'border-red-500/50 focus-within:border-red-500'
    : 'border-emerald-500/50 focus-within:border-emerald-500'

  // Compact version: inline score inputs without buttons
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          min="0"
          max="99"
          value={homeInput}
          onChange={handleHomeChange}
          onKeyDown={handleHomeKeyDown}
          disabled={locked || disabled}
          aria-label={`Home team score for match ${matchId}`}
          className={cn(
            'w-7 h-7 border rounded text-center text-sm font-bold text-slate-50 outline-none bg-slate-800 border-slate-700',
            borderColor,
            locked && 'cursor-not-allowed opacity-50'
          )}
        />
        <span className="text-slate-500 text-xs font-semibold">-</span>
        <input
          type="number"
          min="0"
          max="99"
          value={awayInput}
          onChange={handleAwayChange}
          onKeyDown={handleAwayKeyDown}
          disabled={locked || disabled}
          aria-label={`Away team score for match ${matchId}`}
          className={cn(
            'w-7 h-7 border rounded text-center text-sm font-bold text-slate-50 outline-none bg-slate-800 border-slate-700',
            borderColor,
            locked && 'cursor-not-allowed opacity-50'
          )}
        />
      </div>
    )
  }

  // Original full-size version
  return (
    <div className="flex items-center gap-3 md:gap-4">
      <div className="flex flex-col items-center gap-2">
        <div
          className={cn(
            'relative flex h-12 items-center rounded-lg border border-slate-700 bg-slate-900 md:h-14',
            borderColor,
            (locked || disabled) && 'opacity-50'
          )}
        >
          <input
            type="number"
            min="0"
            max="99"
            value={homeInput}
            onChange={handleHomeChange}
            onKeyDown={handleHomeKeyDown}
            disabled={locked || disabled}
            aria-label={`Home team score for match ${matchId}`}
            className={cn(
              'w-12 border-0 bg-transparent text-center text-2xl font-bold text-slate-50 outline-none md:w-14',
              locked && 'cursor-not-allowed'
            )}
          />
        </div>
        {!locked && (
          <div className="flex gap-1">
            <button
              onClick={() => handleIncrement('home')}
              disabled={disabled}
              className="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50"
              aria-label="Increase home score"
            >
              +
            </button>
            <button
              onClick={() => handleDecrement('home')}
              disabled={disabled}
              className="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50"
              aria-label="Decrease home score"
            >
              -
            </button>
          </div>
        )}
      </div>

      <div className="text-xl font-bold text-slate-400">-</div>

      <div className="flex flex-col items-center gap-2">
        <div
          className={cn(
            'relative flex h-12 items-center rounded-lg border border-slate-700 bg-slate-900 md:h-14',
            borderColor,
            (locked || disabled) && 'opacity-50'
          )}
        >
          <input
            type="number"
            min="0"
            max="99"
            value={awayInput}
            onChange={handleAwayChange}
            onKeyDown={handleAwayKeyDown}
            disabled={locked || disabled}
            aria-label={`Away team score for match ${matchId}`}
            className={cn(
              'w-12 border-0 bg-transparent text-center text-2xl font-bold text-slate-50 outline-none md:w-14',
              locked && 'cursor-not-allowed'
            )}
          />
        </div>
        {!locked && (
          <div className="flex gap-1">
            <button
              onClick={() => handleIncrement('away')}
              disabled={disabled}
              className="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50"
              aria-label="Increase away score"
            >
              +
            </button>
            <button
              onClick={() => handleDecrement('away')}
              disabled={disabled}
              className="flex h-12 w-12 items-center justify-center rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50"
              aria-label="Decrease away score"
            >
              -
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
