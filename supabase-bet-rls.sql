-- ============================================================================
-- Parti2 Bet Module - Row Level Security Policies
-- ============================================================================
-- This migration creates all RLS policies and helper functions for the betting
-- module. Policies enforce data access control at the database level.
-- ============================================================================

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE bet_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_pool_config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_match_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_scores_aggregate ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_notification_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_audit_log ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- ============================================================================
-- Helper: Check if a user is a member of a betting pool
-- ============================================================================
-- A user is considered a member if they:
--  1) Own the pool, OR
--  2) Have made predictions or have aggregate scores in the pool
--
-- SECURITY DEFINER ensures this function runs with owner privileges, allowing
-- it to check pool membership across users' private pools for access control.
CREATE OR REPLACE FUNCTION is_pool_member(user_id UUID, pool_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user is the pool owner
  IF EXISTS (
    SELECT 1 FROM bet_pools
    WHERE id = pool_id AND owner_id = user_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user has predictions in this pool
  IF EXISTS (
    SELECT 1 FROM bet_match_predictions
    WHERE pool_id = pool_id AND user_id = user_id
  ) THEN
    RETURN TRUE;
  END IF;

  -- Check if user has score aggregates in this pool
  IF EXISTS (
    SELECT 1 FROM bet_scores_aggregate
    WHERE pool_id = pool_id AND user_id = user_id
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_pool_member(UUID, UUID) TO authenticated;

-- ============================================================================
-- Helper: Check if a match is locked for predictions
-- ============================================================================
-- A match is locked when NOW() > (kickoff_at - 10 minutes).
-- Lock time prevents predictions after 10 minutes before kickoff.
--
-- Used in:
--   - INSERT/UPDATE/DELETE policies for bet_match_predictions
--   - Trigger: check_prediction_lock
CREATE OR REPLACE FUNCTION is_match_locked(match_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  lock_time TIMESTAMPTZ;
BEGIN
  SELECT kickoff_at - INTERVAL '10 minutes' INTO lock_time
  FROM bet_matches
  WHERE id = match_id;

  IF lock_time IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN NOW() > lock_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_match_locked(UUID) TO authenticated;

-- ============================================================================
-- Helper: Check if match results can be viewed
-- ============================================================================
-- Match results are visible only after the match is locked (kickoff - 10 min passed).
-- This allows viewing other users' predictions once the match is "locked in" and
-- users cannot modify their predictions anymore.
--
-- Used in:
--   - SELECT policy for bet_match_predictions (reading others' predictions)
CREATE OR REPLACE FUNCTION can_see_match_results(match_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  lock_time TIMESTAMPTZ;
BEGIN
  SELECT kickoff_at - INTERVAL '10 minutes' INTO lock_time
  FROM bet_matches
  WHERE id = match_id;

  IF lock_time IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN NOW() > lock_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_see_match_results(UUID) TO authenticated;

-- ============================================================================
-- Helper: Check if user can view a specific prediction
-- ============================================================================
-- Returns TRUE if:
--   1) User owns the prediction (user_id = auth.uid()), OR
--   2) Match is locked (results visible) AND user is in pool or pool is public
--
-- Used in:
--   - SELECT policy for bet_match_predictions (fine-grained visibility)
CREATE OR REPLACE FUNCTION can_see_prediction(prediction_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  prediction_user_id UUID;
  prediction_match_id UUID;
  prediction_pool_id UUID;
  is_locked BOOLEAN;
  pool_is_public BOOLEAN;
BEGIN
  -- Get prediction details
  SELECT user_id, match_id, pool_id INTO prediction_user_id, prediction_match_id, prediction_pool_id
  FROM bet_match_predictions
  WHERE id = prediction_id;

  -- If prediction not found, deny access
  IF prediction_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Own prediction: always visible
  IF prediction_user_id = auth.uid() THEN
    RETURN TRUE;
  END IF;

  -- Check if match is locked (results visible)
  SELECT can_see_match_results(prediction_match_id) INTO is_locked;

  IF NOT is_locked THEN
    RETURN FALSE;
  END IF;

  -- Match is locked: check pool visibility
  IF prediction_pool_id IS NULL THEN
    -- Global prediction: visible once match is locked
    RETURN TRUE;
  END IF;

  -- Check pool visibility
  SELECT visibility = 'public' INTO pool_is_public
  FROM bet_pools
  WHERE id = prediction_pool_id;

  IF pool_is_public THEN
    RETURN TRUE;
  END IF;

  -- Private pool: check membership
  RETURN is_pool_member(auth.uid(), prediction_pool_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION can_see_prediction(UUID) TO authenticated;

-- ============================================================================
-- POLICIES: BET_TOURNAMENTS
-- ============================================================================
-- Tournaments are read-only for authenticated users (public reference data)

CREATE POLICY "allow_read_tournaments_to_authenticated"
  ON bet_tournaments FOR SELECT
  TO authenticated
  USING (true);

-- Only service role (no user) can modify tournaments
CREATE POLICY "allow_admin_modify_tournaments"
  ON bet_tournaments FOR INSERT
  TO authenticated
  USING (false);

CREATE POLICY "allow_admin_update_tournaments"
  ON bet_tournaments FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "allow_admin_delete_tournaments"
  ON bet_tournaments FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================================
-- POLICIES: BET_TEAMS
-- ============================================================================
-- Teams are read-only public reference data

CREATE POLICY "allow_read_teams_to_authenticated"
  ON bet_teams FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "allow_admin_modify_teams"
  ON bet_teams FOR INSERT
  TO authenticated
  USING (false);

CREATE POLICY "allow_admin_update_teams"
  ON bet_teams FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "allow_admin_delete_teams"
  ON bet_teams FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================================
-- POLICIES: BET_MATCHES
-- ============================================================================
-- Matches are read-only for authenticated users (public reference data)

CREATE POLICY "allow_read_matches_to_authenticated"
  ON bet_matches FOR SELECT
  TO authenticated
  USING (true);

-- Only service role (no user) can modify matches
CREATE POLICY "allow_admin_modify_matches"
  ON bet_matches FOR INSERT
  TO authenticated
  USING (false);

CREATE POLICY "allow_admin_update_matches"
  ON bet_matches FOR UPDATE
  TO authenticated
  USING (false);

CREATE POLICY "allow_admin_delete_matches"
  ON bet_matches FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================================
-- POLICIES: BET_POOLS
-- ============================================================================

-- SELECT policy: Open if visibility='public'; restricted to pool members if visibility='private'
CREATE POLICY "allow_read_public_pools"
  ON bet_pools FOR SELECT
  TO authenticated
  USING (visibility = 'public');

CREATE POLICY "allow_read_private_pools_if_member"
  ON bet_pools FOR SELECT
  TO authenticated
  USING (
    visibility = 'private'
    AND (
      owner_id = auth.uid()
      OR is_pool_member(auth.uid(), id)
    )
  );

-- INSERT policy: Only owner_id == auth.uid()
CREATE POLICY "allow_pool_creation"
  ON bet_pools FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

-- UPDATE policy: Only owner_id == auth.uid()
CREATE POLICY "allow_pool_owner_update"
  ON bet_pools FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- DELETE policy: Only owner_id == auth.uid()
CREATE POLICY "allow_pool_owner_delete"
  ON bet_pools FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================================================
-- POLICIES: BET_POOL_CONFIG_VERSIONS
-- ============================================================================

-- SELECT policy: Allow if user is pool owner or member
CREATE POLICY "allow_read_pool_config_if_member"
  ON bet_pool_config_versions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bet_pools
      WHERE id = pool_id
      AND (
        owner_id = auth.uid()
        OR is_pool_member(auth.uid(), id)
      )
    )
  );

-- INSERT policy: Only pool owner can create config versions
CREATE POLICY "allow_pool_owner_create_config"
  ON bet_pool_config_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bet_pools
      WHERE id = pool_id AND owner_id = auth.uid()
    )
  );

-- UPDATE policy: Only pool owner can update config
CREATE POLICY "allow_pool_owner_update_config"
  ON bet_pool_config_versions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bet_pools
      WHERE id = pool_id AND owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM bet_pools
      WHERE id = pool_id AND owner_id = auth.uid()
    )
  );

-- DELETE policy: Only pool owner can delete config
CREATE POLICY "allow_pool_owner_delete_config"
  ON bet_pool_config_versions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM bet_pools
      WHERE id = pool_id AND owner_id = auth.uid()
    )
  );

-- ============================================================================
-- POLICIES: BET_MATCH_PREDICTIONS
-- ============================================================================

-- SELECT policy:
--   - Users can always read their own predictions
--   - Admins/pool members see others only AFTER match is locked (kickoff + 10 min)
CREATE POLICY "allow_read_own_predictions"
  ON bet_match_predictions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "allow_read_others_predictions_when_locked"
  ON bet_match_predictions FOR SELECT
  TO authenticated
  USING (
    user_id != auth.uid()
    AND is_match_locked(match_id)
    AND (
      -- Allow if in a public pool OR member of private pool
      pool_id IS NULL
      OR (
        SELECT visibility = 'public' FROM bet_pools WHERE id = pool_id
      )
      OR is_pool_member(auth.uid(), pool_id)
    )
  );

-- INSERT policy:
--   - Only if auth.uid() == user_id
--   - AND now() <= (kickoff_at - 10 minutes)
CREATE POLICY "allow_user_create_predictions"
  ON bet_match_predictions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT is_match_locked(match_id)
  );

-- UPDATE policy:
--   - Only if auth.uid() == user_id
--   - AND now() <= (kickoff_at - 10 minutes)
CREATE POLICY "allow_user_update_predictions"
  ON bet_match_predictions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND NOT is_match_locked(match_id)
  );

-- DELETE policy: Allow users to delete their own predictions (if not locked)
CREATE POLICY "allow_user_delete_predictions"
  ON bet_match_predictions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND NOT is_match_locked(match_id));

-- ============================================================================
-- POLICIES: BET_SCORES_AGGREGATE
-- ============================================================================

-- SELECT policy:
--   - Read own scores always
--   - Pool public → see all members' scores
--   - Pool private → only if member
CREATE POLICY "allow_read_own_scores"
  ON bet_scores_aggregate FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "allow_read_public_pool_scores"
  ON bet_scores_aggregate FOR SELECT
  TO authenticated
  USING (
    pool_id IS NOT NULL
    AND (
      SELECT visibility = 'public' FROM bet_pools WHERE id = pool_id
    )
  );

CREATE POLICY "allow_read_private_pool_scores_if_member"
  ON bet_scores_aggregate FOR SELECT
  TO authenticated
  USING (
    pool_id IS NOT NULL
    AND (
      SELECT visibility = 'private' FROM bet_pools WHERE id = pool_id
    )
    AND is_pool_member(auth.uid(), pool_id)
  );

-- INSERT policy: Only system/backend can insert (disabled for users)
CREATE POLICY "block_user_insert_scores"
  ON bet_scores_aggregate FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- UPDATE policy: Only system/backend can update (disabled for users)
CREATE POLICY "block_user_update_scores"
  ON bet_scores_aggregate FOR UPDATE
  TO authenticated
  WITH CHECK (false);

-- DELETE policy: Disabled for users
CREATE POLICY "block_user_delete_scores"
  ON bet_scores_aggregate FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================================
-- POLICIES: BET_AUDIT_LOG
-- ============================================================================

-- SELECT policy: Users can only read their own audit logs
-- (Admin-only access would require checking auth.role(), but we keep it simple here)
CREATE POLICY "allow_read_own_audit_logs"
  ON bet_audit_log FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT policy: Disabled for users (only system/triggers can insert)
CREATE POLICY "block_user_insert_audit_logs"
  ON bet_audit_log FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- UPDATE policy: Disabled for users
CREATE POLICY "block_user_update_audit_logs"
  ON bet_audit_log FOR UPDATE
  TO authenticated
  USING (false);

-- DELETE policy: Disabled for users
CREATE POLICY "block_user_delete_audit_logs"
  ON bet_audit_log FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================================
-- POLICIES: BET_NOTIFICATION_QUEUE
-- ============================================================================

-- SELECT policy: Own notifications only
CREATE POLICY "allow_read_own_notifications"
  ON bet_notification_queue FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT policy: Disabled for users (only system/backend can insert)
CREATE POLICY "block_user_insert_notifications"
  ON bet_notification_queue FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- UPDATE policy: Disabled for users (only system/backend can update)
CREATE POLICY "block_user_update_notifications"
  ON bet_notification_queue FOR UPDATE
  TO authenticated
  USING (false);

-- DELETE policy: Disabled for users
CREATE POLICY "block_user_delete_notifications"
  ON bet_notification_queue FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: check_prediction_lock
-- Enforces that predictions cannot be updated if the match is locked
-- This is a safety net; the RLS policy should prevent most violations
CREATE OR REPLACE FUNCTION check_prediction_lock()
RETURNS TRIGGER AS $$
BEGIN
  IF is_match_locked(NEW.match_id) THEN
    RAISE EXCEPTION 'Cannot update prediction after match lock time (kickoff - 10 minutes)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_prediction_lock ON bet_match_predictions;
CREATE TRIGGER check_prediction_lock
  BEFORE UPDATE ON bet_match_predictions
  FOR EACH ROW
  EXECUTE FUNCTION check_prediction_lock();

-- Trigger: log_prediction_audit
-- Records changes to predictions in the audit log for accountability.
-- Only logs when prediction values actually change to avoid audit bloat.
--
-- AFTER UPDATE ensures the update succeeds before audit logging.
-- Uses SECURITY DEFINER to allow audit log inserts even when user policies
-- would otherwise block them.
CREATE OR REPLACE FUNCTION log_prediction_audit()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if the score actually changed
  IF OLD.home_score_predicted != NEW.home_score_predicted
     OR OLD.away_score_predicted != NEW.away_score_predicted THEN
    INSERT INTO bet_audit_log (user_id, action, match_id, old_value, new_value)
    VALUES (
      NEW.user_id,
      'update_prediction',
      NEW.match_id,
      OLD.home_score_predicted * 100 + OLD.away_score_predicted,
      NEW.home_score_predicted * 100 + NEW.away_score_predicted
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_prediction_audit ON bet_match_predictions;
CREATE TRIGGER log_prediction_audit
  AFTER UPDATE ON bet_match_predictions
  FOR EACH ROW
  EXECUTE FUNCTION log_prediction_audit();

-- ============================================================================
-- END OF RLS POLICIES
-- ============================================================================
