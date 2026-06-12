-- Parti2 - Update Match Result & Recalculate Scores
-- Called when an admin sets or corrects final scores for a match.
-- Handles the additive-scoring problem by reverting old contributions
-- before applying new ones.

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
  v_affected_users INT;
BEGIN
  -- Validate match exists and get current state
  SELECT m.home_score_official, m.away_score_official, m.stage
  INTO v_old_home, v_old_away, v_stage
  FROM bet_matches m
  WHERE m.id = p_match_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Partido no encontrado';
    RETURN;
  END IF;

  -- Validate score range
  IF p_home_score < 0 OR p_home_score > 20 OR p_away_score < 0 OR p_away_score > 20 THEN
    RETURN QUERY SELECT false, 'Los marcadores deben estar entre 0 y 20';
    RETURN;
  END IF;

  v_score_was_set := v_old_home IS NOT NULL AND v_old_away IS NOT NULL;

  -- ============================================================
  -- REVERT old scores (if this match was already scored before)
  -- ============================================================
  IF v_score_was_set THEN
    -- Revert global-mode contributions
    UPDATE bet_scores_aggregate bsa
    SET points_total = GREATEST(0, bsa.points_total - sub.old_points),
        updated_at = NOW()
    FROM (
      SELECT
        bmp.user_id,
        fn_calculate_global_points(v_old_home, v_old_away, bmp.home_score_predicted, bmp.away_score_predicted, v_stage) AS old_points
      FROM bet_match_predictions bmp
      WHERE bmp.match_id = p_match_id AND bmp.mode = 'global'
    ) sub
    WHERE bsa.mode = 'global'
      AND bsa.pool_id IS NULL
      AND bsa.user_id = sub.user_id;

    GET DIAGNOSTICS v_affected_users = ROW_COUNT;

    -- Revert pool-mode contributions per pool
    FOR v_pool_id IN
      SELECT DISTINCT bmp.pool_id
      FROM bet_match_predictions bmp
      WHERE bmp.match_id = p_match_id AND bmp.mode = 'pool' AND bmp.pool_id IS NOT NULL
    LOOP
      UPDATE bet_scores_aggregate bsa
      SET points_total = GREATEST(0, bsa.points_total - sub.old_points),
          updated_at = NOW()
      FROM (
        SELECT
          bmp.user_id,
          fn_calculate_global_points(v_old_home, v_old_away, bmp.home_score_predicted, bmp.away_score_predicted, v_stage) AS old_points
        FROM bet_match_predictions bmp
        WHERE bmp.match_id = p_match_id AND bmp.mode = 'pool' AND bmp.pool_id = v_pool_id
      ) sub
      WHERE bsa.mode = 'pool'
        AND bsa.pool_id = v_pool_id
        AND bsa.user_id = sub.user_id;
    END LOOP;
  END IF;

  -- ============================================================
  -- UPDATE match with new result
  -- ============================================================
  UPDATE bet_matches
  SET
    home_score_official = p_home_score,
    away_score_official = p_away_score,
    status = 'finished',
    updated_at = NOW()
  WHERE id = p_match_id;

  -- ============================================================
  -- APPLY new scores
  -- ============================================================
  -- Global mode
  PERFORM fn_calculate_match_scores_v1(p_match_id);

  -- Pool mode (per pool)
  FOR v_pool_id IN
    SELECT DISTINCT bmp.pool_id
    FROM bet_match_predictions bmp
    WHERE bmp.match_id = p_match_id AND bmp.mode = 'pool' AND bmp.pool_id IS NOT NULL
  LOOP
    PERFORM fn_calculate_pool_match_scores(p_match_id, v_pool_id);
  END LOOP;

  -- ============================================================
  -- AUDIT LOG
  -- ============================================================
  INSERT INTO bet_audit_logs (event_type, match_id, old_value, new_value, created_at)
  VALUES (
    'MATCH_SCORED',
    p_match_id,
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

GRANT EXECUTE ON FUNCTION fn_update_match_result TO service_role;
