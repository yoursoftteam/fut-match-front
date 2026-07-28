import { Users, Trophy, DollarSign } from "lucide-react"
import type { Tournament } from "@/lib/tournament-schema"

interface TournamentAdminBentoProps {
  tournament: Tournament
  teamsCount: number
  paidCount: number
}

export function TournamentAdminBento({ tournament, teamsCount, paidCount }: TournamentAdminBentoProps) {
  const remaining = Math.max(0, tournament.max_teams - teamsCount)

  const metrics = [
    {
      label: "Equipos",
      value: teamsCount,
      sub: "inscritos",
      icon: Users,
      accent: false,
    },
    {
      label: "Cupos",
      value: remaining,
      sub: "disponibles",
      icon: Trophy,
      accent: true,
    },
    {
      label: "Pagos",
      value: paidCount,
      sub: "confirmados",
      icon: DollarSign,
      accent: false,
    },
  ] as const

  return (
    <section aria-label="Métricas del torneo" className="grid grid-cols-3 gap-3 sm:gap-4">
      {metrics.map((metric) => {
        const Icon = metric.icon
        return (
          <article
            key={metric.label}
            className="card p-4 sm:p-5 space-y-3"
          >
            <div className={`flex size-9 items-center justify-center rounded-lg ${
              metric.accent
                ? "bg-primary/15 text-primary"
                : "bg-muted text-muted-foreground"
            }`}>
              <Icon className="size-4.5" strokeWidth={metric.accent ? 2.5 : 2} />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                {metric.label}
                <span className="ml-1 font-normal lowercase text-muted-foreground/60">{metric.sub}</span>
              </p>
              <p className={`mt-0.5 text-2xl font-heading font-bold leading-none ${
                metric.accent ? "text-primary" : "text-foreground"
              }`}>
                {metric.value}
              </p>
            </div>
          </article>
        )
      })}
    </section>
  )
}
