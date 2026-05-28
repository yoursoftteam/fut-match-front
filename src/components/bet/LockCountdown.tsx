'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export interface LockCountdownProps {
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

    return () => clearInterval(interval)
  }, [kickoffAt, onLocked])

  if (!mounted) return null

  if (isLocked) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-400">
        <span>LOCKED</span>
      </div>
    )
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400">
      {showTimer && <span>Edit closes in {timeLeft}</span>}
      {!showTimer && <span>Editable</span>}
    </div>
  )
}
