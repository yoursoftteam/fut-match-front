import JoinTeamClient from "./JoinTeamClient"

interface JoinTeamPageProps {
  params: Promise<{ id: string; team_id: string }>
}

export default async function JoinTeamPage({ params }: JoinTeamPageProps) {
  const { id, team_id } = await params

  if (!id || !team_id) {
    return <div className="py-10 text-center text-sm text-muted-foreground">Link inválido.</div>
  }

  return <JoinTeamClient tournamentId={id} teamId={team_id} />
}
