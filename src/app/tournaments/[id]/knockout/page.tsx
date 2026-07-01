import type { Metadata } from "next"
import TournamentKnockoutClient from "./TournamentKnockoutClient"

interface PageProps {
  params: Promise<{ id: string }>
}

export const metadata: Metadata = {
  title: "Knockout | Parti2",
  description: "Fase de eliminación directa del torneo.",
}

export default async function TournamentKnockoutPage({ params }: PageProps) {
  const { id } = await params

  if (!id) {
    return <div className="py-10 text-center text-sm text-muted-foreground">ID de torneo no proporcionado.</div>
  }

  return <TournamentKnockoutClient tournamentId={id} />
}
