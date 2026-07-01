import type { Metadata } from "next"
import TournamentMatchesClient from "./TournamentMatchesClient"

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: "Resultados | Parti2",
  description: "Registra los marcadores de cada jornada del torneo.",
}

export default async function TournamentMatchesPage({ params }: PageProps) {
  const { id } = await params

  if (!id) {
    return <div className="py-10 text-center text-sm text-muted-foreground">ID de torneo no proporcionado.</div>
  }

  return <TournamentMatchesClient tournamentId={id} />
}
