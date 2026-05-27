import type { StandingRow } from "@/lib/tournament-fixture"

interface TournamentStandingsTableProps {
  title: string
  rows: StandingRow[]
}

export function TournamentStandingsTable({ title, rows }: TournamentStandingsTableProps) {
  return (
    <section className="card overflow-hidden" aria-label={`Tabla de posiciones ${title}`}>
      <div className="border-b border-border px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{title}</h3>
      </div>

      {rows.length === 0 ? (
        <div className="px-4 py-6 text-sm text-muted-foreground sm:px-5">Todavía no hay resultados para esta tabla.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted/50 text-xs uppercase tracking-widest text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Pos</th>
                <th className="px-3 py-2 text-left">Equipo</th>
                <th className="px-3 py-2 text-center">PJ</th>
                <th className="px-3 py-2 text-center">PG</th>
                <th className="px-3 py-2 text-center">PE</th>
                <th className="px-3 py-2 text-center">PP</th>
                <th className="px-3 py-2 text-center">GF</th>
                <th className="px-3 py-2 text-center">GC</th>
                <th className="px-3 py-2 text-center">DG</th>
                <th className="px-3 py-2 text-center">Pts</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.team_id} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                  <td className="px-3 py-2 font-semibold text-foreground">{row.pos}</td>
                  <td className="px-3 py-2 text-foreground">{row.team_name}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{row.pj}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{row.pg}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{row.pe}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{row.pp}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{row.gf}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{row.gc}</td>
                  <td className="px-3 py-2 text-center text-muted-foreground">{row.dg}</td>
                  <td className="px-3 py-2 text-center font-semibold text-primary">{row.pts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
