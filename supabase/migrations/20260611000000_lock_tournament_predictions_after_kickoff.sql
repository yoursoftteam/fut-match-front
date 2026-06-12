-- ============================================================================
-- Lock Tournament Predictions After First Match Kickoff
-- ============================================================================
-- Prevents users from modifying champion/subchampion/third_place predictions
-- after the tournament's first match has kicked off.
-- ============================================================================

-- ============================================================================
-- Helper: Check if tournament predictions are locked for a given pool
-- ============================================================================
-- Returns TRUE if NOW() >= tournament's kickoff_inaugural_at
CREATE OR REPLACE FUNCTION is_tournament_prediction_locked(pool_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  kickoff TIMESTAMPTZ;
BEGIN
  SELECT t.kickoff_inaugural_at INTO kickoff
  FROM bet_pools p
  JOIN bet_tournaments t ON t.id = p.tournament_id
  WHERE p.id = pool_id;

  IF kickoff IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN NOW() >= kickoff;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION is_tournament_prediction_locked(UUID) TO authenticated;

-- ============================================================================
-- Update RLS policies for bet_tournament_predictions
-- ============================================================================

DROP POLICY IF EXISTS "Users can insert their own tournament predictions" ON bet_tournament_predictions;
CREATE POLICY "Users can insert their own tournament predictions"
  ON bet_tournament_predictions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND NOT is_tournament_prediction_locked(pool_id)
  );

DROP POLICY IF EXISTS "Users can update their own tournament predictions" ON bet_tournament_predictions;
CREATE POLICY "Users can update their own tournament predictions"
  ON bet_tournament_predictions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND NOT is_tournament_prediction_locked(pool_id)
  );

-- ============================================================================
-- Trigger: Safety net for tournament prediction lock
-- ============================================================================
CREATE OR REPLACE FUNCTION check_tournament_prediction_lock()
RETURNS TRIGGER AS $$
BEGIN
  IF is_tournament_prediction_locked(NEW.pool_id) THEN
    RAISE EXCEPTION 'Cannot modify tournament prediction after the tournament has started (kickoff)';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_tournament_prediction_lock ON bet_tournament_predictions;
CREATE TRIGGER check_tournament_prediction_lock
  BEFORE INSERT OR UPDATE ON bet_tournament_predictions
  FOR EACH ROW
  EXECUTE FUNCTION check_tournament_prediction_lock();
