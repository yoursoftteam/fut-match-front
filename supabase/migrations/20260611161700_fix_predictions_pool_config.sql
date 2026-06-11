-- Fix existing predictions pools' config values.
-- Pools with competition_type='predictions' should use
-- pts_winner_selection=5, pts_exact_score=0, pts_team_goals=2, pts_goal_difference=1
-- so that an exact match gives 5+0+(2*2)+1 = 10 pts (not 3+2+(1*2)+1 = 8).

-- 1. Update config for existing predictions pools
UPDATE bet_pool_config_versions bpcv
SET
  pts_winner_selection = 5,
  pts_exact_score = 0,
  pts_team_goals = 2,
  pts_goal_difference = 1,
  pts_qualified_round_2 = 0,
  pts_champion = 0,
  pts_subchampion = 0,
  pts_third_place = 0
FROM bet_pools bp
WHERE bp.id = bpcv.pool_id
  AND bp.competition_type = 'predictions'
  AND (
    bpcv.pts_winner_selection != 5 OR
    bpcv.pts_exact_score != 0 OR
    bpcv.pts_team_goals != 2 OR
    bpcv.pts_goal_difference != 1
  );

-- 2. Recalculate scores for finished matches in predictions pools
DO $$
DECLARE
  v_pool_id UUID;
  v_match_id UUID;
  v_home INT;
  v_away INT;
  v_predictions_exist BOOLEAN;
BEGIN
  FOR v_pool_id IN
    SELECT bp.id FROM bet_pools bp WHERE bp.competition_type = 'predictions'
  LOOP
    -- Clear existing aggregate scores for this pool
    DELETE FROM bet_scores_aggregate
    WHERE mode = 'pool' AND pool_id = v_pool_id;

    -- Recalculate for each finished match that has pool predictions
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
