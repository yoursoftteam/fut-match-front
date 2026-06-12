'use client'

import { useCallback, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { Minus, Plus } from 'lucide-react'

function StepperButton({
  icon: Icon,
  onClick,
  disabled,
  label,
  variant = 'default',
}: {
  icon: typeof Plus
  onClick: () => void
  disabled: boolean
  label: string
  variant?: 'default' | 'danger'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        'flex items-center justify-center rounded-lg font-bold select-none',
        'h-9 w-9',
        'transition-colors duration-100',
        'active:scale-[0.82] active:duration-[50ms]',
        disabled && 'opacity-30 cursor-not-allowed active:scale-100',
        !disabled && variant === 'danger' && [
          'bg-red-500/15 text-red-400',
          'hover:bg-red-500/25',
          'active:bg-red-500/35',
        ],
        !disabled && variant === 'default' && [
          'bg-emerald-500/15 text-emerald-400',
          'hover:bg-emerald-500/25',
          'active:bg-emerald-500/35',
        ]
      )}
    >
      <Icon className="size-[18px]" />
    </button>
  )
}

function ScoreDisplay({ value, touched }: { value: number; touched: boolean }) {
  const prev = useRef(value)
  const [pop, setPop] = useState(false)

  if (prev.current !== value) {
    prev.current = value
    if (!pop) setPop(true)
  }

  const showPlaceholder = !touched && value === 0

  return (
    <span
      onAnimationEnd={() => setPop(false)}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg font-bold tabular-nums',
        'text-base leading-none transition-all duration-200',
        pop && 'animate-[popBounce_250ms_ease-out]',
        showPlaceholder
          ? 'bg-muted/50 text-muted-foreground border border-dashed border-border/40'
          : 'bg-muted text-foreground border border-border'
      )}
    >
      {showPlaceholder ? '–' : value}
    </span>
  )
}

export interface ScoreInputProps {
  homeScore: number
  awayScore: number
  onChangeHome: (score: number) => void
  onChangeAway: (score: number) => void
  locked: boolean
  disabled?: boolean
  hasPrediction?: boolean
}

export function ScoreInput({
  homeScore,
  awayScore,
  onChangeHome,
  onChangeAway,
  locked,
  disabled = false,
  hasPrediction = false,
}: ScoreInputProps) {
  const   isDisabled = locked || disabled
  const [touchedHome, setTouchedHome] = useState(homeScore !== 0 || !!hasPrediction)
  const [touchedAway, setTouchedAway] = useState(awayScore !== 0 || !!hasPrediction)

  const makeHandler = useCallback(
    (setter: (v: number) => void, current: number, delta: 1 | -1, markTouched: () => void) => () => {
      markTouched()
      const next = Math.max(0, Math.min(99, current + delta))
      setter(next)
    },
    []
  )

  return (
    <div className="flex items-center justify-center gap-2">
      <div className="flex flex-col items-center gap-1">
        <StepperButton
          icon={Plus}
          onClick={makeHandler(onChangeHome, homeScore, 1, () => setTouchedHome(true))}
          disabled={isDisabled}
          label="+1 local"
        />
        <ScoreDisplay value={homeScore} touched={touchedHome} />
        <StepperButton
          icon={Minus}
          onClick={makeHandler(onChangeHome, homeScore, -1, () => setTouchedHome(true))}
          disabled={isDisabled}
          label="-1 local"
          variant="danger"
        />
      </div>

      <div className="flex flex-col items-center gap-1 pt-1">
        <span className="text-[11px] font-bold text-muted-foreground tracking-wider select-none">VS</span>
      </div>

      <div className="flex flex-col items-center gap-1">
        <StepperButton
          icon={Plus}
          onClick={makeHandler(onChangeAway, awayScore, 1, () => setTouchedAway(true))}
          disabled={isDisabled}
          label="+1 visitante"
        />
        <ScoreDisplay value={awayScore} touched={touchedAway} />
        <StepperButton
          icon={Minus}
          onClick={makeHandler(onChangeAway, awayScore, -1, () => setTouchedAway(true))}
          disabled={isDisabled}
          label="-1 visitante"
          variant="danger"
        />
      </div>
    </div>
  )
}
