import type { Tournament } from "@/lib/tournament-schema"

interface TournamentAdminBentoProps {
  tournament: Tournament
  teamsCount: number
  paidCount: number
}

function statusLabel(status: Tournament["status"]) {
  if (status === "draft") return "Borrador"
  if (status === "open") return "Abierto"
  if (status === "in_progress") return "En juego"
  return "Finalizado"
}

export function TournamentAdminBento({ tournament, teamsCount, paidCount }: TournamentAdminBentoProps) {
  const remaining = Math.max(0, tournament.max_teams - teamsCount)

  return (
    <section aria-label="Métricas del torneo" className="grid grid-cols-2 gap-3 sm:grid-cols-5 sm:gap-4">
      <article className="card p-4 sm:p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Equipos inscritos</p>
        <p className="mt-2 text-2xl font-heading font-bold text-foreground">{teamsCount}</p>
      </article>

      <article className="card p-4 sm:p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Cupos restantes</p>
        <p className="mt-2 text-2xl font-heading font-bold text-primary">{remaining}</p>
      </article>

      <article className="card p-4 sm:p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Pagos confirmados</p>
        <p className="mt-2 text-2xl font-heading font-bold text-foreground">{paidCount}</p>
      </article>

      <article className="card p-4 sm:p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Estado</p>
        <p className="mt-2 text-2xl font-heading font-bold text-foreground">{statusLabel(tournament.status)}</p>
      </article>

      <article className="card p-4 sm:p-5">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Cierre inscripciones</p>
        <p className="mt-2 text-sm font-heading font-bold text-foreground leading-tight">
          {tournament.registration_deadline
            ? new Date(tournament.registration_deadline).toLocaleString("es-CO", {
                dateStyle: "long",
                timeStyle: "short",
              })
            : "Sin definir"}
        </p>
      </article>
    </section>
  )
}
