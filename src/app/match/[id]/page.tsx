"use client";

import { useParams } from "next/navigation";
import MatchDetails from "@/components/MatchDetails";

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();
  
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