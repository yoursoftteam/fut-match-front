'use client'

import { Calendar, Trophy, Target, Swords } from 'lucide-react'

interface Stat {
  label: string
  value: number
  icon: typeof Calendar
  accent?: string
}

interface StatsOverviewProps {
  createdCount: number
  registeredCount: number
  upcomingCount: number
  predictionsCount: number
}

const iconClass = "size-4"
const iconWrapClass = "size-9 rounded-xl flex items-center justify-center shrink-0"

export function StatsOverview({
  createdCount,
  registeredCount,
  upcomingCount,
  predictionsCount,
}: StatsOverviewProps) {
  const stats: Stat[] = [
    {
      label: 'Partidos creados',
      value: createdCount,
      icon: Calendar,
      accent: 'bg-primary/10 text-primary border border-primary/20',
    },
    {
      label: 'Inscripciones activas',
      value: registeredCount,
      icon: Swords,
      accent: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
    },
    {
      label: 'Próximos partidos',
      value: upcomingCount,
      icon: Trophy,
      accent: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
    },
    {
      label: 'Predicciones',
      value: predictionsCount,
      icon: Target,
      accent: 'bg-green-500/10 text-green-400 border border-green-500/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="card p-4 flex items-center gap-3"
          >
            <div className={`${iconWrapClass} ${stat.accent}`}>
              <Icon className={iconClass} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold font-heading text-foreground leading-none">
                {stat.value}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-tight">
                {stat.label}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
