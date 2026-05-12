import MatchDetails from "@/components/MatchDetails";

interface MatchPageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { id } = await params;
  
  if (!id) {
    return <div className="text-center py-8">ID de encuentro no proporcionado</div>;
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto">
        <MatchDetails matchId={id} />
      </div>
    </div>
  );
}