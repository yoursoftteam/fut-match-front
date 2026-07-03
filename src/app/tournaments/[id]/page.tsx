import TournamentDetailClient from "./TournamentDetailClient"

interface TournamentDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function TournamentDetailPage({ params }: TournamentDetailPageProps) {
  const { id } = await params

  if (!id) {
    return <div className="py-10 text-center text-sm text-muted-foreground">ID de torneo no proporcionado.</div>
  }

  return <TournamentDetailClient tournamentId={id} />
}
