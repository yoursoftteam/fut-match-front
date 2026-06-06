import { createClient } from "@supabase/supabase-js";
import { PoolCreationWizard } from "@/components/bet/PoolCreationWizard";
import { redirect } from "next/navigation";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function getActiveTournament() {
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase
    .from("bet_tournaments")
    .select("id, name, slug, status")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data;
}

export default async function NewPoolPage() {
  const tournament = await getActiveTournament();

  if (!tournament) {
    redirect("/bet");
  }

  return (
    <PoolCreationWizard tournamentId={tournament.id} />
  );
}
