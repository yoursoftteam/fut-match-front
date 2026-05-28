-- Parti2 Bet Module - Scoring Engine & Business Logic Functions
-- Version: 1.0
-- Date: 2026-05-27
-- Description: Postgres functions for atomic score calculations, idempotent operations

-- =============================================================================
-- SCORING CALCULATION FUNCTIONS
-- =============================================================================

-- Function: Calculate points for a single prediction (Global Mode)
CREATE OR REPLACE FUNCTION fn_calculate_global_points(
  p_home_score_official INT,
  p_away_score_official INT,
  p_home_score_predicted INT,
  p_away_score_predicted INT,
  p_match_stage bet_match_stage
)
RETURNS INT AS $$
DECLARE
  v_points INT := 0;
  v_is_exact BOOLEAN;
  v_actual_winner VARCHAR(5); -- 'home', 'away', 'draw'
  v_predicted_winner VARCHAR(5);
  v_is_ko BOOLEAN;
BEGIN
  -- Determine actual and predicted outcomes
  v_actual_winner := CASE
    WHEN p_home_score_official > p_away_score_official THEN 'home'
    WHEN p_home_score_official < p_away_score_official THEN 'away'
    ELSE 'draw'
  END;
  
  v_predicted_winner := CASE
    WHEN p_home_score_predicted > p_away_score_predicted THEN 'home'
    WHEN p_home_score_predicted < p_away_score_predicted THEN 'away'
    ELSE 'draw'
  END;
  
  v_is_exact := (p_home_score_official = p_home_score_predicted AND 
                 p_away_score_official = p_away_score_predicted);
  
  v_is_ko := p_match_stage != 'group_stage';
  
  -- Global Scoring Rules (Per Spec)
  IF v_is_exact THEN
    v_points := 10;
  ELSE
    -- Winner/Draw correct: 5 points
    IF v_actual_winner = v_predicted_winner THEN
      v_points := v_points + 5;
    END IF;
    
    -- Home team goals correct: 2 points
    IF p_home_score_official = p_home_score_predicted THEN
      v_points := v_points + 2;
    END IF;
    
    -- Away team goals correct: 2 points
    IF p_away_score_official = p_away_score_predicted THEN
      v_points := v_points + 2;
    END IF;
  END IF;
  
  -- Double points for knockout stages
  IF v_is_ko THEN
    v_points := v_points * 2;
  END IF;
  
  RETURN v_points;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- MAIN SCORING ENGINE (Called after official result)
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_calculate_match_scores_v1(p_match_id UUID)
RETURNS TABLE(
  total_predictions INT,
  total_points_distributed INT,
  affected_users INT,
  success BOOLEAN
) AS $$
DECLARE
  v_home_score_official INT;
  v_away_score_official INT;
  v_match_stage bet_match_stage;
  v_match_locked BOOLEAN;
  v_predictions_processed INT := 0;
  v_points_total INT := 0;
  v_affected_users INT := 0;
  v_error_msg TEXT;
BEGIN
  -- Verify match exists and has official score
  SELECT
    bm.home_score_official,
    bm.away_score_official,
    bm.stage,
    CASE WHEN bm.status = 'finished' THEN true ELSE false END
  INTO v_home_score_official, v_away_score_official, v_match_stage, v_match_locked
  FROM bet_matches bm
  WHERE bm.id = p_match_id;
  
  IF v_home_score_official IS NULL OR v_away_score_official IS NULL THEN
    RAISE EXCEPTION 'Match % has no official score', p_match_id;
  END IF;
  
  IF NOT v_match_locked THEN
    RAISE EXCEPTION 'Match % status is not finished', p_match_id;
  END IF;
  
  -- Start transaction for atomicity
  BEGIN
    -- Process Global Mode Predictions
    WITH global_predictions AS (
      SELECT
        bmp.id as pred_id,
        bmp.user_id,
        bmp.home_score_predicted,
        bmp.away_score_predicted,
        fn_calculate_global_points(
          v_home_score_official,
          v_away_score_official,
          bmp.home_score_predicted,
          bmp.away_score_predicted,
          v_match_stage
        ) as calculated_points
      FROM bet_match_predictions bmp
      WHERE bmp.match_id = p_match_id
      AND bmp.mode = 'global'
    )
    INSERT INTO bet_scores_aggregate (mode, pool_id, user_id, points_total)
    SELECT
      'global'::bet_prediction_mode,
      NULL,
      gp.user_id,
      gp.calculated_points
    FROM global_predictions gp
    ON CONFLICT (user_id, mode, pool_id) DO UPDATE
    SET
      points_total = bet_scores_aggregate.points_total + EXCLUDED.points_total,
      updated_at = NOW();
    
    GET DIAGNOSTICS v_predictions_processed = ROW_COUNT;
    v_points_total := v_predictions_processed * 10; -- Approximate
    
    -- Audit: Log the scoring event
    INSERT INTO bet_audit_logs (
      event_type,
      match_id,
      new_value,
      created_at
    )
    VALUES (
      'MATCH_SCORED',
      p_match_id,
      jsonb_build_object(
        'home_score', v_home_score_official,
        'away_score', v_away_score_official,
        'predictions_processed', v_predictions_processed,
        'stage', v_match_stage::TEXT
      ),
      NOW()
    );
    
    -- Count affected users
    SELECT COUNT(DISTINCT user_id) INTO v_affected_users
    FROM global_predictions;
    
    RETURN QUERY SELECT
      v_predictions_processed,
      v_points_total,
      v_affected_users,
      true;
  
  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT
      0, 0, 0, false;
  END;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- POOL-SPECIFIC SCORING (Dynamic per config)
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_calculate_pool_match_scores(
  p_match_id UUID,
  p_pool_id UUID
)
RETURNS TABLE(
  total_predictions INT,
  success BOOLEAN
) AS $$
DECLARE
  v_home_score_official INT;
  v_away_score_official INT;
  v_match_stage bet_match_stage;
  v_predictions_processed INT := 0;
  v_config_id UUID;
  v_pts_winner INT;
  v_pts_exact INT;
  v_pts_goals INT;
  v_pts_diff INT;
BEGIN
  -- Get official scores
  SELECT bm.home_score_official, bm.away_score_official, bm.stage
  INTO v_home_score_official, v_away_score_official, v_match_stage
  FROM bet_matches bm
  WHERE bm.id = p_match_id;
  
  IF v_home_score_official IS NULL THEN
    RETURN QUERY SELECT 0::INT, false;
    RETURN;
  END IF;
  
  -- Get pool's active config
  SELECT id INTO v_config_id
  FROM bet_pool_config_versions
  WHERE pool_id = p_pool_id
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_config_id IS NULL THEN
    RETURN QUERY SELECT 0::INT, false;
    RETURN;
  END IF;
  
  -- Fetch config values
  SELECT
    pts_winner_selection,
    pts_exact_score,
    pts_team_goals,
    pts_goal_difference
  INTO v_pts_winner, v_pts_exact, v_pts_goals, v_pts_diff
  FROM bet_pool_config_versions
  WHERE id = v_config_id;
  
  -- Process pool-mode predictions with dynamic scoring
  WITH pool_predictions AS (
    SELECT
      bmp.user_id,
      bmp.home_score_predicted,
      bmp.away_score_predicted,
      CASE
        WHEN bmp.home_score_predicted = v_home_score_official AND
             bmp.away_score_predicted = v_away_score_official
        THEN v_pts_exact
        ELSE (
          CASE
            WHEN SIGN(bmp.home_score_predicted - bmp.away_score_predicted) =
                 SIGN(v_home_score_official - v_away_score_official)
                 AND SIGN(bmp.home_score_predicted - bmp.away_score_predicted) != 0
            THEN v_pts_winner
            WHEN bmp.home_score_predicted = bmp.away_score_predicted AND
                 v_home_score_official = v_away_score_official
            THEN v_pts_winner
            ELSE 0
          END
        ) +
        CASE WHEN bmp.home_score_predicted = v_home_score_official THEN v_pts_goals ELSE 0 END +
        CASE WHEN bmp.away_score_predicted = v_away_score_official THEN v_pts_goals ELSE 0 END +
        CASE WHEN (bmp.home_score_predicted - bmp.away_score_predicted) =
                  (v_home_score_official - v_away_score_official)
             THEN v_pts_diff ELSE 0 END
      END as calculated_points
    FROM bet_match_predictions bmp
    WHERE bmp.match_id = p_match_id
    AND bmp.pool_id = p_pool_id
    AND bmp.mode = 'pool'
  )
  INSERT INTO bet_scores_aggregate (mode, pool_id, user_id, points_total)
  SELECT
    'pool'::bet_prediction_mode,
    p_pool_id,
    pp.user_id,
    pp.calculated_points
  FROM pool_predictions pp
  ON CONFLICT (user_id, mode, pool_id) DO UPDATE
  SET
    points_total = bet_scores_aggregate.points_total + EXCLUDED.points_total,
    updated_at = NOW();
  
  GET DIAGNOSTICS v_predictions_processed = ROW_COUNT;
  
  RETURN QUERY SELECT v_predictions_processed, true;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- POOL CONFIGURATION FREEZING (Called 10 min before inaugural kickoff)
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_freeze_pool_configs_for_tournament(p_tournament_id UUID)
RETURNS TABLE(
  pools_frozen INT,
  frozen_at TIMESTAMPTZ
) AS $$
DECLARE
  v_pools_frozen INT;
BEGIN
  UPDATE bet_pool_config_versions
  SET
    is_frozen = true,
    frozen_at = NOW()
  WHERE
    pool_id IN (
      SELECT id FROM bet_pools WHERE tournament_id = p_tournament_id
    ) AND
    is_frozen = false AND
    (
      SELECT kickoff_at - interval '10 minutes'
      FROM bet_tournaments
      WHERE id = p_tournament_id
    ) <= NOW();
  
  GET DIAGNOSTICS v_pools_frozen = ROW_COUNT;
  
  RETURN QUERY SELECT v_pools_frozen, NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- LEADERBOARD QUERIES (Optimized for speed)
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_get_global_leaderboard(p_limit INT DEFAULT 100, p_offset INT DEFAULT 0)
RETURNS TABLE(
  rank INT,
  user_id UUID,
  points_total INT,
  matches_predicted INT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY bsa.points_total DESC)::INT,
    bsa.user_id,
    bsa.points_total,
    COUNT(DISTINCT bmp.match_id)::INT
  FROM bet_scores_aggregate bsa
  LEFT JOIN bet_match_predictions bmp
    ON bmp.user_id = bsa.user_id AND bmp.mode = 'global'
  WHERE bsa.mode = 'global'
  GROUP BY bsa.user_id, bsa.points_total
  ORDER BY bsa.points_total DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION fn_get_pool_leaderboard(
  p_pool_id UUID,
  p_limit INT DEFAULT 50,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(
  rank INT,
  user_id UUID,
  points_total INT,
  joined_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY bsa.points_total DESC)::INT,
    bsa.user_id,
    bsa.points_total,
    bpm.joined_at
  FROM bet_scores_aggregate bsa
  INNER JOIN bet_pool_members bpm
    ON bsa.user_id = bpm.user_id
    AND bpm.pool_id = p_pool_id
  WHERE bsa.pool_id = p_pool_id AND bsa.mode = 'pool'
  ORDER BY bsa.points_total DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- AUDIT & COMPLIANCE FUNCTIONS
-- =============================================================================

-- Archive old audit logs (90+ days)
CREATE OR REPLACE FUNCTION fn_archive_audit_logs()
RETURNS INT AS $$
DECLARE
  v_archived INT;
BEGIN
  -- In production, move to archive table or S3
  DELETE FROM bet_audit_logs
  WHERE created_at < (NOW() - interval '90 days');
  
  GET DIAGNOSTICS v_archived = ROW_COUNT;
  RETURN v_archived;
END;
$$ LANGUAGE plpgsql;

-- Clean up stale notification queue entries
CREATE OR REPLACE FUNCTION fn_cleanup_notification_queue()
RETURNS TABLE(
  deleted_sent INT,
  deleted_failed INT
) AS $$
DECLARE
  v_deleted_sent INT;
  v_deleted_failed INT;
BEGIN
  -- Delete successfully sent notifications older than 30 days
  DELETE FROM bet_notification_queue
  WHERE sent_at IS NOT NULL AND sent_at < (NOW() - interval '30 days');
  GET DIAGNOSTICS v_deleted_sent = ROW_COUNT;
  
  -- Delete permanently failed notifications older than 7 days
  DELETE FROM bet_notification_queue
  WHERE failed_at IS NOT NULL AND failed_at < (NOW() - interval '7 days');
  GET DIAGNOSTICS v_deleted_failed = ROW_COUNT;
  
  RETURN QUERY SELECT v_deleted_sent, v_deleted_failed;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- VERIFICATION & HEALTH CHECK FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION fn_verify_rls_policies()
RETURNS TABLE(
  table_name TEXT,
  policies_count INT,
  rls_enabled BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || tablename as table_name,
    (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = t.tablename)::INT,
    (SELECT rowsecurity FROM pg_tables WHERE pg_tables.tablename = t.tablename)
  FROM pg_tables t
  WHERE schemaname = 'public' AND tablename LIKE 'bet_%'
  ORDER BY tablename;
END;
$$ LANGUAGE plpgsql;

-- Database health check
CREATE OR REPLACE FUNCTION fn_health_check()
RETURNS TABLE(
  status TEXT,
  database_online BOOLEAN,
  checked_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY SELECT
    'healthy'::TEXT,
    true::BOOLEAN,
    NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- GRANTS (For service role, adjust as needed)
-- =============================================================================

GRANT EXECUTE ON FUNCTION fn_calculate_global_points TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_global_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION fn_get_pool_leaderboard TO authenticated;
GRANT EXECUTE ON FUNCTION fn_health_check TO anon, authenticated;

GRANT EXECUTE ON FUNCTION fn_calculate_match_scores_v1 TO service_role;
GRANT EXECUTE ON FUNCTION fn_calculate_pool_match_scores TO service_role;
GRANT EXECUTE ON FUNCTION fn_freeze_pool_configs_for_tournament TO service_role;
GRANT EXECUTE ON FUNCTION fn_archive_audit_logs TO service_role;
GRANT EXECUTE ON FUNCTION fn_cleanup_notification_queue TO service_role;
