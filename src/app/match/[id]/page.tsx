import MatchPageClient from "./MatchPageClient";

interface MatchPageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params;
  
  if (!id) {
    return <div className="text-center py-8">ID de encuentro no proporcionado</div>;
  }

  return <MatchPageClient matchId={id} />;
}
