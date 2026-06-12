-- Add bet_scores_details table for per-match / per-tournament score tracking.
-- Enables reverting/recalculating individual scores by source (match or tournament).
-- Scoring functions are now fully recalculative: DELETE old details for the source,
-- INSERT fresh ones, then rebuild the aggregate from all details.

-- 1. Create bet_scores_details table
CREATE TABLE IF NOT EXISTS bet_scores_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode bet_prediction_mode NOT NULL,
  pool_id UUID REFERENCES bet_pools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('match', 'tournament')),
  source_id TEXT NOT NULL,
  points INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (mode, pool_id, user_id, source_type, source_id)
);

CREATE INDEX IF NOT EXISTS idx_bsd_source ON bet_scores_details(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_bsd_user_mode_pool ON bet_scores_details(user_id, mode, pool_id);

COMMENT ON TABLE bet_scores_details IS 'Per-source, per-user score details. bet_scores_aggregate is the SUM of these.';

-- 2. Backfill bet_scores_details from existing finished matches
INSERT INTO bet_scores_details (mode, pool_id, user_id, source_type, source_id, points)
SELECT
  bmp.mode,
  bmp.pool_id,
  bmp.user_id,
  'match',
  bmp.match_id::TEXT,
  CASE
    WHEN bmp.mode = 'global'
    THEN fn_calculate_global_points(
      bm.home_score_official, bm.away_score_official,
      bmp.home_score_predicted, bmp.away_score_predicted,
      bm.stage
    )
    ELSE evaluate_pool_prediction(
      bmp.home_score_predicted, bmp.away_score_predicted,
      bm.home_score_official, bm.away_score_official,
      (SELECT id FROM bet_pool_config_versions WHERE pool_id = bmp.pool_id ORDER BY created_at DESC LIMIT 1),
      1
    )
  END
FROM bet_match_predictions bmp
JOIN bet_matches bm ON bm.id = bmp.match_id
  AND bm.home_score_official IS NOT NULL
  AND bm.away_score_official IS NOT NULL
  AND bm.status = 'finished'
ON CONFLICT (mode, pool_id, user_id, source_type, source_id) DO NOTHING;

-- 3. Rebuild bet_scores_aggregate from details (ensures consistency)
DELETE FROM bet_scores_aggregate;

INSERT INTO bet_scores_aggregate (mode, pool_id, user_id, points_total)
SELECT mode, pool_id, user_id, GREATEST(SUM(points), 0)
FROM bet_scores_details
GROUP BY mode, pool_id, user_id;

-- 4. Rewrite fn_calculate_match_scores_v1 to use bet_scores_details
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
BEGIN
  SELECT
    bm.home_score_official, bm.away_score_official, bm.stage,
    CASE WHEN bm.status = 'finished' THEN true ELSE false END
  INTO v_home_score_official, v_away_score_official, v_match_stage, v_match_locked
  FROM bet_matches bm WHERE bm.id = p_match_id;

  IF v_home_score_official IS NULL OR v_away_score_official IS NULL THEN
    RAISE EXCEPTION 'Match % has no official score', p_match_id;
  END IF;

  IF NOT v_match_locked THEN
    RAISE EXCEPTION 'Match % status is not finished', p_match_id;
  END IF;

  BEGIN
    DELETE FROM bet_scores_details
    WHERE source_type = 'match' AND source_id = p_match_id::TEXT
      AND mode = 'global' AND pool_id IS NULL;

    WITH global_predictions AS (
      SELECT
        bmp.user_id,
        fn_calculate_global_points(
          v_home_score_official, v_away_score_official,
          bmp.home_score_predicted, bmp.away_score_predicted,
          v_match_stage
        ) as calculated_points
      FROM bet_match_predictions bmp
      WHERE bmp.match_id = p_match_id AND bmp.mode = 'global'
    )
    INSERT INTO bet_scores_details (mode, pool_id, user_id, source_type, source_id, points)
    SELECT 'global', NULL, gp.user_id, 'match', p_match_id::TEXT, gp.calculated_points
    FROM global_predictions gp;

    GET DIAGNOSTICS v_predictions_processed = ROW_COUNT;

    WITH affected_users AS (
      SELECT DISTINCT user_id FROM bet_match_predictions
      WHERE match_id = p_match_id AND mode = 'global'
    ),
    user_totals AS (
      SELECT bsd.user_id, SUM(bsd.points) as total
      FROM bet_scores_details bsd
      JOIN affected_users au ON au.user_id = bsd.user_id
      WHERE bsd.mode = 'global' AND bsd.pool_id IS NULL
      GROUP BY bsd.user_id
    )
    INSERT INTO bet_scores_aggregate (mode, pool_id, user_id, points_total)
    SELECT 'global', NULL, ut.user_id, GREATEST(ut.total, 0)
    FROM user_totals ut
    ON CONFLICT (user_id, mode, pool_id) DO UPDATE
    SET points_total = GREATEST(EXCLUDED.points_total, 0), updated_at = NOW();

    GET DIAGNOSTICS v_affected_users = ROW_COUNT;
    v_points_total := v_predictions_processed * 10;

    INSERT INTO bet_audit_logs (event_type, match_id, new_value, created_at)
    VALUES (
      'MATCH_SCORED', p_match_id,
      jsonb_build_object(
        'home_score', v_home_score_official,
        'away_score', v_away_score_official,
        'predictions_processed', v_predictions_processed,
        'stage', v_match_stage::TEXT
      ),
      NOW()
    );

    SELECT COUNT(DISTINCT user_id) INTO v_affected_users
    FROM bet_match_predictions WHERE match_id = p_match_id AND mode = 'global';

    RETURN QUERY SELECT v_predictions_processed, v_points_total, v_affected_users, true;

  EXCEPTION WHEN OTHERS THEN
    RETURN QUERY SELECT 0, 0, 0, false;
  END;
END;
$$ LANGUAGE plpgsql;

-- 5. Rewrite fn_calculate_pool_match_scores with bet_scores_details + (v_pts_goals * 2)
CREATE OR REPLACE FUNCTION fn_calculate_pool_match_scores(
  p_match_id UUID,
  p_pool_id UUID
)
RETURNS TABLE(total_predictions INT, success BOOLEAN) AS $$
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
  SELECT bm.home_score_official, bm.away_score_official, bm.stage
  INTO v_home_score_official, v_away_score_official, v_match_stage
  FROM bet_matches bm WHERE bm.id = p_match_id;

  IF v_home_score_official IS NULL OR v_away_score_official IS NULL THEN
    RETURN QUERY SELECT 0::INT, false;
    RETURN;
  END IF;

  SELECT id INTO v_config_id
  FROM bet_pool_config_versions
  WHERE pool_id = p_pool_id
  ORDER BY created_at DESC LIMIT 1;

  IF v_config_id IS NULL THEN
    RETURN QUERY SELECT 0::INT, false;
    RETURN;
  END IF;

  SELECT pts_winner_selection, pts_exact_score, pts_team_goals, pts_goal_difference
  INTO v_pts_winner, v_pts_exact, v_pts_goals, v_pts_diff
  FROM bet_pool_config_versions WHERE id = v_config_id;

  DELETE FROM bet_scores_details
  WHERE source_type = 'match' AND source_id = p_match_id::TEXT
    AND mode = 'pool' AND pool_id = p_pool_id;

  WITH pool_predictions AS (
    SELECT
      bmp.user_id,
      CASE
        WHEN bmp.home_score_predicted = v_home_score_official AND
             bmp.away_score_predicted = v_away_score_official
        THEN v_pts_winner + v_pts_exact + (v_pts_goals * 2) + v_pts_diff
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
    WHERE bmp.match_id = p_match_id AND bmp.pool_id = p_pool_id AND bmp.mode = 'pool'
  )
  INSERT INTO bet_scores_details (mode, pool_id, user_id, source_type, source_id, points)
  SELECT 'pool', p_pool_id, pp.user_id, 'match', p_match_id::TEXT, pp.calculated_points
  FROM pool_predictions pp;

  GET DIAGNOSTICS v_predictions_processed = ROW_COUNT;

  WITH affected_users AS (
    SELECT DISTINCT user_id FROM bet_match_predictions
    WHERE match_id = p_match_id AND pool_id = p_pool_id AND mode = 'pool'
  ),
  user_totals AS (
    SELECT bsd.user_id, SUM(bsd.points) as total
    FROM bet_scores_details bsd
    JOIN affected_users au ON au.user_id = bsd.user_id
    WHERE bsd.mode = 'pool' AND bsd.pool_id = p_pool_id
    GROUP BY bsd.user_id
  )
  INSERT INTO bet_scores_aggregate (mode, pool_id, user_id, points_total)
  SELECT 'pool', p_pool_id, ut.user_id, GREATEST(ut.total, 0)
  FROM user_totals ut
  ON CONFLICT (user_id, mode, pool_id) DO UPDATE
  SET points_total = GREATEST(EXCLUDED.points_total, 0), updated_at = NOW();

  RETURN QUERY SELECT v_predictions_processed, true;
END;
$$ LANGUAGE plpgsql;

-- 6. Simplify fn_update_match_result (no revert phase needed)
CREATE OR REPLACE FUNCTION fn_update_match_result(
  p_match_id UUID,
  p_home_score INT,
  p_away_score INT
)
RETURNS TABLE(success BOOLEAN, message TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_home INT;
  v_old_away INT;
  v_stage bet_match_stage;
  v_score_was_set BOOLEAN;
  v_pool_id UUID;
BEGIN
  SELECT m.home_score_official, m.away_score_official, m.stage
  INTO v_old_home, v_old_away, v_stage
  FROM bet_matches m WHERE m.id = p_match_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Partido no encontrado';
    RETURN;
  END IF;

  IF p_home_score < 0 OR p_home_score > 20 OR p_away_score < 0 OR p_away_score > 20 THEN
    RETURN QUERY SELECT false, 'Los marcadores deben estar entre 0 y 20';
    RETURN;
  END IF;

  v_score_was_set := v_old_home IS NOT NULL AND v_old_away IS NOT NULL;

  UPDATE bet_matches
  SET home_score_official = p_home_score,
      away_score_official = p_away_score,
      status = 'finished',
      updated_at = NOW()
  WHERE id = p_match_id;

  PERFORM fn_calculate_match_scores_v1(p_match_id);

  FOR v_pool_id IN
    SELECT DISTINCT bmp.pool_id
    FROM bet_match_predictions bmp
    WHERE bmp.match_id = p_match_id AND bmp.mode = 'pool' AND bmp.pool_id IS NOT NULL
  LOOP
    PERFORM fn_calculate_pool_match_scores(p_match_id, v_pool_id);
  END LOOP;

  INSERT INTO bet_audit_logs (event_type, match_id, old_value, new_value, created_at)
  VALUES (
    'MATCH_SCORED', p_match_id,
    CASE WHEN v_score_was_set
      THEN jsonb_build_object('home_score', v_old_home, 'away_score', v_old_away)
      ELSE NULL
    END,
    jsonb_build_object('home_score', p_home_score, 'away_score', p_away_score),
    NOW()
  );

  RETURN QUERY SELECT true, 'Resultado actualizado y puntos recalculados';
END;
$$;

-- 7. Create fn_calculate_tournament_predictions for champion/subchampion/third_place
CREATE OR REPLACE FUNCTION fn_calculate_tournament_predictions(
  p_pool_id UUID,
  p_category TEXT,
  p_winning_team_id UUID
)
RETURNS TABLE(affected_users INT, success BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_affected_users INT := 0;
  v_pts INT;
  v_config_id UUID;
BEGIN
  IF p_category NOT IN ('champion', 'subchampion', 'third_place') THEN
    RETURN QUERY SELECT 0, false;
    RETURN;
  END IF;

  SELECT id INTO v_config_id
  FROM bet_pool_config_versions
  WHERE pool_id = p_pool_id
  ORDER BY created_at DESC LIMIT 1;

  IF v_config_id IS NULL THEN
    RETURN QUERY SELECT 0, false;
    RETURN;
  END IF;

  SELECT
    CASE p_category
      WHEN 'champion' THEN pts_champion
      WHEN 'subchampion' THEN pts_subchampion
      WHEN 'third_place' THEN pts_third_place
      ELSE 0
    END INTO v_pts
  FROM bet_pool_config_versions WHERE id = v_config_id;

  DELETE FROM bet_scores_details
  WHERE source_type = 'tournament' AND source_id = p_category
    AND mode = 'pool' AND pool_id = p_pool_id;

  INSERT INTO bet_scores_details (mode, pool_id, user_id, source_type, source_id, points)
  SELECT 'pool', p_pool_id, btp.user_id, 'tournament', p_category, v_pts
  FROM bet_tournament_predictions btp
  WHERE btp.pool_id = p_pool_id
    AND btp.category = p_category
    AND btp.team_id = p_winning_team_id;

  GET DIAGNOSTICS v_affected_users = ROW_COUNT;

  WITH user_totals AS (
    SELECT bsd.user_id, SUM(bsd.points) as total
    FROM bet_scores_details bsd
    WHERE bsd.mode = 'pool' AND bsd.pool_id = p_pool_id
      AND bsd.user_id IN (
        SELECT user_id FROM bet_tournament_predictions
        WHERE pool_id = p_pool_id AND category = p_category
      )
    GROUP BY bsd.user_id
  )
  INSERT INTO bet_scores_aggregate (mode, pool_id, user_id, points_total)
  SELECT 'pool', p_pool_id, ut.user_id, GREATEST(ut.total, 0)
  FROM user_totals ut
  ON CONFLICT (user_id, mode, pool_id) DO UPDATE
  SET points_total = GREATEST(EXCLUDED.points_total, 0), updated_at = NOW();

  RETURN QUERY SELECT v_affected_users, true;
END;
$$;
