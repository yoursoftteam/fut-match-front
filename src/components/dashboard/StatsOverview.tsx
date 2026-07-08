'use client'

import { Calendar, Swords, Trophy } from 'lucide-react'

interface Stat {
  label: string
  value: number
  icon: typeof Calendar
  accent: string
}

interface StatsOverviewProps {
  createdCount: number
  registeredCount: number
  upcomingCount: number
}

const iconClass = "size-4"
const iconWrapClass = "size-9 rounded-xl flex items-center justify-center shrink-0"

export function StatsOverview({
  createdCount,
  registeredCount,
  upcomingCount,
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
      accent: 'bg-primary/10 text-primary border border-primary/20',
    },
    {
      label: 'Próximos partidos',
      value: upcomingCount,
      icon: Trophy,
      accent: 'bg-primary/10 text-primary border border-primary/20',
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
