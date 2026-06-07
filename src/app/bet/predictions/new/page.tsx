import { getAnonClient } from "@/lib/supabase-admin";
import { PoolCreationWizard } from "@/components/bet/PoolCreationWizard";
import { redirect } from "next/navigation";

async function getActiveTournament() {
  const supabase = getAnonClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("bet_tournaments")
    .select("id, name, slug, status")
    .in("status", ["active", "draft"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export default async function NewPredictionCompetitionPage() {
  const tournament = await getActiveTournament();

  if (!tournament) {
    redirect("/bet");
  }

  return (
    <PoolCreationWizard
      tournamentId={tournament.id}
      competitionType="predictions"
    />
  );
}
