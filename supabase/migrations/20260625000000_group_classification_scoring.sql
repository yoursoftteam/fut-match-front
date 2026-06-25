-- Group classification scoring: 1st/2nd place + best third-place teams
-- FIFA 2026: 12 groups, top 2 advance + 8 best third-placed teams

-- 1. Table for admin-selected best third-place teams per pool
CREATE TABLE IF NOT EXISTS bet_best_third_qualifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES bet_pools(id) ON DELETE CASCADE,
  group_name CHAR(1) NOT NULL,
  team_id UUID NOT NULL REFERENCES bet_teams(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (pool_id, group_name)
);

CREATE INDEX IF NOT EXISTS idx_bet_best_third_pool ON bet_best_third_qualifiers(pool_id);

-- 2. Function: simulated group standings for a user from their predictions
CREATE OR REPLACE FUNCTION fn_user_simulated_group_standings(
  p_user_id UUID,
  p_pool_id UUID,
  p_group_name CHAR(1),
  p_tournament_id UUID
)
RETURNS TABLE(
  team_id UUID,
  team_name VARCHAR,
  played INT,
  wins INT,
  draws INT,
  losses INT,
  goals_for INT,
  goals_against INT,
  points INT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH group_teams AS (
    SELECT DISTINCT bt.id, bt.name
    FROM bet_matches bm
    JOIN bet_teams bt ON bt.id IN (bm.home_team_id, bm.away_team_id)
    WHERE bm.tournament_id = p_tournament_id AND bm.group_name = p_group_name
  ),
  match_predictions AS (
    SELECT
      bm.home_team_id, bm.away_team_id,
      COALESCE(bmp.home_score_predicted, 0) AS home_goals,
      COALESCE(bmp.away_score_predicted, 0) AS away_goals
    FROM bet_matches bm
    LEFT JOIN bet_match_predictions bmp ON bmp.match_id = bm.id
      AND bmp.user_id = p_user_id AND bmp.pool_id = p_pool_id AND bmp.mode = 'pool'
    WHERE bm.tournament_id = p_tournament_id AND bm.group_name = p_group_name
  ),
  team_calc AS (
    SELECT
      gt.id, gt.name,
      COALESCE(SUM(CASE WHEN mp.home_team_id = gt.id OR mp.away_team_id = gt.id THEN 1 ELSE 0 END), 0)::INT AS played,
      COALESCE(SUM(CASE
        WHEN mp.home_team_id = gt.id AND mp.home_goals > mp.away_goals THEN 1
        WHEN mp.away_team_id = gt.id AND mp.away_goals > mp.home_goals THEN 1
        ELSE 0
      END), 0)::INT AS wins,
      COALESCE(SUM(CASE
        WHEN (mp.home_team_id = gt.id OR mp.away_team_id = gt.id)
          AND mp.home_goals = mp.away_goals THEN 1
        ELSE 0
      END), 0)::INT AS draws,
      COALESCE(SUM(CASE
        WHEN mp.home_team_id = gt.id AND mp.home_goals < mp.away_goals THEN 1
        WHEN mp.away_team_id = gt.id AND mp.away_goals < mp.home_goals THEN 1
        ELSE 0
      END), 0)::INT AS losses,
      COALESCE(SUM(CASE WHEN mp.home_team_id = gt.id THEN mp.home_goals ELSE mp.away_goals END), 0)::INT AS goals_for,
      COALESCE(SUM(CASE WHEN mp.home_team_id = gt.id THEN mp.away_goals ELSE mp.home_goals END), 0)::INT AS goals_against
    FROM group_teams gt
    LEFT JOIN match_predictions mp ON mp.home_team_id = gt.id OR mp.away_team_id = gt.id
    GROUP BY gt.id, gt.name
  )
  SELECT tc.id, tc.name, tc.played, tc.wins, tc.draws, tc.losses, tc.goals_for, tc.goals_against,
    (tc.wins * 3 + tc.draws)::INT AS points
  FROM team_calc tc
  ORDER BY points DESC, (goals_for - goals_against) DESC, goals_for DESC;
END;
$$;

-- 3. Function: actual group standings from official results
CREATE OR REPLACE FUNCTION fn_actual_group_standings(
  p_group_name CHAR(1),
  p_tournament_id UUID
)
RETURNS TABLE(
  team_id UUID,
  team_name VARCHAR,
  played INT,
  wins INT,
  draws INT,
  losses INT,
  goals_for INT,
  goals_against INT,
  points INT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  WITH group_teams AS (
    SELECT DISTINCT bt.id, bt.name
    FROM bet_matches bm
    JOIN bet_teams bt ON bt.id IN (bm.home_team_id, bm.away_team_id)
    WHERE bm.tournament_id = p_tournament_id AND bm.group_name = p_group_name
  ),
  match_results AS (
    SELECT bm.home_team_id, bm.away_team_id,
      bm.home_score_official AS home_goals,
      bm.away_score_official AS away_goals
    FROM bet_matches bm
    WHERE bm.tournament_id = p_tournament_id AND bm.group_name = p_group_name
      AND bm.status = 'finished' AND bm.home_score_official IS NOT NULL AND bm.away_score_official IS NOT NULL
  ),
  team_calc AS (
    SELECT
      gt.id, gt.name,
      COALESCE(SUM(CASE WHEN mr.home_team_id = gt.id OR mr.away_team_id = gt.id THEN 1 ELSE 0 END), 0)::INT AS played,
      COALESCE(SUM(CASE
        WHEN mr.home_team_id = gt.id AND mr.home_goals > mr.away_goals THEN 1
        WHEN mr.away_team_id = gt.id AND mr.away_goals > mr.home_goals THEN 1
        ELSE 0
      END), 0)::INT AS wins,
      COALESCE(SUM(CASE
        WHEN (mr.home_team_id = gt.id OR mr.away_team_id = gt.id) AND mr.home_goals = mr.away_goals THEN 1
        ELSE 0
      END), 0)::INT AS draws,
      COALESCE(SUM(CASE
        WHEN mr.home_team_id = gt.id AND mr.home_goals < mr.away_goals THEN 1
        WHEN mr.away_team_id = gt.id AND mr.away_goals < mr.home_goals THEN 1
        ELSE 0
      END), 0)::INT AS losses,
      COALESCE(SUM(CASE WHEN mr.home_team_id = gt.id THEN mr.home_goals ELSE mr.away_goals END), 0)::INT AS goals_for,
      COALESCE(SUM(CASE WHEN mr.home_team_id = gt.id THEN mr.away_goals ELSE mr.home_goals END), 0)::INT AS goals_against
    FROM group_teams gt
    LEFT JOIN match_results mr ON mr.home_team_id = gt.id OR mr.away_team_id = gt.id
    GROUP BY gt.id, gt.name
  )
  SELECT tc.id, tc.name, tc.played, tc.wins, tc.draws, tc.losses, tc.goals_for, tc.goals_against,
    (tc.wins * 3 + tc.draws)::INT AS points
  FROM team_calc tc
  ORDER BY points DESC, (goals_for - goals_against) DESC, goals_for DESC;
END;
$$;

-- 4. Function: calculate group classification points (1st/2nd) for a pool
CREATE OR REPLACE FUNCTION fn_calculate_group_classification(
  p_pool_id UUID,
  p_group_name CHAR(1)
)
RETURNS TABLE(affected_users INT, points_awarded INT, success BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_tournament_id UUID;
  v_config_id UUID;
  v_pts_qualified INT;
  v_all_finished BOOLEAN;
  v_actual_top2 UUID[];
  v_user RECORD;
  v_sim_top2 UUID[];
  v_affected INT := 0;
  v_points_total INT := 0;
BEGIN
  SELECT tournament_id INTO v_tournament_id FROM bet_pools WHERE id = p_pool_id;
  IF v_tournament_id IS NULL THEN RETURN QUERY SELECT 0, 0, false; RETURN; END IF;

  SELECT id INTO v_config_id FROM bet_pool_config_versions
  WHERE pool_id = p_pool_id ORDER BY created_at DESC LIMIT 1;
  IF v_config_id IS NULL THEN RETURN QUERY SELECT 0, 0, false; RETURN; END IF;

  SELECT pts_qualified_round_2 INTO v_pts_qualified FROM bet_pool_config_versions WHERE id = v_config_id;
  IF v_pts_qualified IS NULL OR v_pts_qualified <= 0 THEN RETURN QUERY SELECT 0, 0, false; RETURN; END IF;

  -- Check all matches in group are finished
  SELECT bool_and(bm.status = 'finished') INTO v_all_finished
  FROM bet_matches bm WHERE bm.tournament_id = v_tournament_id AND bm.group_name = p_group_name;
  IF NOT v_all_finished THEN RETURN QUERY SELECT 0, 0, false; RETURN; END IF;

  -- Get actual top 2
  SELECT array_agg(team_id ORDER BY rank) INTO v_actual_top2
  FROM (
    SELECT team_id, ROW_NUMBER() OVER (ORDER BY points DESC, (goals_for - goals_against) DESC, goals_for DESC) AS rank
    FROM fn_actual_group_standings(p_group_name, v_tournament_id)
  ) sub WHERE rank <= 2;

  IF v_actual_top2 IS NULL OR array_length(v_actual_top2, 1) < 2 THEN
    RETURN QUERY SELECT 0, 0, false; RETURN;
  END IF;

  -- For each pool member with predictions for this group
  FOR v_user IN
    SELECT DISTINCT bmp.user_id
    FROM bet_match_predictions bmp
    JOIN bet_matches bm ON bm.id = bmp.match_id
    WHERE bmp.pool_id = p_pool_id AND bmp.mode = 'pool'
      AND bm.tournament_id = v_tournament_id AND bm.group_name = p_group_name
  LOOP
    SELECT array_agg(team_id ORDER BY rank) INTO v_sim_top2
    FROM (
      SELECT team_id, ROW_NUMBER() OVER (ORDER BY points DESC, (goals_for - goals_against) DESC, goals_for DESC) AS rank
      FROM fn_user_simulated_group_standings(v_user.user_id, p_pool_id, p_group_name, v_tournament_id)
    ) sub WHERE rank <= 2;

    IF v_sim_top2 IS NOT NULL AND array_length(v_sim_top2, 1) >= 2 THEN
      IF (v_sim_top2[1] = v_actual_top2[1] AND v_sim_top2[2] = v_actual_top2[2])
         OR (v_sim_top2[1] = v_actual_top2[2] AND v_sim_top2[2] = v_actual_top2[1])
      THEN
        DELETE FROM bet_scores_details
        WHERE source_type = 'classification' AND source_id = 'group_' || p_group_name
          AND mode = 'pool' AND pool_id = p_pool_id AND user_id = v_user.user_id;
        INSERT INTO bet_scores_details (mode, pool_id, user_id, source_type, source_id, points)
        VALUES ('pool', p_pool_id, v_user.user_id, 'classification', 'group_' || p_group_name, v_pts_qualified);
        v_affected := v_affected + 1;
        v_points_total := v_points_total + v_pts_qualified;
      END IF;
    END IF;
  END LOOP;

  IF v_affected > 0 THEN
    WITH affected_users AS (
      SELECT DISTINCT user_id FROM bet_scores_details WHERE mode = 'pool' AND pool_id = p_pool_id
    ),
    user_totals AS (
      SELECT bsd.user_id, SUM(bsd.points) as total FROM bet_scores_details bsd
      JOIN affected_users au ON au.user_id = bsd.user_id
      WHERE bsd.mode = 'pool' AND bsd.pool_id = p_pool_id GROUP BY bsd.user_id
    )
    INSERT INTO bet_scores_aggregate (mode, pool_id, user_id, points_total)
    SELECT 'pool', p_pool_id, ut.user_id, GREATEST(ut.total, 0) FROM user_totals ut
    ON CONFLICT (user_id, mode, pool_id) DO UPDATE
    SET points_total = GREATEST(EXCLUDED.points_total, 0), updated_at = NOW();
  END IF;
  RETURN QUERY SELECT v_affected, v_points_total, true;
END;
$$;

-- 5. Function: calculate best third classification points for a pool
CREATE OR REPLACE FUNCTION fn_calculate_best_third_points(
  p_pool_id UUID
)
RETURNS TABLE(affected_users INT, points_awarded INT, success BOOLEAN)
LANGUAGE plpgsql
AS $$
DECLARE
  v_tournament_id UUID;
  v_config_id UUID;
  v_pts_qualified INT;
  v_third RECORD;
  v_user RECORD;
  v_sim_third UUID;
  v_affected INT := 0;
  v_points_total INT := 0;
BEGIN
  SELECT tournament_id INTO v_tournament_id FROM bet_pools WHERE id = p_pool_id;

  SELECT id INTO v_config_id FROM bet_pool_config_versions
  WHERE pool_id = p_pool_id ORDER BY created_at DESC LIMIT 1;
  IF v_config_id IS NULL THEN RETURN QUERY SELECT 0, 0, false; RETURN; END IF;

  SELECT pts_qualified_round_2 INTO v_pts_qualified FROM bet_pool_config_versions WHERE id = v_config_id;
  IF v_pts_qualified IS NULL OR v_pts_qualified <= 0 THEN RETURN QUERY SELECT 0, 0, false; RETURN; END IF;

  FOR v_third IN SELECT group_name, team_id FROM bet_best_third_qualifiers WHERE pool_id = p_pool_id
  LOOP
    FOR v_user IN
      SELECT DISTINCT bmp.user_id FROM bet_match_predictions bmp
      JOIN bet_matches bm ON bm.id = bmp.match_id
      WHERE bmp.pool_id = p_pool_id AND bmp.mode = 'pool' AND bm.group_name = v_third.group_name
    LOOP
      SELECT team_id INTO v_sim_third FROM (
        SELECT team_id, ROW_NUMBER() OVER (ORDER BY points DESC, (goals_for - goals_against) DESC, goals_for DESC) AS rank
        FROM fn_user_simulated_group_standings(v_user.user_id, p_pool_id, v_third.group_name, v_tournament_id)
      ) sub WHERE rank = 3;

      IF v_sim_third = v_third.team_id THEN
        DELETE FROM bet_scores_details WHERE source_type = 'classification'
          AND source_id = 'best_third_' || v_third.group_name
          AND mode = 'pool' AND pool_id = p_pool_id AND user_id = v_user.user_id;
        INSERT INTO bet_scores_details (mode, pool_id, user_id, source_type, source_id, points)
        VALUES ('pool', p_pool_id, v_user.user_id, 'classification', 'best_third_' || v_third.group_name, v_pts_qualified);
        v_affected := v_affected + 1;
        v_points_total := v_points_total + v_pts_qualified;
      END IF;
    END LOOP;
  END LOOP;

  IF v_affected > 0 THEN
    WITH affected_users AS (
      SELECT DISTINCT user_id FROM bet_scores_details WHERE mode = 'pool' AND pool_id = p_pool_id
    ),
    user_totals AS (
      SELECT bsd.user_id, SUM(bsd.points) as total FROM bet_scores_details bsd
      JOIN affected_users au ON au.user_id = bsd.user_id
      WHERE bsd.mode = 'pool' AND bsd.pool_id = p_pool_id GROUP BY bsd.user_id
    )
    INSERT INTO bet_scores_aggregate (mode, pool_id, user_id, points_total)
    SELECT 'pool', p_pool_id, ut.user_id, GREATEST(ut.total, 0) FROM user_totals ut
    ON CONFLICT (user_id, mode, pool_id) DO UPDATE
    SET points_total = GREATEST(EXCLUDED.points_total, 0), updated_at = NOW();
  END IF;
  RETURN QUERY SELECT v_affected, v_points_total, true;
END;
$$;

-- 6. Update fn_update_match_result to auto-trigger group classification
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
  v_old_home INT; v_old_away INT;
  v_stage bet_match_stage; v_score_was_set BOOLEAN;
  v_pool_id UUID; v_match_group CHAR(1); v_tournament_id UUID; v_all_group_finished BOOLEAN;
BEGIN
  SELECT m.home_score_official, m.away_score_official, m.stage, m.group_name, m.tournament_id
  INTO v_old_home, v_old_away, v_stage, v_match_group, v_tournament_id
  FROM bet_matches m WHERE m.id = p_match_id;
  IF NOT FOUND THEN RETURN QUERY SELECT false, 'Partido no encontrado'; RETURN; END IF;

  IF p_home_score < 0 OR p_home_score > 20 OR p_away_score < 0 OR p_away_score > 20 THEN
    RETURN QUERY SELECT false, 'Los marcadores deben estar entre 0 y 20'; RETURN;
  END IF;

  v_score_was_set := v_old_home IS NOT NULL AND v_old_away IS NOT NULL;
  UPDATE bet_matches SET home_score_official = p_home_score, away_score_official = p_away_score,
    status = 'finished', updated_at = NOW() WHERE id = p_match_id;

  PERFORM fn_calculate_match_scores_v1(p_match_id);
  FOR v_pool_id IN SELECT DISTINCT bmp.pool_id FROM bet_match_predictions bmp
    WHERE bmp.match_id = p_match_id AND bmp.mode = 'pool' AND bmp.pool_id IS NOT NULL
  LOOP
    PERFORM fn_calculate_pool_match_scores(p_match_id, v_pool_id);
  END LOOP;

  -- Auto-trigger group classification when last match of a group finishes
  IF v_stage = 'group_stage' AND v_match_group IS NOT NULL THEN
    SELECT bool_and(bm.status = 'finished') INTO v_all_group_finished
    FROM bet_matches bm WHERE bm.tournament_id = v_tournament_id AND bm.group_name = v_match_group;

    IF v_all_group_finished THEN
      FOR v_pool_id IN SELECT DISTINCT bmp.pool_id FROM bet_match_predictions bmp
        JOIN bet_matches bm ON bm.id = bmp.match_id
        WHERE bm.tournament_id = v_tournament_id AND bm.group_name = v_match_group
          AND bmp.mode = 'pool' AND bmp.pool_id IS NOT NULL
      LOOP
        PERFORM fn_calculate_group_classification(v_pool_id, v_match_group);
      END LOOP;
    END IF;
  END IF;

  INSERT INTO bet_audit_logs (event_type, match_id, old_value, new_value, created_at)
  VALUES ('MATCH_SCORED', p_match_id,
    CASE WHEN v_score_was_set THEN jsonb_build_object('home_score', v_old_home, 'away_score', v_old_away) ELSE NULL END,
    jsonb_build_object('home_score', p_home_score, 'away_score', p_away_score), NOW());

  RETURN QUERY SELECT true, 'Resultado actualizado y puntos recalculados';
END;
$$;

-- Permissions
GRANT EXECUTE ON FUNCTION fn_user_simulated_group_standings(UUID, UUID, CHAR, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_user_simulated_group_standings(UUID, UUID, CHAR, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION fn_actual_group_standings(CHAR, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_actual_group_standings(CHAR, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION fn_calculate_group_classification(UUID, CHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_calculate_group_classification(UUID, CHAR) TO service_role;
GRANT EXECUTE ON FUNCTION fn_calculate_best_third_points(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION fn_calculate_best_third_points(UUID) TO service_role;
