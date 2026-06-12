'use client'

import { useEffect, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

export function NextMatchCountdown({ kickoffAt }: { kickoffAt: string }) {
  const [label, setLabel] = useState('')
  const diffRef = useRef(0)

  useEffect(() => {
    const tick = () => {
      const diff = new Date(kickoffAt).getTime() - Date.now()
      diffRef.current = diff
      if (diff <= 0) { setLabel(''); return }
      const days = Math.floor(diff / 86400000)
      const hours = Math.floor((diff % 86400000) / 3600000)
      const minutes = Math.floor((diff % 3600000) / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      const parts: string[] = []
      if (days > 0) parts.push(`${days}d`)
      parts.push(`${hours}h`)
      parts.push(`${minutes}m`)
      parts.push(`${seconds}s`)
      setLabel(parts.join(' '))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [kickoffAt])

  if (!label) return null

  const colorClass = diffRef.current < 1_800_000
    ? 'text-red-400'
    : diffRef.current < 3_600_000
    ? 'text-orange-400'
    : 'text-emerald-400'

  return (
    <span className={cn('flex items-center gap-1 whitespace-nowrap text-[11px]', colorClass)}>
      <Clock className="size-3" aria-hidden="true" />
      <span className="text-muted-foreground">Próximo partido</span>
      {label}
    </span>
  )
}
