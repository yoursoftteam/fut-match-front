# Parti2 Bet - Scoring Engine Quick Reference

## Functions Cheat Sheet

### 1. Get Stage Multiplier
```sql
SELECT get_match_stage_multiplier('stage_name');

-- Returns: 1 (group_stage) or 2 (knockout)
-- Group stage: 'group_stage' → 1
-- Knockout: 'round_of_16', 'quarter_finals', 'semi_finals', 'final' → 2
```

### 2. Evaluate GLOBAL Prediction
```sql
SELECT evaluate_global_prediction(
  predicted_home INT,
  predicted_away INT,
  official_home INT,
  official_away INT,
  multiplier INT
);

-- Returns: INT (points awarded)
-- Exact score: 10 pts
-- Correct result (else): 5 pts
-- Correct home goals (else): 2 pts
-- Correct away goals (else): 2 pts
```

### 3. Evaluate POOL Prediction
```sql
SELECT evaluate_pool_prediction(
  predicted_home INT,
  predicted_away INT,
  official_home INT,
  official_away INT,
  config_id UUID,    -- From bet_pool_config_versions
  multiplier INT
);

-- Returns: INT (points awarded)
-- Uses custom pts values from config
-- Exact score: pts_exact_score
-- Correct result (else): pts_winner_selection
-- Correct goals (else): pts_team_goals each
```

### 4. Calculate Match Scores (MAIN)
```sql
SELECT calculate_match_scores(
  match_id UUID,
  home_official_score INT,
  away_official_score INT
) as result;

-- Returns: JSONB
-- {
--   "success": true/false,
--   "match_id": "uuid",
--   "official_scores": {"home": INT, "away": INT},
--   "points_awarded": [
--     {"user_id": "uuid", "mode": "global|pool", "points": INT}
--   ],
--   "total_predictions_scored": INT
-- }
```

---

## GLOBAL Scoring Rules

| Scenario | Points | Notes |
|----------|--------|-------|
| Exact match | 10 | Both home and away correct |
| Correct result | 5 | Winner or draw correct (non-exact) |
| Home goals | 2 | Correct home score (non-exact) |
| Away goals | 2 | Correct away score (non-exact) |
| **Knockout 2x** | **×2** | All points doubled in KO |

**Example:**
- Prediction: 2-1, Official: 2-1, Group: 10 pts ✓
- Prediction: 2-1, Official: 2-0, Group: 5 (winner) + 2 (away) = 7 pts
- Prediction: 1-0, Official: 1-0, KO: 10 × 2 = 20 pts

---

## POOL Scoring Rules

**Configuration Values (per pool):**
```sql
SELECT 
  pts_winner_selection,   -- 1-5 pts for correct result
  pts_exact_score,        -- 2-10 pts for exact match
  pts_team_goals,         -- 1-3 pts per correct goal
  pts_goal_difference     -- 1-2 pts for goal diff
FROM bet_pool_config_versions
WHERE pool_id = 'uuid';
```

**Scoring Logic:**
1. Exact score? → Award `pts_exact_score`
2. Else, correct result? → Award `pts_winner_selection`
3. Else, home goals correct? → Award `pts_team_goals`
4. Else, away goals correct? → Award `pts_team_goals`

---

## Common Queries

### Score a match
```sql
SELECT calculate_match_scores(
  'match-uuid'::UUID,
  2,  -- home official
  1   -- away official
) as result;

-- Extract points awarded
SELECT result->>'success' as success,
       jsonb_array_length(result->'points_awarded') as predictions_scored
FROM (
  SELECT calculate_match_scores('match-uuid'::UUID, 2, 1) as result
) s;
```

### Check user's total points
```sql
SELECT 
  user_id,
  mode,
  pool_id,
  points_total,
  updated_at
FROM bet_scores_aggregate
WHERE user_id = 'user-uuid'::UUID
ORDER BY updated_at DESC;
```

### Get leaderboard
```sql
SELECT 
  user_id,
  mode,
  points_total,
  ROW_NUMBER() OVER (PARTITION BY mode ORDER BY points_total DESC) as rank
FROM bet_scores_aggregate
WHERE mode = 'global'
ORDER BY points_total DESC
LIMIT 10;
```

### Test exact prediction
```sql
SELECT evaluate_global_prediction(2, 1, 2, 1, 1);
-- Expected: 10 (exact match in group stage)
```

### Test partial prediction
```sql
SELECT evaluate_global_prediction(3, 1, 2, 1, 1);
-- Expected: 7 (5 for winner + 2 for away goals)
```

### Test knockout multiplier
```sql
SELECT evaluate_global_prediction(1, 0, 1, 0, 2);
-- Expected: 20 (10 exact × 2 for knockout)
```

---

## API Integration

### Endpoint
```
POST /api/bet/process-match
```

### Request
```json
{
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "home_official_score": 2,
  "away_official_score": 1
}
```

### Response (Success)
```json
{
  "success": true,
  "match_id": "550e8400-e29b-41d4-a716-446655440000",
  "official_scores": {
    "home": 2,
    "away": 1
  },
  "points_awarded": [
    {
      "user_id": "550e8400-e29b-41d4-a716-446655440001",
      "mode": "global",
      "pool_id": null,
      "points": 10
    }
  ],
  "total_predictions_scored": 1
}
```

### Response (Error)
```json
{
  "success": false,
  "error": "Match 550e8400-e29b-41d4-a716-446655440000 not found"
}
```

---

## Debugging

### Verify function exists
```sql
SELECT routine_type, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'calculate_match_scores';
```

### Test with sample data
```sql
-- Find a real match
SELECT id, stage, home_score_official, away_score_official 
FROM bet_matches LIMIT 1;

-- Score it
SELECT calculate_match_scores(id, 2, 1) 
FROM bet_matches LIMIT 1;
```

### Check predictions for match
```sql
SELECT 
  user_id, 
  mode, 
  home_score_predicted, 
  away_score_predicted 
FROM bet_match_predictions 
WHERE match_id = 'uuid'
LIMIT 5;
```

### Verify scoring result
```sql
SELECT 
  user_id, 
  mode, 
  points_total 
FROM bet_scores_aggregate 
WHERE user_id IN (
  SELECT user_id FROM bet_match_predictions WHERE match_id = 'uuid'
);
```

---

## Maximum Points Per Mode

| Mode | Group Stage | Knockout | Notes |
|------|-------------|----------|-------|
| GLOBAL Exact | 10 | 20 | Perfect prediction |
| GLOBAL Partial | 9 | 18 | Best without exact |
| POOL | Config × 1 | Config × 2 | Based on config |

---

## Stage Multipliers

| Stage | Multiplier | Examples |
|-------|-----------|----------|
| `group_stage` | 1× | Real Copa, Real Euro |
| `round_of_32` | 2× | Post-group phase |
| `round_of_16` | 2× | Knockout begins |
| `quarter_finals` | 2× | QF onwards |
| `semi_finals` | 2× | Semi finals |
| `third_place` | 2× | 3rd place match |
| `final` | 2× | Championship final |

---

## Test Cases Summary

| Test | Input | Expected |
|------|-------|----------|
| Exact group | (2,1,2,1,1) | 10 |
| Winner + away | (3,1,2,1,1) | 7 |
| Home only | (2,2,2,1,1) | 2 |
| Wrong | (2,1,1,2,1) | 0 |
| Exact KO | (1,0,1,0,2) | 20 |
| Draw | (2,2,2,2,1) | 10 |
| Both wrong winner | (3,2,2,3,1) | 4 |

---

## Performance Notes

- **Time:** ~100-200ms per match (typical 50-80 predictions)
- **Suitable for:** Webhook/queue processing, batch jobs
- **Not suitable for:** Real-time UI (<10ms requirement)
- **Complexity:** O(n) where n = predictions per match

---

## Files Reference

| File | Purpose |
|------|---------|
| `scoring-engine.sql` | Main implementation |
| `test-scoring-engine.sql` | Test suite |
| `SCORING_ENGINE.md` | Full documentation |
| `SCORING_ENGINE_VERIFICATION.md` | Technical specs |
| `SCORING_ENGINE_SUMMARY.md` | Executive summary |
| This file | Quick reference |

---

## Quick Deploy

```bash
# 1. Deploy functions
supabase db execute < scoring-engine.sql

# 2. Run tests
supabase db execute < test-scoring-engine.sql

# 3. Test live (psql)
psql -U postgres -d fut_match << EOF
SELECT calculate_match_scores(
  'match-uuid'::UUID, 2, 1
);
EOF
```

---

## Support Links

- **Schema:** `supabase-bet-schema.sql`
- **API:** `/api/bet/process-match`
- **Realtime:** Supabase Realtime docs
- **RLS:** `supabase-bet-rls.sql`
