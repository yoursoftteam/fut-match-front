import ManageTournamentClient from "./ManageTournamentClient"

interface ManageTournamentPageProps {
  params: Promise<{ id: string }>
}

export default async function ManageTournamentPage({ params }: ManageTournamentPageProps) {
  const { id } = await params

  if (!id) {
    return <div className="py-10 text-center text-sm text-muted-foreground">ID de torneo no proporcionado.</div>
  }

  return <ManageTournamentClient tournamentId={id} />
}
