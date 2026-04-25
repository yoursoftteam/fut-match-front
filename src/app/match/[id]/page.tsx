import MatchDetails from "@/components/MatchDetails";

export const runtime = "edge";

interface MatchPageProps {
  params: {
    id: string;
  };
}

export default function MatchPage({ params }: MatchPageProps) {
  const { id } = params;
  
  if (!id) {
    return <div className="text-center py-8">ID de partido no proporcionado</div>;
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="mx-auto">
        <MatchDetails matchId={id} />
      </div>
    </div>
  );
}