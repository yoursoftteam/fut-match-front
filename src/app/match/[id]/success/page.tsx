import type { Metadata } from "next";
import MatchSuccessClient from "./MatchSuccessClient";

interface MatchSuccessPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: MatchSuccessPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Partido Creado | Parti2`,
    description: `Detalles del partido creado con ID: ${id}`,
  };
}

export default async function MatchSuccessPage({ params }: MatchSuccessPageProps) {
  const { id } = await params;

  return <MatchSuccessClient matchId={id} />;
}