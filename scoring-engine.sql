-- ============================================================================
-- Parti2 Bet - Scoring Engine
-- ============================================================================
-- This file contains all PostgreSQL functions for calculating betting points
-- based on match predictions (GLOBAL and POOL modes).
--
-- Functions:
--   1. get_match_stage_multiplier(stage) → INT (1 or 2)
--   2. evaluate_global_prediction(...) → INT (points)
--   3. evaluate_pool_prediction(...) → INT (points)
--   4. calculate_match_scores(match_id, home_official, away_official) → JSON
--
-- ============================================================================

-- ============================================================================
-- HELPER: Get Stage Multiplier
-- ============================================================================
-- Returns 1 for group_stage, 2 for knockout stages (round_of_32 and beyond).
-- This is used to double points in knockout rounds as per the specification.
-- ============================================================================
CREATE OR REPLACE FUNCTION get_match_stage_multiplier(p_stage VARCHAR)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  CASE p_stage
    WHEN 'group_stage' THEN RETURN 1;
    WHEN 'round_of_32' THEN RETURN 2;
    WHEN 'round_of_16' THEN RETURN 2;
    WHEN 'quarter_finals' THEN RETURN 2;
    WHEN 'semi_finals' THEN RETURN 2;
    WHEN 'third_place' THEN RETURN 2;
    WHEN 'final' THEN RETURN 2;
    ELSE RETURN 1; -- Default to 1 if unknown stage
  END CASE;
END;
$$;

-- ============================================================================
-- HELPER: Evaluate GLOBAL Mode Prediction
-- ============================================================================
-- GLOBAL mode uses fixed, universal rules:
--   - Exact score (home == away): 10 pts
--   - If not exact:
--     - Correct winner or draw (result matches): 5 pts
--     - Correct home goals: 2 pts
--     - Correct away goals: 2 pts
--
-- Points are then multiplied by the stage multiplier (1 for group, 2 for KO).
--
-- Arguments:
--   p_predicted_h INT: Home team predicted score
--   p_predicted_a INT: Away team predicted score
--   p_official_h INT: Home team official score (final)
--   p_official_a INT: Away team official score (final)
--   p_multiplier INT: Stage multiplier (1 or 2)
--
-- Returns: Total points (INT)
-- ============================================================================
CREATE OR REPLACE FUNCTION evaluate_global_prediction(
  p_predicted_h INT,
  p_predicted_a INT,
  p_official_h INT,
  p_official_a INT,
  p_multiplier INT
)
RETURNS INT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_points INT := 0;
BEGIN
  -- Validate inputs
  IF p_predicted_h IS NULL OR p_predicted_a IS NULL OR
     p_official_h IS NULL OR p_official_a IS NULL THEN
    RETURN 0;
  END IF;

  -- Rule 1: Exact score (10 pts)
  IF p_predicted_h = p_official_h AND p_predicted_a = p_official_a THEN
    v_points := 10;
  ELSE
    -- Rule 2: Correct result (winner or draw) (5 pts)
    -- Determine predicted result: 1 = home win, 0 = draw, -1 = away win
    -- Determine official result: same logic
    IF (p_predicted_h > p_predicted_a AND p_official_h > p_official_a) OR
       (p_predicted_h < p_predicted_a AND p_official_h < p_official_a) OR
       (p_predicted_h = p_predicted_a AND p_official_h = p_official_a) THEN
      v_points := v_points + 5;
    END IF;

    -- Rule 3: Correct home team goals (2 pts)
    IF p_predicted_h = p_official_h THEN
      v_points := v_points + 2;
    END IF;

    -- Rule 4: Correct away team goals (2 pts)
    IF p_predicted_a = p_official_a THEN
      v_points := v_points + 2;
    END IF;
  END IF;

  -- Apply stage multiplier (1 for group stage, 2 for knockout)
  RETURN v_points * p_multiplier;
END;
$$;

-- ============================================================================
-- HELPER: Evaluate POOL Mode Prediction
-- ============================================================================
-- POOL mode uses custom rules from bet_pool_config_versions:
--   - pts_winner_selection: Points for correct winner/draw
--   - pts_exact_score: Points for exact score prediction
--   - pts_team_goals: Points for correctly guessing one team's goals
--   - pts_goal_difference: Points for correct goal difference (not currently used)
--
-- This function looks up the active config for a given pool and applies those rules.
--
-- Arguments:
--   p_predicted_h INT: Home team predicted score
--   p_predicted_a INT: Away team predicted score
--   p_official_h INT: Home team official score (final)
--   p_official_a INT: Away team official score (final)
--   p_config_id UUID: bet_pool_config_versions ID to use
--   p_multiplier INT: Stage multiplier (1 or 2)
--
-- Returns: Total points (INT)
-- ============================================================================
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
  -- Validate inputs
  IF p_predicted_h IS NULL OR p_predicted_a IS NULL OR
     p_official_h IS NULL OR p_official_a IS NULL OR
     p_config_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Fetch the pool config version
  SELECT
    pts_winner_selection,
    pts_exact_score,
    pts_team_goals,
    pts_goal_difference
  INTO v_config
  FROM bet_pool_config_versions
  WHERE id = p_config_id
  LIMIT 1;

  -- If config not found, return 0
  IF v_config IS NULL THEN
    RETURN 0;
  END IF;

  -- Rule 1: Exact score
  IF p_predicted_h = p_official_h AND p_predicted_a = p_official_a THEN
    v_points := v_config.pts_exact_score;
  ELSE
    -- Rule 2: Correct winner/draw
    IF (p_predicted_h > p_predicted_a AND p_official_h > p_official_a) OR
       (p_predicted_h < p_predicted_a AND p_official_h < p_official_a) OR
       (p_predicted_h = p_predicted_a AND p_official_h = p_official_a) THEN
      v_points := v_points + v_config.pts_winner_selection;
    END IF;

    -- Rule 3: Correct home team goals
    IF p_predicted_h = p_official_h THEN
      v_points := v_points + v_config.pts_team_goals;
    END IF;

    -- Rule 4: Correct away team goals
    IF p_predicted_a = p_official_a THEN
      v_points := v_points + v_config.pts_team_goals;
    END IF;
  END IF;

  -- Apply stage multiplier (1 for group stage, 2 for knockout)
  RETURN v_points * p_multiplier;
END;
$$;

-- ============================================================================
-- MAIN: Calculate Match Scores
-- ============================================================================
-- Main entry point for scoring a match after official scores are recorded.
--
-- This function:
--   1. Validates the match exists and has official scores
--   2. Retrieves the match stage to compute multiplier
--   3. Finds all bet_match_predictions for this match
--   4. Evaluates each prediction (GLOBAL or POOL mode)
--   5. Upserts points into bet_scores_aggregate
--   6. Returns JSON with list of awarded points
--
-- Arguments:
--   p_match_id UUID: ID of the match to score
--   p_home_official_score INT: Official home team score
--   p_away_official_score INT: Official away team score
--
-- Returns:
--   JSON object with structure:
--   {
--     "success": true,
--     "match_id": "uuid",
--     "official_scores": {"home": INT, "away": INT},
--     "points_awarded": [
--       {
--         "user_id": "uuid",
--         "mode": "global|pool",
--         "pool_id": "uuid|null",
--         "points": INT
--       },
--       ...
--     ],
--     "total_predictions_scored": INT
--   }
--
-- Exceptions:
--   - Match not found
--   - Match already has different official scores (immutability check)
-- ============================================================================
CREATE OR REPLACE FUNCTION calculate_match_scores(
  p_match_id UUID,
  p_home_official_score INT,
  p_away_official_score INT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_match RECORD;
  v_stage VARCHAR;
  v_multiplier INT;
  v_prediction RECORD;
  v_points INT;
  v_points_awarded JSONB := '[]'::JSONB;
  v_count INT := 0;
  v_pool_config_id UUID;
BEGIN
  -- ========================================================================
  -- VALIDATION: Check match exists and has valid official scores
  -- ========================================================================
  SELECT
    id,
    stage,
    home_score_official,
    away_score_official,
    status
  INTO v_match
  FROM bet_matches
  WHERE id = p_match_id
  LIMIT 1;

  IF v_match IS NULL THEN
    RAISE EXCEPTION 'Match % not found', p_match_id;
  END IF;

  -- Validate official scores are non-negative
  IF p_home_official_score < 0 OR p_away_official_score < 0 THEN
    RAISE EXCEPTION 'Official scores must be non-negative';
  END IF;

  -- Immutability check: if scores are already recorded, they must match
  IF v_match.home_score_official IS NOT NULL AND
     v_match.away_score_official IS NOT NULL THEN
    IF v_match.home_score_official != p_home_official_score OR
       v_match.away_score_official != p_away_official_score THEN
      RAISE EXCEPTION 'Official scores already recorded and differ from provided scores';
    END IF;
  END IF;

  -- ========================================================================
  -- SETUP: Get stage multiplier
  -- ========================================================================
  v_stage := v_match.stage::VARCHAR;
  v_multiplier := get_match_stage_multiplier(v_stage);

  -- ========================================================================
  -- PROCESSING: Find all predictions for this match and score them
  -- ========================================================================
  FOR v_prediction IN
    SELECT
      bmp.id,
      bmp.user_id,
      bmp.mode,
      bmp.pool_id,
      bmp.home_score_predicted,
      bmp.away_score_predicted
    FROM bet_match_predictions bmp
    WHERE bmp.match_id = p_match_id
    ORDER BY bmp.created_at ASC
  LOOP
    v_points := 0;

    -- Evaluate based on mode
    IF v_prediction.mode = 'global' THEN
      -- GLOBAL mode uses fixed rules
      v_points := evaluate_global_prediction(
        v_prediction.home_score_predicted,
        v_prediction.away_score_predicted,
        p_home_official_score,
        p_away_official_score,
        v_multiplier
      );
    ELSIF v_prediction.mode = 'pool' THEN
      -- POOL mode uses custom config
      -- Get the latest active config for this pool
      SELECT id INTO v_pool_config_id
      FROM bet_pool_config_versions
      WHERE pool_id = v_prediction.pool_id
      ORDER BY created_at DESC
      LIMIT 1;

      IF v_pool_config_id IS NOT NULL THEN
        v_points := evaluate_pool_prediction(
          v_prediction.home_score_predicted,
          v_prediction.away_score_predicted,
          p_home_official_score,
          p_away_official_score,
          v_pool_config_id,
          v_multiplier
        );
      END IF;
    END IF;

    -- =====================================================================
    -- UPSERT: Add/update points in bet_scores_aggregate
    -- =====================================================================
    IF v_points > 0 THEN
      INSERT INTO bet_scores_aggregate (
        mode,
        pool_id,
        user_id,
        points_total,
        updated_at
      ) VALUES (
        v_prediction.mode,
        v_prediction.pool_id,
        v_prediction.user_id,
        v_points,
        NOW()
      )
      ON CONFLICT (id) DO UPDATE
      SET points_total = bet_scores_aggregate.points_total + v_points,
          updated_at = NOW()
      WHERE bet_scores_aggregate.user_id = v_prediction.user_id
        AND bet_scores_aggregate.mode = v_prediction.mode
        AND (bet_scores_aggregate.pool_id = v_prediction.pool_id OR
             (bet_scores_aggregate.pool_id IS NULL AND v_prediction.pool_id IS NULL));

      -- Add to JSON response
      v_points_awarded := v_points_awarded || jsonb_build_object(
        'user_id', v_prediction.user_id,
        'mode', v_prediction.mode,
        'pool_id', v_prediction.pool_id,
        'points', v_points
      );

      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- ========================================================================
  -- UPDATE: Record official scores in bet_matches (idempotent)
  -- ========================================================================
  UPDATE bet_matches
  SET home_score_official = p_home_official_score,
      away_score_official = p_away_official_score,
      status = 'finished',
      updated_at = NOW()
  WHERE id = p_match_id;

  -- ========================================================================
  -- RETURN: Formatted JSON response
  -- ========================================================================
  RETURN jsonb_build_object(
    'success', TRUE,
    'match_id', p_match_id,
    'official_scores', jsonb_build_object(
      'home', p_home_official_score,
      'away', p_away_official_score
    ),
    'points_awarded', v_points_awarded,
    'total_predictions_scored', v_count
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error response
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', SQLERRM
    );
END;
$$;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Grant execute on all functions to authenticated role (for API calls).
-- ============================================================================
GRANT EXECUTE ON FUNCTION get_match_stage_multiplier(VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION evaluate_global_prediction(INT, INT, INT, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION evaluate_pool_prediction(INT, INT, INT, INT, UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_match_scores(UUID, INT, INT) TO authenticated;

-- ============================================================================
-- TESTING & EXAMPLES
-- ============================================================================
-- Below are test cases demonstrating the scoring engine with various scenarios.
-- These are NOT inserted into the database, just documented for reference.
--
-- TEST CASE 1: Exact Score in Group Stage (GLOBAL)
-- ====================================================
-- Match: Group Stage (multiplier = 1)
-- Prediction: Home 2, Away 1
-- Official:   Home 2, Away 1
-- Expected:   10 points (exact match)
-- Query:
--   SELECT evaluate_global_prediction(2, 1, 2, 1, 1);
-- Expected Result: 10
--
-- TEST CASE 2: Wrong Prediction, Correct Winner in Group Stage (GLOBAL)
-- =======================================================================================
-- Match: Group Stage (multiplier = 1)
-- Prediction: Home 3, Away 1
-- Official:   Home 2, Away 1
-- Expected:   5 + 2 = 7 points (correct winner (5) + correct away goals (2))
-- Query:
--   SELECT evaluate_global_prediction(3, 1, 2, 1, 1);
-- Expected Result: 7
--
-- TEST CASE 3: Exact Score in Knockout Stage (GLOBAL - Doubled)
-- ================================================================
-- Match: Quarter Finals (multiplier = 2)
-- Prediction: Home 1, Away 0
-- Official:   Home 1, Away 0
-- Expected:   10 * 2 = 20 points (exact match with knockout multiplier)
-- Query:
--   SELECT evaluate_global_prediction(1, 0, 1, 0, 2);
-- Expected Result: 20
--
-- TEST CASE 4: Draw Prediction, Correct in Group Stage (GLOBAL)
-- ================================================================
-- Match: Group Stage (multiplier = 1)
-- Prediction: Home 2, Away 2
-- Official:   Home 2, Away 2
-- Expected:   10 points (exact score)
-- Query:
--   SELECT evaluate_global_prediction(2, 2, 2, 2, 1);
-- Expected Result: 10
--
-- TEST CASE 5: Wrong Result Entirely (No Points)
-- ================================================
-- Match: Group Stage (multiplier = 1)
-- Prediction: Home 2, Away 1 (home win)
-- Official:   Home 1, Away 2 (away win)
-- Expected:   0 points (wrong result, wrong goals)
-- Query:
--   SELECT evaluate_global_prediction(2, 1, 1, 2, 1);
-- Expected Result: 0
--
-- TEST CASE 6: POOL Mode with Custom Config
-- ============================================
-- Assumption: Pool config has:
--   pts_winner_selection = 3
--   pts_exact_score = 5
--   pts_team_goals = 2
-- Match: Group Stage (multiplier = 1)
-- Prediction: Home 2, Away 1
-- Official:   Home 2, Away 0
-- Expected:   3 + 2 = 5 points (correct winner (3) + correct home goals (2))
--
-- Manual calculation for verification:
--   - Exact score? NO (2-1 vs 2-0)
--   - Correct winner? YES (both home wins) → 3 pts
--   - Correct home goals? YES (2 == 2) → 2 pts
--   - Correct away goals? NO (1 != 0) → 0 pts
--   - Total: 3 + 2 = 5 pts
--
-- ============================================================================
-- END OF SCORING ENGINE
-- ============================================================================
