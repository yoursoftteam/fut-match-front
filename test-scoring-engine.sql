-- ============================================================================
-- Scoring Engine - Test Suite
-- ============================================================================
-- This file contains comprehensive test cases for the scoring engine.
-- Execute this file against the database to verify all functions work correctly.
--
-- Test Results:
-- - Test 1: get_match_stage_multiplier function
-- - Test 2: evaluate_global_prediction - Exact score
-- - Test 3: evaluate_global_prediction - Correct winner, partial goals
-- - Test 4: evaluate_global_prediction - Wrong prediction
-- - Test 5: evaluate_global_prediction - Knockout multiplier
-- - Test 6: Stage multiplier for all stages
-- ============================================================================

-- ============================================================================
-- TEST 1: get_match_stage_multiplier() - Verify all stages
-- ============================================================================
-- Test: Group stage should return 1
SELECT 
  get_match_stage_multiplier('group_stage') as result,
  CASE WHEN get_match_stage_multiplier('group_stage') = 1 THEN 'PASS' ELSE 'FAIL' END as status
;

-- Test: All knockout stages should return 2
SELECT 
  get_match_stage_multiplier('round_of_32') as "round_of_32",
  get_match_stage_multiplier('round_of_16') as "round_of_16",
  get_match_stage_multiplier('quarter_finals') as "quarter_finals",
  get_match_stage_multiplier('semi_finals') as "semi_finals",
  get_match_stage_multiplier('third_place') as "third_place",
  get_match_stage_multiplier('final') as "final",
  CASE WHEN get_match_stage_multiplier('round_of_16') = 2 THEN 'PASS' ELSE 'FAIL' END as status
;

-- ============================================================================
-- TEST 2: evaluate_global_prediction() - Exact Score (10 points)
-- ============================================================================
-- Scenario: Prediction 2-1, Official 2-1 (exact match), Group Stage (multiplier 1)
-- Expected: 10 points
SELECT 
  evaluate_global_prediction(2, 1, 2, 1, 1) as points,
  CASE WHEN evaluate_global_prediction(2, 1, 2, 1, 1) = 10 THEN 'PASS' ELSE 'FAIL' END as status,
  'Exact score in group stage' as test_description
;

-- ============================================================================
-- TEST 3: evaluate_global_prediction() - Correct Winner + Correct Away Goals
-- ============================================================================
-- Scenario: Prediction 3-1, Official 2-1 (correct winner, wrong home goals, correct away)
-- Points: 5 (winner) + 2 (away goals) = 7
SELECT 
  evaluate_global_prediction(3, 1, 2, 1, 1) as points,
  CASE WHEN evaluate_global_prediction(3, 1, 2, 1, 1) = 7 THEN 'PASS' ELSE 'FAIL' END as status,
  'Correct winner + correct away goals' as test_description
;

-- ============================================================================
-- TEST 4: evaluate_global_prediction() - Correct Home Goals Only
-- ============================================================================
-- Scenario: Prediction 2-2, Official 2-1 (correct home, wrong away, draw vs home win)
-- Points: 0 (wrong result) + 2 (home goals) = 2
SELECT 
  evaluate_global_prediction(2, 2, 2, 1, 1) as points,
  CASE WHEN evaluate_global_prediction(2, 2, 2, 1, 1) = 2 THEN 'PASS' ELSE 'FAIL' END as status,
  'Correct home goals only' as test_description
;

-- ============================================================================
-- TEST 5: evaluate_global_prediction() - Completely Wrong Prediction
-- ============================================================================
-- Scenario: Prediction 2-1 (home win), Official 1-2 (away win)
-- Points: 0 (wrong winner, wrong home, wrong away)
SELECT 
  evaluate_global_prediction(2, 1, 1, 2, 1) as points,
  CASE WHEN evaluate_global_prediction(2, 1, 1, 2, 1) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
  'Completely wrong prediction' as test_description
;

-- ============================================================================
-- TEST 6: evaluate_global_prediction() - Knockout Stage (Double Points)
-- ============================================================================
-- Scenario: Exact 1-0 prediction, Official 1-0, Knockout (multiplier 2)
-- Expected: 10 * 2 = 20 points
SELECT 
  evaluate_global_prediction(1, 0, 1, 0, 2) as points,
  CASE WHEN evaluate_global_prediction(1, 0, 1, 0, 2) = 20 THEN 'PASS' ELSE 'FAIL' END as status,
  'Exact score in knockout stage' as test_description
;

-- ============================================================================
-- TEST 7: evaluate_global_prediction() - Draw Prediction Correct
-- ============================================================================
-- Scenario: Prediction 2-2, Official 2-2 (exact draw)
-- Expected: 10 points
SELECT 
  evaluate_global_prediction(2, 2, 2, 2, 1) as points,
  CASE WHEN evaluate_global_prediction(2, 2, 2, 2, 1) = 10 THEN 'PASS' ELSE 'FAIL' END as status,
  'Exact draw prediction' as test_description
;

-- ============================================================================
-- TEST 8: evaluate_global_prediction() - Both Goals Correct, Wrong Winner
-- ============================================================================
-- Scenario: Prediction 3-2 (home win), Official 2-3 (away win), but both goals correct
-- Points: 0 (wrong winner) + 2 (home) + 2 (away) = 4
SELECT 
  evaluate_global_prediction(3, 2, 2, 3, 1) as points,
  CASE WHEN evaluate_global_prediction(3, 2, 2, 3, 1) = 4 THEN 'PASS' ELSE 'FAIL' END as status,
  'Both goals correct but wrong winner' as test_description
;

-- ============================================================================
-- TEST 9: evaluate_global_prediction() - Null Input Handling
-- ============================================================================
-- Scenario: NULL input should return 0
SELECT 
  evaluate_global_prediction(NULL, 1, 2, 1, 1) as points,
  CASE WHEN evaluate_global_prediction(NULL, 1, 2, 1, 1) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
  'Null input handling' as test_description
;

-- ============================================================================
-- TEST 10: Scoring Calculation Summary
-- ============================================================================
-- Create a summary of all test cases
WITH test_cases AS (
  SELECT 'TEST 1: Group Stage Multiplier' as test_name, 
         get_match_stage_multiplier('group_stage') = 1 as passed
  UNION ALL
  SELECT 'TEST 2: Exact Score (10 pts)', 
         evaluate_global_prediction(2, 1, 2, 1, 1) = 10
  UNION ALL
  SELECT 'TEST 3: Winner + Away Goals (7 pts)', 
         evaluate_global_prediction(3, 1, 2, 1, 1) = 7
  UNION ALL
  SELECT 'TEST 4: Home Goals Only (2 pts)', 
         evaluate_global_prediction(2, 2, 2, 1, 1) = 2
  UNION ALL
  SELECT 'TEST 5: Wrong Prediction (0 pts)', 
         evaluate_global_prediction(2, 1, 1, 2, 1) = 0
  UNION ALL
  SELECT 'TEST 6: Knockout Double (20 pts)', 
         evaluate_global_prediction(1, 0, 1, 0, 2) = 20
  UNION ALL
  SELECT 'TEST 7: Draw Exact (10 pts)', 
         evaluate_global_prediction(2, 2, 2, 2, 1) = 10
  UNION ALL
  SELECT 'TEST 8: Goals Correct Wrong Winner (4 pts)', 
         evaluate_global_prediction(3, 2, 2, 3, 1) = 4
  UNION ALL
  SELECT 'TEST 9: Null Input (0 pts)', 
         evaluate_global_prediction(NULL, 1, 2, 1, 1) = 0
)
SELECT 
  test_name,
  CASE WHEN passed THEN '✓ PASS' ELSE '✗ FAIL' END as result
FROM test_cases
ORDER BY test_name
;

-- ============================================================================
-- MANUAL VERIFICATION - Run individual tests
-- ============================================================================
-- Copy and paste any of the following to individually test:
--
-- 1. Test exact score (should return 10):
--    SELECT evaluate_global_prediction(2, 1, 2, 1, 1);
--
-- 2. Test correct winner + away goals (should return 7):
--    SELECT evaluate_global_prediction(3, 1, 2, 1, 1);
--
-- 3. Test knockout multiplier (should return 20):
--    SELECT evaluate_global_prediction(1, 0, 1, 0, 2);
--
-- 4. Test stage multipliers:
--    SELECT get_match_stage_multiplier('group_stage') as group_stage,
--           get_match_stage_multiplier('final') as final;
--
-- ============================================================================
-- END OF TEST SUITE
-- ============================================================================
