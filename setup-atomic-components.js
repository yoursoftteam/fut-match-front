const fs = require('fs');
const path = require('path');

const betDir = path.join(__dirname, 'src', 'components', 'bet');
fs.mkdirSync(betDir, { recursive: true });
console.log(`✓ Created directory: ${betDir}`);

// CountryBadge component
const countryBadge = `'use client'

import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface CountryBadgeProps extends HTMLAttributes<HTMLDivElement> {
  name: string
  fifa_code: string
  flag_svg_url: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeVariants = {
  sm: {
    container: 'gap-1.5',
    flag: 'w-5 h-5',
    name: 'text-xs',
    code: 'text-[0.625rem]',
  },
  md: {
    container: 'gap-2',
    flag: 'w-6 h-6',
    name: 'text-sm',
    code: 'text-xs',
  },
  lg: {
    container: 'gap-2.5',
    flag: 'w-8 h-8',
    name: 'text-base',
    code: 'text-sm',
  },
}

export function CountryBadge({
  name,
  fifa_code,
  flag_svg_url,
  size = 'md',
  className,
  ...props
}: CountryBadgeProps) {
  const variants = sizeVariants[size]

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md bg-slate-900 px-2 py-1 md:px-3 md:py-1.5',
        variants.container,
        className
      )}
      {...props}
    >
      {/* Flag SVG */}
      <img
        src={flag_svg_url}
        alt={\`\${name} flag\`}
        className={cn('flex-shrink-0 rounded-sm', variants.flag)}
        aria-hidden="true"
      />

      {/* Country info */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <div
          className={cn('truncate font-medium text-slate-50', variants.name)}
          title={name}
        >
          {name}
        </div>
        <div
          className={cn('text-slate-400', variants.code)}
          aria-label={\`FIFA code: \${fifa_code}\`}
        >
          {fifa_code}
        </div>
      </div>
    </div>
  )
}
`;

// ScoreInput component
const scoreInput = `'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface ScoreInputProps {
  homeScore: number
  awayScore: number
  onChangeHome: (score: number) => void
  onChangeAway: (score: number) => void
  locked: boolean
  disabled?: boolean
  matchId: string
}

export function ScoreInput({
  homeScore,
  awayScore,
  onChangeHome,
  onChangeAway,
  locked,
  disabled = false,
  matchId,
}: ScoreInputProps) {
  const [homeInput, setHomeInput] = useState(String(homeScore))
  const [awayInput, setAwayInput] = useState(String(awayScore))
  const homeTimeoutRef = useRef<NodeJS.Timeout>()
  const awayTimeoutRef = useRef<NodeJS.Timeout>()

  // Debounced callbacks (500ms)
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

  return (
    <div className="flex items-center gap-3 md:gap-4">
      {/* Home Score */}
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
            aria-label={\`Home team score for match \${matchId}\`}
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
              className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 md:h-11 md:w-11"
              aria-label="Increase home score"
            >
              +
            </button>
            <button
              onClick={() => handleDecrement('home')}
              disabled={disabled}
              className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 md:h-11 md:w-11"
              aria-label="Decrease home score"
            >
              −
            </button>
          </div>
        )}
      </div>

      <div className="text-xl font-bold text-slate-400">−</div>

      {/* Away Score */}
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
            aria-label={\`Away team score for match \${matchId}\`}
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
              className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 md:h-11 md:w-11"
              aria-label="Increase away score"
            >
              +
            </button>
            <button
              onClick={() => handleDecrement('away')}
              disabled={disabled}
              className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 md:h-11 md:w-11"
              aria-label="Decrease away score"
            >
              −
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
`;

// LockCountdown component
const lockCountdown = `'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface LockCountdownProps {
  kickoffAt: string
  onLocked?: () => void
  showTimer?: boolean
}

export function LockCountdown({
  kickoffAt,
  onLocked,
  showTimer = true,
}: LockCountdownProps) {
  const [isLocked, setIsLocked] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    const updateCountdown = () => {
      const now = new Date()
      const kickoff = new Date(kickoffAt)
      const lockTime = new Date(kickoff.getTime() - 10 * 60 * 1000) // 10 min before kickoff

      if (now >= lockTime) {
        setIsLocked(true)
        setTimeLeft('')
        onLocked?.()
      } else {
        const diff = lockTime.getTime() - now.getTime()
        const minutes = Math.floor(diff / 60000)
        const seconds = Math.floor((diff % 60000) / 1000)
        setTimeLeft(\`\${minutes.toString().padStart(2, '0')}:\${seconds.toString().padStart(2, '0')}\`)
        setIsLocked(false)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => clearInterval(interval)
  }, [kickoffAt, onLocked])

  if (!mounted) return null

  if (isLocked) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400">
        <span>🔒</span>
        <span>LOCKED</span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400">
      {showTimer && (
        <>
          <span>⏱️</span>
          <span>Edit closes in {timeLeft}</span>
        </>
      )}
      {!showTimer && <span>✓ Editable</span>}
    </div>
  )
}
`;

// MatchCard component
const matchCard = `'use client'

import { LockCountdown } from './LockCountdown'
import { ScoreInput } from './ScoreInput'
import { CountryBadge } from './CountryBadge'
import { cn } from '@/lib/utils'

interface MatchCardProps {
  match: {
    id: string
    home_team: { name: string; fifa_code: string; flag_svg_url: string }
    away_team: { name: string; fifa_code: string; flag_svg_url: string }
    kickoff_at: string
    stage: string
    status: 'scheduled' | 'live' | 'finished'
  }
  prediction?: { home_score_predicted: number; away_score_predicted: number }
  canEdit: boolean
  onUpdatePrediction?: (homeScore: number, awayScore: number) => void
  className?: string
}

export function MatchCard({
  match,
  prediction,
  canEdit,
  onUpdatePrediction,
  className,
}: MatchCardProps) {
  const [isLocked, setIsLocked] = React.useState(false)

  React.useEffect(() => {
    const now = new Date()
    const kickoff = new Date(match.kickoff_at)
    const lockTime = new Date(kickoff.getTime() - 10 * 60 * 1000)
    setIsLocked(now >= lockTime)
  }, [match.kickoff_at])

  const borderColor = !isLocked && canEdit ? 'border-emerald-500' : isLocked ? 'border-red-500/30' : 'border-slate-700'
  const bgColor = isLocked ? 'bg-red-500/5' : canEdit ? 'bg-emerald-500/5' : 'bg-slate-900/50'

  const kickoffTime = new Date(match.kickoff_at).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const kickoffDate = new Date(match.kickoff_at).toLocaleDateString('es-CO', {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div
      className={cn(
        'rounded-lg border p-4 md:p-6',
        borderColor,
        bgColor,
        className
      )}
    >
      {/* Header: Stage & Stage */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-300 md:text-sm">
            {match.stage}
          </span>
          <span className="text-xs text-slate-400 md:text-sm">
            {kickoffDate} • {kickoffTime}
          </span>
        </div>
        <LockCountdown kickoffAt={match.kickoff_at} showTimer={true} />
      </div>

      {/* Teams & Score */}
      <div className="space-y-4">
        {/* Home Team */}
        <div className="flex items-center justify-between">
          <CountryBadge
            name={match.home_team.name}
            fifa_code={match.home_team.fifa_code}
            flag_svg_url={match.home_team.flag_svg_url}
            size="md"
          />
        </div>

        {/* Score Input */}
        {canEdit && !isLocked && (
          <ScoreInput
            homeScore={prediction?.home_score_predicted ?? 0}
            awayScore={prediction?.away_score_predicted ?? 0}
            onChangeHome={(score) => onUpdatePrediction?.(score, prediction?.away_score_predicted ?? 0)}
            onChangeAway={(score) => onUpdatePrediction?.(prediction?.home_score_predicted ?? 0, score)}
            locked={isLocked}
            matchId={match.id}
          />
        )}

        {/* Prediction Display (when locked) */}
        {(isLocked || !canEdit) && prediction && (
          <div className="flex items-center justify-center gap-3 py-2">
            <div className="text-right text-sm md:text-base">
              <div className="font-bold text-slate-50">{prediction.home_score_predicted}</div>
              <div className="text-xs text-slate-400">Pred</div>
            </div>
            <div className="text-xl font-bold text-slate-400">−</div>
            <div className="text-left text-sm md:text-base">
              <div className="font-bold text-slate-50">{prediction.away_score_predicted}</div>
              <div className="text-xs text-slate-400">Pred</div>
            </div>
          </div>
        )}

        {/* Away Team */}
        <div className="flex items-center justify-between">
          <CountryBadge
            name={match.away_team.name}
            fifa_code={match.away_team.fifa_code}
            flag_svg_url={match.away_team.flag_svg_url}
            size="md"
          />
        </div>
      </div>
    </div>
  )
}
`;

// BracketRenderer component
const bracketRenderer = `'use client'

import { useEffect, useRef, useState } from 'react'

interface BracketRendererProps {
  tournament: { id: string; name: string }
  qualified: {
    group_stage: Array<{ group: string; position: number; team: string }>
    round_of_16: string[]
    quarter_finals: string[]
    semi_finals: string[]
    third_place: [string, string]
    final: [string, string]
  }
  predictions: { home_team: string; away_team: string }[]
}

export function BracketRenderer({
  tournament,
  qualified,
  predictions,
}: BracketRendererProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const animateLines = () => {
      const paths = svgRef.current?.querySelectorAll('path')
      paths?.forEach((path) => {
        const length = path.getTotalLength()
        path.style.strokeDasharray = String(length)
        path.style.strokeDashoffset = String(length)
        path.style.transition = 'stroke-dashoffset 1.5s ease-out'
        setTimeout(() => {
          path.style.strokeDashoffset = '0'
        }, 100)
      })
    }

    animateLines()
  }, [qualified])

  const width = typeof window !== 'undefined' ? Math.min(window.innerWidth - 40, 1200) : 1200
  const height = 600

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-700 bg-slate-900/50 p-4">
      <svg
        ref={svgRef}
        viewBox={\`0 0 \${width} \${height}\`}
        className="mx-auto w-full min-w-max"
        style={{ aspectRatio: \`\${width} / \${height}\` }}
      >
        {/* Round of 16 */}
        {qualified.round_of_16.map((team, i) => (
          <text
            key={\`r16-\${i}\`}
            x="50"
            y={\`\${80 + i * 100}\`}
            className="cursor-pointer fill-slate-50 text-sm hover:fill-emerald-500"
            onClick={() => setSelectedTeam(team)}
            aria-label={\`Round of 16: \${team}\`}
          >
            {team.substring(0, 8)}
          </text>
        ))}

        {/* Quarter Finals */}
        {qualified.quarter_finals.map((team, i) => (
          <text
            key={\`qf-\${i}\`}
            x="300"
            y={\`\${130 + i * 200}\`}
            className="cursor-pointer fill-slate-50 text-sm hover:fill-emerald-500"
            onClick={() => setSelectedTeam(team)}
            aria-label={\`Quarter Finals: \${team}\`}
          >
            {team.substring(0, 8)}
          </text>
        ))}

        {/* Semi Finals */}
        {qualified.semi_finals.map((team, i) => (
          <text
            key={\`sf-\${i}\`}
            x="550"
            y={\`\${180 + i * 300}\`}
            className="cursor-pointer fill-slate-50 text-sm hover:fill-emerald-500"
            onClick={() => setSelectedTeam(team)}
            aria-label={\`Semi Finals: \${team}\`}
          >
            {team.substring(0, 8)}
          </text>
        ))}

        {/* Final */}
        <text
          x="750"
          y="200"
          className="cursor-pointer fill-slate-50 text-sm font-bold hover:fill-emerald-500"
          onClick={() => setSelectedTeam(qualified.final[0])}
          aria-label={\`Final: \${qualified.final[0]}\`}
        >
          {qualified.final[0]?.substring(0, 8)}
        </text>
        <text
          x="750"
          y="350"
          className="cursor-pointer fill-slate-50 text-sm font-bold hover:fill-emerald-500"
          onClick={() => setSelectedTeam(qualified.final[1])}
          aria-label={\`Final: \${qualified.final[1]}\`}
        >
          {qualified.final[1]?.substring(0, 8)}
        </text>

        {/* Champion placeholder */}
        <circle
          cx="950"
          cy="280"
          r="40"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-emerald-500/30"
        />
        <text
          x="930"
          y="290"
          className="fill-slate-400 text-xs"
        >
          Champion
        </text>
      </svg>

      {selectedTeam && (
        <div className="mt-4 rounded-md bg-slate-800 p-2 text-sm text-slate-50">
          Selected: <span className="font-semibold text-emerald-400">{selectedTeam}</span>
        </div>
      )}
    </div>
  )
}
`;

// LeaderboardTable component
const leaderboardTable = `'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'

interface ScoreRow {
  user_id: string
  name: string
  points_total: number
  rank: number
  completion_percent: number
}

interface LeaderboardTableProps {
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
    let aVal: any = a[sortBy]
    let bVal: any = b[sortBy]
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(Math.max(0, page - 1))}
            disabled={page === 0}
            className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-slate-50 hover:bg-slate-700 disabled:opacity-50 md:px-4"
          >
            ← Prev
          </button>
          <span className="text-sm text-slate-400">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
            disabled={page === totalPages - 1}
            className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-slate-50 hover:bg-slate-700 disabled:opacity-50 md:px-4"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  )
}
`;

// PoolConfigForm component
const poolConfigForm = `'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface BetPoolConfig {
  pts_winner_selection: number
  pts_exact_score: number
  pts_goal_difference: number
  pts_correct_side: number
  pts_all_correct_predictions: number
  [key: string]: number
}

interface PoolConfigFormProps {
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

    // Validation
    const errors = []
    Object.entries(config).forEach(([key, val]) => {
      if (val < 0) errors.push(\`\${key} must be >= 0\`)
      if (val > 50) errors.push(\`\${key} cannot exceed 50\`)
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
          ✓ Scoring rules saved successfully
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
`;

// Index/barrel export
const indexExport = `'use client'

export { CountryBadge } from './CountryBadge'
export type { CountryBadgeProps } from './CountryBadge'

export { ScoreInput } from './ScoreInput'
export type { ScoreInputProps } from './ScoreInput'

export { MatchCard } from './MatchCard'
export type { MatchCardProps } from './MatchCard'

export { LockCountdown } from './LockCountdown'
export type { LockCountdownProps } from './LockCountdown'

export { BracketRenderer } from './BracketRenderer'
export type { BracketRendererProps } from './BracketRenderer'

export { LeaderboardTable } from './LeaderboardTable'
export type { LeaderboardTableProps, ScoreRow as LeaderboardScoreRow } from './LeaderboardTable'

export { PoolConfigForm } from './PoolConfigForm'
export type { PoolConfigFormProps, BetPoolConfig } from './PoolConfigForm'
`;

const components = {
  'CountryBadge.tsx': countryBadge,
  'ScoreInput.tsx': scoreInput,
  'LockCountdown.tsx': lockCountdown,
  'MatchCard.tsx': matchCard,
  'BracketRenderer.tsx': bracketRenderer,
  'LeaderboardTable.tsx': leaderboardTable,
  'PoolConfigForm.tsx': poolConfigForm,
  'index.ts': indexExport,
};

Object.entries(components).forEach(([filename, content]) => {
  const filePath = path.join(betDir, filename);
  fs.writeFileSync(filePath, content);
  console.log(\`  ✓ \${filename}\`);
});

console.log(\`\n✅ All 8 files created successfully in \${betDir}\`);
