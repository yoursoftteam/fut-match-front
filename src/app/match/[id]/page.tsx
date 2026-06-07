import MatchPageClient from "./MatchPageClient";

export const runtime = "edge";

interface MatchPageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params;
  
  if (!id) {
    return <div className="text-center py-8">ID de partido no proporcionado</div>;
  }

  return <MatchPageClient matchId={id} />;
}
