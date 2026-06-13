'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export interface LockCountdownProps {
  kickoffAt: string
  onLocked?: () => void
  showTimer?: boolean
  status?: 'scheduled' | 'live' | 'finished'
}

export function LockCountdown({
  kickoffAt,
  onLocked,
  showTimer = true,
  status,
}: LockCountdownProps) {
  const [isLocked, setIsLocked] = useState(false)
  const [timeLeft, setTimeLeft] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const id = setTimeout(() => setMounted(true), 0)

    const updateCountdown = () => {
      const now = new Date()
      const kickoff = new Date(kickoffAt)
      const lockTime = new Date(kickoff.getTime() - 10 * 60 * 1000)

      if (now >= lockTime) {
        setIsLocked(true)
        setTimeLeft('')
        onLocked?.()
      } else {
        const diff = lockTime.getTime() - now.getTime()
        const minutes = Math.floor(diff / 60000)
        const seconds = Math.floor((diff % 60000) / 1000)
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
        setIsLocked(false)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)

    return () => { clearTimeout(id); clearInterval(interval) }
  }, [kickoffAt, onLocked])

  if (!mounted) return null

  if (isLocked) {
    if (status === 'live') {
      return (
        <div className="inline-flex items-center gap-1.5 rounded-md bg-blue-500/10 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
          <span>En juego</span>
        </div>
      )
    }
    if (status === 'finished') {
      return (
        <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <span>Finalizado</span>
        </div>
      )
    }
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400">
        <span>Por iniciar</span>
      </div>
    )
  }

  if (showTimer) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
        <span>Edit closes in {timeLeft}</span>
      </div>
    )
  }

  return null
}
