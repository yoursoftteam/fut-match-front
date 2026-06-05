-- Make views enforce RLS of underlying tables
-- This fixes Supabase security advisor lint "security_defender_view"
ALTER VIEW vw_bet_global_leaderboard SET (security_invoker = true);

-- vw_bet_pools_with_stats needs to bypass RLS for member counting
-- (cannot do COUNT(DISTINCT bpm.user_id) with per-user RLS on bet_pool_members)
ALTER VIEW vw_bet_pools_with_stats RESET (security_invoker);

-- Allow reading all global scores for leaderboard (all authenticated users)
DROP POLICY IF EXISTS "Global scores readable by all authenticated" ON bet_scores_aggregate;
CREATE POLICY "Global scores readable by all authenticated"
  ON bet_scores_aggregate
  FOR SELECT
  USING (mode = 'global');
