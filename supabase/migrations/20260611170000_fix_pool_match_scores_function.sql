-- Fix fn_calculate_pool_match_scores: exact match must use (v_pts_goals * 2)
-- so it gives 10pts (5+0+(2*2)+1) for predictions pools, not 8 (5+0+2+1).

-- 1. Redefine function with correct multiplier
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
  SELECT bm.home_score_official, bm.away_score_official, bm.stage
  INTO v_home_score_official, v_away_score_official, v_match_stage
  FROM bet_matches bm
  WHERE bm.id = p_match_id;

  IF v_home_score_official IS NULL OR v_away_score_official IS NULL THEN
    RETURN QUERY SELECT 0::INT, false;
    RETURN;
  END IF;

  SELECT id INTO v_config_id
  FROM bet_pool_config_versions
  WHERE pool_id = p_pool_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_config_id IS NULL THEN
    RETURN QUERY SELECT 0::INT, false;
    RETURN;
  END IF;

  SELECT
    pts_winner_selection,
    pts_exact_score,
    pts_team_goals,
    pts_goal_difference
  INTO v_pts_winner, v_pts_exact, v_pts_goals, v_pts_diff
  FROM bet_pool_config_versions
  WHERE id = v_config_id;

  WITH pool_predictions AS (
    SELECT
      bmp.user_id,
      bmp.home_score_predicted,
      bmp.away_score_predicted,
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
    points_total = GREATEST(0, bet_scores_aggregate.points_total + EXCLUDED.points_total),
    updated_at = NOW();

  GET DIAGNOSTICS v_predictions_processed = ROW_COUNT;

  RETURN QUERY SELECT v_predictions_processed, true;
END;
$$ LANGUAGE plpgsql;

-- 2. Recalculate scores for all predictions pools (were calculated with old formula)
DO $$
DECLARE
  v_pool_id UUID;
  v_match_id UUID;
BEGIN
  FOR v_pool_id IN
    SELECT bp.id FROM bet_pools bp WHERE bp.competition_type = 'predictions'
  LOOP
    DELETE FROM bet_scores_aggregate
    WHERE mode = 'pool' AND pool_id = v_pool_id;

    FOR v_match_id IN
      SELECT DISTINCT bmp.match_id
      FROM bet_match_predictions bmp
      JOIN bet_matches bm ON bm.id = bmp.match_id
      WHERE bmp.pool_id = v_pool_id
        AND bmp.mode = 'pool'
        AND bm.home_score_official IS NOT NULL
        AND bm.away_score_official IS NOT NULL
        AND bm.status = 'finished'
    LOOP
      PERFORM fn_calculate_pool_match_scores(v_match_id, v_pool_id);
    END LOOP;
  END LOOP;
END;
$$;
