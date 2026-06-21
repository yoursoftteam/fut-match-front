'use client'

import { useEffect, useState, useRef } from 'react'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { MatchCard } from './MatchCard'
import { cn } from '@/lib/utils'

export interface CarouselMatchData {
  id: string
  home_team: { name: string; fifa_code: string; flag_svg_url: string }
  away_team: { name: string; fifa_code: string; flag_svg_url: string }
  kickoff_at: string
  stage: string
  group_name?: string
  status: 'scheduled' | 'live' | 'finished'
  home_score_official?: number | null
  away_score_official?: number | null
}

interface MatchDayCarouselProps {
  matches: CarouselMatchData[]
  initialIndex: number
  predictions: Record<string, { home_score_predicted: number; away_score_predicted: number } | null>
  onUpdatePrediction: (matchId: string, home: number, away: number) => Promise<void>
}

export function MatchDayCarousel({
  matches,
  initialIndex,
  predictions,
  onUpdatePrediction,
}: MatchDayCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [countdown, setCountdown] = useState('')
  const [isPaused, setIsPaused] = useState(false)
  const touchStartX = useRef(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const totalSlides = matches.length
  const currentMatch = matches[currentIndex]

  const goTo = (index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, totalSlides - 1)))
    resetAutoPlay()
  }

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % totalSlides)
    resetAutoPlay()
  }

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides)
    resetAutoPlay()
  }

  function resetAutoPlay() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Autoplay every 10s
  useEffect(() => {
    if (totalSlides <= 1 || isPaused) return
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalSlides)
    }, 10000)
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [totalSlides, isPaused])

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext()
      else goPrev()
    }
  }

  const onMouseEnter = () => setIsPaused(true)
  const onMouseLeave = () => setIsPaused(false)
  const onFocusCapture = () => setIsPaused(true)
  const onBlurCapture = () => setIsPaused(false)

  useEffect(() => {
    if (!currentMatch || currentMatch.status !== 'scheduled') {
      setCountdown('')
      return
    }

    const tick = () => {
      const diff = new Date(currentMatch.kickoff_at).getTime() - Date.now()
      if (diff <= 0) { setCountdown(''); return }
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      const parts: string[] = []
      if (days > 0) parts.push(`${days}d`)
      parts.push(`${hours}h`)
      parts.push(`${minutes}m`)
      parts.push(`${seconds}s`)
      setCountdown(parts.join(' '))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [currentIndex, currentMatch?.kickoff_at, currentMatch?.status, currentMatch])

  if (totalSlides === 0) return null

  const bannerLabel = currentMatch.status === 'scheduled'
    ? countdown
    : currentMatch.status === 'live'
    ? 'EN VIVO'
    : new Date(currentMatch.kickoff_at).toLocaleDateString('es-CO', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })

  return (
    <div className="mb-6 space-y-3">
      <h2 className="text-sm font-bold text-muted-foreground">Partidos del día</h2>
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-2.5 text-sm">
        <Clock className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />
        <span className="text-muted-foreground">Próximo partido:</span>
        <span className={cn(
          'font-mono font-semibold tabular-nums',
          currentMatch.status === 'live' ? 'text-red-400' : 'text-emerald-400'
        )}>
          {bannerLabel}
        </span>
      </div>

      <div
        className="relative"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        onFocusCapture={onFocusCapture}
        onBlurCapture={onBlurCapture}
      >
        {totalSlides > 1 && (
          <button
            type="button"
            onClick={goPrev}
            disabled={currentIndex === 0}
            className={cn(
              'absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 size-8 rounded-full border border-border bg-card flex items-center justify-center transition-colors',
              currentIndex === 0
                ? 'opacity-30 cursor-not-allowed'
                : 'text-muted-foreground hover:text-foreground cursor-pointer'
            )}
            aria-label="Partido anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
        )}

        <div className="overflow-hidden rounded-xl">
          <div
            className="flex transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${currentIndex * 100}%)` }}
          >
            {matches.map((m) => (
              <div key={m.id} className="w-full flex-shrink-0">
                <MatchCard
                  match={m}
                  prediction={predictions[m.id] ?? undefined}
                  canEdit={true}
                  onUpdatePrediction={(home, away) => onUpdatePrediction(m.id, home, away)}
                  compact
                />
              </div>
            ))}
          </div>
        </div>

        {totalSlides > 1 && (
          <button
            type="button"
            onClick={goNext}
            disabled={currentIndex === totalSlides - 1}
            className={cn(
              'absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 size-8 rounded-full border border-border bg-card flex items-center justify-center transition-colors',
              currentIndex === totalSlides - 1
                ? 'opacity-30 cursor-not-allowed'
                : 'text-muted-foreground hover:text-foreground cursor-pointer'
            )}
            aria-label="Siguiente partido"
          >
            <ChevronRight className="size-4" />
          </button>
        )}
      </div>

      {totalSlides > 1 && (
        <div className="flex justify-center gap-1.5" role="tablist" aria-label="Seleccionar partido">
          {matches.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === currentIndex}
              onClick={() => goTo(i)}
              className={cn(
                'size-2 rounded-full transition-all duration-300 cursor-pointer',
                i === currentIndex
                  ? 'bg-emerald-500 w-5'
                  : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
              )}
              aria-label={`Partido ${i + 1} de ${totalSlides}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
