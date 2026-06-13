import { getServiceClient } from "./supabase-admin";

export async function subscribeTokenToTopic(
  token: string,
  matchId: string,
): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) {
    throw new Error("Supabase service client not available");
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .upsert(
      { match_id: matchId, fcm_token: token },
      { onConflict: "match_id,fcm_token" },
    );

  if (error) {
    throw new Error(`Failed to store push subscription: ${error.message}`);
  }
}

export async function unsubscribeTokenFromTopic(
  token: string,
  matchId: string,
): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) {
    throw new Error("Supabase service client not available");
  }

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("match_id", matchId)
    .eq("fcm_token", token);

  if (error) {
    throw new Error(`Failed to remove push subscription: ${error.message}`);
  }
}
