ALTER TABLE bet_pools
  ADD COLUMN IF NOT EXISTS competition_type TEXT NOT NULL DEFAULT 'pool';

ALTER TABLE bet_pools
  DROP CONSTRAINT IF EXISTS bet_pools_competition_type_check;

ALTER TABLE bet_pools
  ADD CONSTRAINT bet_pools_competition_type_check
  CHECK (competition_type IN ('pool', 'predictions'));

CREATE INDEX IF NOT EXISTS idx_bet_pools_competition_type
  ON bet_pools(competition_type);

COMMENT ON COLUMN bet_pools.competition_type IS
  'pool = polla completa con predicciones de torneo; predictions = competencia solo de marcadores de partidos';

CREATE OR REPLACE FUNCTION evaluate_pool_prediction(
  p_predicted_h INT,
  p_predicted_a INT,
  p_official_h INT,
  p_official_a INT,
  p_config_id UUID,
  p_multiplier INT
)
RETURNS INT
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  v_points INT := 0;
  v_config RECORD;
BEGIN
  IF p_predicted_h IS NULL OR p_predicted_a IS NULL OR
     p_official_h IS NULL OR p_official_a IS NULL OR
     p_config_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT
    pts_winner_selection,
    pts_exact_score,
    pts_team_goals,
    pts_goal_difference
  INTO v_config
  FROM bet_pool_config_versions
  WHERE id = p_config_id
  LIMIT 1;

  IF v_config IS NULL THEN
    RETURN 0;
  END IF;

  IF p_predicted_h = p_official_h AND p_predicted_a = p_official_a THEN
    v_points :=
      v_config.pts_winner_selection +
      v_config.pts_exact_score +
      (v_config.pts_team_goals * 2) +
      v_config.pts_goal_difference;
  ELSE
    IF (p_predicted_h > p_predicted_a AND p_official_h > p_official_a) OR
       (p_predicted_h < p_predicted_a AND p_official_h < p_official_a) OR
       (p_predicted_h = p_predicted_a AND p_official_h = p_official_a) THEN
      v_points := v_points + v_config.pts_winner_selection;
    END IF;

    IF p_predicted_h = p_official_h THEN
      v_points := v_points + v_config.pts_team_goals;
    END IF;

    IF p_predicted_a = p_official_a THEN
      v_points := v_points + v_config.pts_team_goals;
    END IF;

    IF (p_predicted_h - p_predicted_a) = (p_official_h - p_official_a) THEN
      v_points := v_points + v_config.pts_goal_difference;
    END IF;
  END IF;

  RETURN v_points * p_multiplier;
END;
$$;

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
    points_total = bet_scores_aggregate.points_total + EXCLUDED.points_total,
    updated_at = NOW();

  GET DIAGNOSTICS v_predictions_processed = ROW_COUNT;

  RETURN QUERY SELECT v_predictions_processed, true;
END;
$$ LANGUAGE plpgsql;
