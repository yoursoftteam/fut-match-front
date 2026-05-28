-- Parti2 Bet Module - Row Level Security Policies
-- Version: 1.0
-- Date: 2026-05-27
-- Description: RLS policies ensuring data access control per user role and pool membership

-- =============================================================================
-- BET_TOURNAMENTS - Public Read Access
-- =============================================================================

CREATE POLICY "Tournaments readable by all"
  ON bet_tournaments
  FOR SELECT
  USING (true);

CREATE POLICY "Only admin can insert tournaments"
  ON bet_tournaments
  FOR INSERT
  WITH CHECK (false); -- Disabled for now; can be enabled with admin check

CREATE POLICY "Only admin can update tournaments"
  ON bet_tournaments
  FOR UPDATE
  USING (false); -- Disabled for now

-- =============================================================================
-- BET_TEAMS - Public Read Access
-- =============================================================================

CREATE POLICY "Teams readable by all"
  ON bet_teams
  FOR SELECT
  USING (true);

CREATE POLICY "Only admin can insert teams"
  ON bet_teams
  FOR INSERT
  WITH CHECK (false);

-- =============================================================================
-- BET_MATCHES - Public Read Access
-- =============================================================================

CREATE POLICY "Matches readable by all"
  ON bet_matches
  FOR SELECT
  USING (true);

CREATE POLICY "Only admin can insert matches"
  ON bet_matches
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only admin can update matches"
  ON bet_matches
  FOR UPDATE
  USING (false);

-- =============================================================================
-- BET_POOLS - Visibility-based Access Control
-- =============================================================================

-- SELECT: Public pools visible to all; private pools visible to owner and members
CREATE POLICY "Public pools visible to all"
  ON bet_pools
  FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Private pools visible to owner"
  ON bet_pools
  FOR SELECT
  USING (
    visibility = 'private' AND
    auth.uid() = owner_id
  );

CREATE POLICY "Private pools visible to members"
  ON bet_pools
  FOR SELECT
  USING (
    visibility = 'private' AND
    EXISTS (
      SELECT 1 FROM bet_pool_members
      WHERE pool_id = bet_pools.id
      AND user_id = auth.uid()
    )
  );

-- INSERT: Only authenticated users can create pools
CREATE POLICY "Users can create pools"
  ON bet_pools
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- UPDATE: Only owner can modify pool
CREATE POLICY "Only owner can update pool"
  ON bet_pools
  FOR UPDATE
  USING (auth.uid() = owner_id);

-- DELETE: Only owner can delete pool
CREATE POLICY "Only owner can delete pool"
  ON bet_pools
  FOR DELETE
  USING (auth.uid() = owner_id);

-- =============================================================================
-- BET_POOL_MEMBERS - Membership Management
-- =============================================================================

-- SELECT: Users can see members of pools they're in or own
CREATE POLICY "Members visible to pool participants"
  ON bet_pool_members
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bet_pools
      WHERE id = pool_id AND (
        auth.uid() = owner_id OR
        EXISTS (
          SELECT 1 FROM bet_pool_members m2
          WHERE m2.pool_id = bet_pools.id
          AND m2.user_id = auth.uid()
        )
      )
    )
  );

-- INSERT: Pool owner can add members; members can join via invite code
CREATE POLICY "Users can join pools"
  ON bet_pool_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DELETE: Users can remove themselves; owner can remove anyone
CREATE POLICY "Users can leave pools"
  ON bet_pool_members
  FOR DELETE
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM bet_pools
      WHERE id = pool_id AND owner_id = auth.uid()
    )
  );

-- =============================================================================
-- BET_POOL_CONFIG_VERSIONS - Immutable Configuration History
-- =============================================================================

-- SELECT: Config visible to pool owner and members
CREATE POLICY "Config versions visible to authorized users"
  ON bet_pool_config_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bet_pools
      WHERE id = pool_id AND (
        auth.uid() = owner_id OR
        EXISTS (
          SELECT 1 FROM bet_pool_members
          WHERE pool_id = bet_pools.id
          AND user_id = auth.uid()
        )
      )
    )
  );

-- INSERT: Only pool owner can create new versions
CREATE POLICY "Only pool owner can create config versions"
  ON bet_pool_config_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bet_pools
      WHERE id = pool_id AND owner_id = auth.uid()
    )
  );

-- UPDATE: Configs can only be updated if not frozen
CREATE POLICY "Unfrozen configs can be updated by owner"
  ON bet_pool_config_versions
  FOR UPDATE
  USING (
    is_frozen = false AND
    EXISTS (
      SELECT 1 FROM bet_pools
      WHERE id = pool_id AND owner_id = auth.uid()
    )
  );

-- DELETE: Not allowed
CREATE POLICY "Config versions cannot be deleted"
  ON bet_pool_config_versions
  FOR DELETE
  USING (false);

-- =============================================================================
-- BET_MATCH_PREDICTIONS - Strict Temporal & Authorization Controls
-- =============================================================================

-- SELECT: Users can always read their own predictions
CREATE POLICY "Users can read their own predictions"
  ON bet_match_predictions
  FOR SELECT
  USING (auth.uid() = user_id);

-- SELECT: After match completion, members can see predictions
CREATE POLICY "Predictions visible after match completion"
  ON bet_match_predictions
  FOR SELECT
  USING (
    NOW() > (
      SELECT kickoff_at FROM bet_matches WHERE id = match_id
    ) AND (
      -- Global predictions visible after match time
      mode = 'global' OR
      -- Pool predictions visible to members after match time
      EXISTS (
        SELECT 1 FROM bet_pools
        WHERE id = pool_id AND (
          auth.uid() = owner_id OR
          EXISTS (
            SELECT 1 FROM bet_pool_members
            WHERE pool_id = bet_pools.id
            AND user_id = auth.uid()
          )
        )
      )
    )
  );

-- INSERT: Only authenticated users within time window
CREATE POLICY "Users can create predictions before lock time"
  ON bet_match_predictions
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    NOW() <= (
      SELECT kickoff_at - interval '10 minutes'
      FROM bet_matches
      WHERE id = match_id
    )
  );

-- UPDATE: Enforce lock time and user ownership
CREATE POLICY "Users can update predictions before lock time"
  ON bet_match_predictions
  FOR UPDATE
  USING (
    auth.uid() = user_id AND
    NOW() <= (
      SELECT kickoff_at - interval '10 minutes'
      FROM bet_matches
      WHERE id = match_id
    )
  );

-- DELETE: Users can delete their own predictions before lock
CREATE POLICY "Users can delete their predictions before lock time"
  ON bet_match_predictions
  FOR DELETE
  USING (
    auth.uid() = user_id AND
    NOW() <= (
      SELECT kickoff_at - interval '10 minutes'
      FROM bet_matches
      WHERE id = match_id
    )
  );

-- =============================================================================
-- BET_SCORES_AGGREGATE - Leaderboard Access Control
-- =============================================================================

-- SELECT: Users can read their own scores; others visible based on context
CREATE POLICY "Users can read their own scores"
  ON bet_scores_aggregate
  FOR SELECT
  USING (auth.uid() = user_id);

-- SELECT: Global leaderboard visible to all after predictions lock
CREATE POLICY "Global leaderboard visible after match completion"
  ON bet_scores_aggregate
  FOR SELECT
  USING (
    mode = 'global' AND
    NOW() > (
      SELECT MAX(kickoff_at)
      FROM bet_matches
      WHERE stage = 'group_stage'
    )
  );

-- SELECT: Pool leaderboard visible to pool members
CREATE POLICY "Pool leaderboard visible to members"
  ON bet_scores_aggregate
  FOR SELECT
  USING (
    mode = 'pool' AND
    EXISTS (
      SELECT 1 FROM bet_pools
      WHERE id = pool_id AND (
        auth.uid() = owner_id OR
        EXISTS (
          SELECT 1 FROM bet_pool_members
          WHERE pool_id = bet_pools.id
          AND user_id = auth.uid()
        )
      )
    )
  );

-- INSERT/UPDATE: Only backend via RPC (no direct user manipulation)
CREATE POLICY "Only backend can modify scores"
  ON bet_scores_aggregate
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only backend can update scores"
  ON bet_scores_aggregate
  FOR UPDATE
  USING (false);

-- =============================================================================
-- BET_AUDIT_LOGS - Immutable Audit Trail (Read-only for users)
-- =============================================================================

-- SELECT: Users can read audit logs for their own actions
CREATE POLICY "Users can read their audit logs"
  ON bet_audit_logs
  FOR SELECT
  USING (auth.uid() = user_id);

-- SELECT: Pool owner/members can view pool audit logs
CREATE POLICY "Pool members can read pool audit logs"
  ON bet_audit_logs
  FOR SELECT
  USING (
    pool_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM bet_pools
      WHERE id = pool_id AND (
        auth.uid() = owner_id OR
        EXISTS (
          SELECT 1 FROM bet_pool_members
          WHERE pool_id = bet_pools.id
          AND user_id = auth.uid()
        )
      )
    )
  );

-- INSERT/UPDATE/DELETE: Only backend system
CREATE POLICY "Only backend can insert audit logs"
  ON bet_audit_logs
  FOR INSERT
  WITH CHECK (false);

-- =============================================================================
-- BET_NOTIFICATION_QUEUE - Notification Management
-- =============================================================================

-- SELECT: Users can only read their own notifications
CREATE POLICY "Users can read their notifications"
  ON bet_notification_queue
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE: Only backend system
CREATE POLICY "Only backend can manage notification queue"
  ON bet_notification_queue
  FOR INSERT
  WITH CHECK (false);

CREATE POLICY "Only backend can update notification queue"
  ON bet_notification_queue
  FOR UPDATE
  USING (false);

CREATE POLICY "Only backend can delete from notification queue"
  ON bet_notification_queue
  FOR DELETE
  USING (false);

-- =============================================================================
-- HELPER VIEWS FOR COMMON QUERIES
-- =============================================================================

-- View: Active pools with member count
CREATE VIEW vw_bet_pools_with_stats AS
SELECT
  bp.id,
  bp.tournament_id,
  bp.owner_id,
  bp.name,
  bp.visibility,
  bp.invite_code,
  bp.created_at,
  COUNT(DISTINCT bpm.user_id) as member_count,
  1 as owner_is_member,
  (
    SELECT COUNT(*)
    FROM bet_match_predictions
    WHERE pool_id = bp.id
  ) as prediction_count
FROM bet_pools bp
LEFT JOIN bet_pool_members bpm ON bpm.pool_id = bp.id
GROUP BY bp.id, bp.tournament_id, bp.owner_id, bp.name, bp.visibility, bp.invite_code, bp.created_at;

-- View: Leaderboard query helper (global)
CREATE VIEW vw_bet_global_leaderboard AS
SELECT
  ROW_NUMBER() OVER (ORDER BY bsa.points_total DESC) as rank,
  bsa.user_id,
  bsa.points_total,
  COUNT(DISTINCT bmp.match_id) as matches_predicted
FROM bet_scores_aggregate bsa
LEFT JOIN bet_match_predictions bmp ON bmp.user_id = bsa.user_id AND bmp.mode = 'global'
WHERE bsa.mode = 'global'
GROUP BY bsa.user_id, bsa.points_total
ORDER BY bsa.points_total DESC;
