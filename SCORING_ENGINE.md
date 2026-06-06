# Parti2 Bet - Scoring Engine Documentation

## Overview

The Scoring Engine is a PostgreSQL-based system that automatically calculates betting points for all user predictions after match results are finalized. It supports two betting modes:

1. **GLOBAL Mode** - Fixed, universal point rules applied to all bets
2. **POOL Mode** - Customizable point rules per betting pool

## Architecture

### File Structure

```
scoring-engine.sql          - Main implementation (PostgreSQL functions)
test-scoring-engine.sql     - Comprehensive test suite
SCORING_ENGINE.md           - This documentation
```

### Functions Overview

| Function | Purpose | Returns |
|----------|---------|---------|
| `get_match_stage_multiplier()` | Determines point multiplier based on tournament stage | INT (1 or 2) |
| `evaluate_global_prediction()` | Calculates points for GLOBAL mode predictions | INT (points) |
| `evaluate_pool_prediction()` | Calculates points for POOL mode predictions | INT (points) |
| `calculate_match_scores()` | Main entry point - scores all predictions for a match | JSONB (results) |

---

## GLOBAL Mode Scoring Rules

GLOBAL mode uses **fixed, universal rules** that apply to all bets regardless of pool:

### Base Scoring (Group Stage)

| Condition | Points |
|-----------|--------|
| **Exact score match** (home_pred == home_official && away_pred == away_official) | **10 pts** |
| **OR (if not exact):** | |
| Correct match result (winner or draw) | 5 pts |
| Correct home team goals | 2 pts |
| Correct away team goals | 2 pts |

**Important:** When the exact score is correct, only 10 points are awarded (not 10 + combinations).

### Knockout Stage Multiplier

In knockout stages (Round of 32, Round of 16, Quarter Finals, Semi Finals, Third Place, Final), **all points are doubled**:

- Exact score in knockout: 10 × 2 = **20 pts**
- Correct winner in knockout: 5 × 2 = **10 pts**
- Goals bonus in knockout: 2 × 2 = **4 pts per goal**

---

## POOL Mode Scoring Rules

POOL mode uses **customizable point values** stored in `bet_pool_config_versions`:

```sql
pts_winner_selection    INT     -- Points for correct winner/draw (default: 3)
pts_exact_score         INT     -- Points for exact score (default: 2)
pts_team_goals          INT     -- Points per team's correct goals (default: 1)
pts_goal_difference     INT     -- Points for correct goal difference (default: 1)
```

### Scoring Logic

| Condition | Points |
|-----------|--------|
| **Exact score match** | `pts_exact_score` |
| **OR (if not exact):** | |
| Correct match result | `pts_winner_selection` |
| Correct home goals | `pts_team_goals` |
| Correct away goals | `pts_team_goals` |

**Note:** Exact score takes precedence - no additional points are awarded for winner/goals when score is exact.

### Example: Custom Pool Config

```
Pool "Copa America 2024" config:
  pts_winner_selection = 3
  pts_exact_score = 5
  pts_team_goals = 2

Prediction: Home 2, Away 1
Official:   Home 2, Away 0

Scoring:
  - Exact score? NO
  - Correct winner? YES (both home wins) → 3 pts
  - Correct home goals? YES (2 == 2) → 2 pts
  - Correct away goals? NO (1 ≠ 0) → 0 pts
  - Total: 5 pts
```

---

## Main Function: `calculate_match_scores()`

### Signature

```sql
calculate_match_scores(
  p_match_id UUID,
  p_home_official_score INT,
  p_away_official_score INT
) RETURNS JSONB
```

### Workflow

1. **Validation**
   - Verify match exists in `bet_matches`
   - Validate official scores are non-negative
   - Check for immutability (scores already recorded must match)

2. **Lookup**
   - Fetch match stage from `bet_matches`
   - Calculate stage multiplier via `get_match_stage_multiplier()`

3. **Processing**
   - Query all `bet_match_predictions` for the match
   - For each prediction:
     - Determine mode (GLOBAL or POOL)
     - Call appropriate evaluation function
     - Upsert points into `bet_scores_aggregate`

4. **Update**
   - Record official scores in `bet_matches`
   - Mark match as `finished`

5. **Response**
   - Return JSONB with complete scoring results

### Return Format

```json
{
  "success": true,
  "match_id": "uuid",
  "official_scores": {
    "home": 2,
    "away": 1
  },
  "points_awarded": [
    {
      "user_id": "uuid",
      "mode": "global",
      "pool_id": null,
      "points": 10
    },
    {
      "user_id": "uuid",
      "mode": "pool",
      "pool_id": "uuid",
      "points": 5
    }
  ],
  "total_predictions_scored": 2
}
```

### Error Handling

The function returns an error response on failure:

```json
{
  "success": false,
  "error": "Match abc123 not found"
}
```

### Possible Exceptions

- `Match not found`
- `Official scores must be non-negative`
- `Official scores already recorded and differ from provided scores`

---

## Integration with Backend

### API Endpoint Flow

```
Admin/Webhook POST /api/bet/process-match
  {
    "match_id": "uuid",
    "home_official_score": 2,
    "away_official_score": 1
  }
    ↓
Backend calls RPC:
  SELECT calculate_match_scores(
    'uuid',
    2,
    1
  )
    ↓
Postgres Function:
  - Evaluates all predictions
  - Updates aggregate scores
  - Triggers Realtime notification
    ↓
Response:
  {
    "success": true,
    "points_awarded": [...]
  }
```

### Realtime Notifications

After `calculate_match_scores()` completes successfully, a Postgres trigger (to be created) should:

1. Broadcast changes to Leaderboard listeners
2. Notify affected users of score updates
3. Publish to the `broadcast` channel for real-time UI updates

---

## Testing

### Running Tests

Execute the test suite against your Supabase database:

```bash
# Via Supabase CLI
supabase db execute < test-scoring-engine.sql

# Via psql
psql -h [HOST] -U postgres -d [DATABASE] -f test-scoring-engine.sql
```

### Test Cases Included

**9 test cases** covering:

1. ✓ Stage multiplier for group stage (returns 1)
2. ✓ Stage multiplier for knockout (returns 2)
3. ✓ Exact score in group stage (10 pts)
4. ✓ Correct winner + partial goals (7 pts)
5. ✓ Single goal correct (2 pts)
6. ✓ Completely wrong prediction (0 pts)
7. ✓ Exact score in knockout (20 pts with multiplier)
8. ✓ Draw prediction (10 pts)
9. ✓ Both goals correct but wrong winner (4 pts)
10. ✓ Null input handling (returns 0)

**Expected Result:** All tests should show "✓ PASS"

---

## Database Schema Requirements

The scoring engine depends on these tables:

### `bet_matches`
```sql
id UUID PRIMARY KEY
stage bet_match_stage
home_score_official INT
away_score_official INT
status bet_match_status
```

### `bet_match_predictions`
```sql
id UUID PRIMARY KEY
user_id UUID
mode bet_prediction_mode ('global' or 'pool')
pool_id UUID (NULL for global predictions)
match_id UUID
home_score_predicted INT
away_score_predicted INT
```

### `bet_pools` & `bet_pool_config_versions`
```sql
-- bet_pools
id UUID PRIMARY KEY
tournament_id UUID

-- bet_pool_config_versions
id UUID PRIMARY KEY
pool_id UUID
pts_winner_selection INT
pts_exact_score INT
pts_team_goals INT
pts_goal_difference INT
```

### `bet_scores_aggregate`
```sql
id UUID PRIMARY KEY
user_id UUID
mode bet_prediction_mode
pool_id UUID
points_total INT
updated_at TIMESTAMPTZ
```

---

## Scoring Examples

### Example 1: Exact Score in Group Stage

```
Match: Spain vs Morocco, Group Stage
Prediction: 2-1 (Spain wins)
Official:   2-1 (Spain wins)
Mode:       GLOBAL

Calculation:
  - Exact score? YES → 10 pts
  - Multiplier: 1 (group stage)
  - Final: 10 × 1 = 10 pts

Result: 10 points awarded ✓
```

### Example 2: Partial Match in Knockout

```
Match: France vs Spain, Semi Final
Prediction: 3-2 (France wins)
Official:   2-2 (Draw)
Mode:       GLOBAL

Calculation:
  - Exact score? NO
  - Correct result? NO (predicted home win, got draw)
  - Correct home goals? NO (3 ≠ 2)
  - Correct away goals? YES (2 == 2) → 2 pts
  - Multiplier: 2 (knockout)
  - Final: 2 × 2 = 4 pts

Result: 4 points awarded ✓
```

### Example 3: Custom Pool Configuration

```
Match: Argentina vs Netherlands, QF
Pool: "Euro 2024 Special"
Pool Config:
  pts_winner_selection = 4
  pts_exact_score = 8
  pts_team_goals = 3

Prediction: 1-1 (Draw)
Official:   2-0 (Argentina wins)
Mode:       POOL

Calculation:
  - Exact score? NO
  - Correct result? NO (predicted draw, got home win)
  - Correct home goals? NO (1 ≠ 2)
  - Correct away goals? NO (1 ≠ 0)
  - Multiplier: 2 (knockout)
  - Final: 0 × 2 = 0 pts

Result: 0 points awarded
```

### Example 4: Winner + Both Goals in Pool

```
Match: Germany vs Italy, Group Stage
Pool: "Copa 2024"
Pool Config:
  pts_winner_selection = 5
  pts_exact_score = 10
  pts_team_goals = 3

Prediction: 2-1 (Germany wins)
Official:   2-1 (Germany wins)
Mode:       POOL

Calculation:
  - Exact score? YES → 10 pts (pts_exact_score)
  - Multiplier: 1 (group stage)
  - Final: 10 × 1 = 10 pts

Result: 10 points awarded (exact score takes precedence) ✓
```

---

## Performance Considerations

### Indexing

The function uses indexed queries on:
- `bet_match_predictions(match_id)` - for fetching predictions
- `bet_pool_config_versions(pool_id, created_at DESC)` - for config lookup

### Complexity

- **Time:** O(n) where n = number of predictions for the match
- **Space:** O(n) for JSON response construction

### Scalability

For large tournaments (e.g., 64 matches, 1000 users = 64,000 predictions):
- Single match scoring: ~100-200ms
- Suitable for webhook/API queue processing

---

## Deployment Checklist

- [ ] File `scoring-engine.sql` deployed to Supabase
- [ ] All 4 functions created and compiling
- [ ] Permissions granted to `authenticated` role
- [ ] `bet_matches`, `bet_match_predictions`, `bet_scores_aggregate` tables exist
- [ ] Test suite executed with 100% pass rate
- [ ] API endpoint created to call `calculate_match_scores()`
- [ ] Realtime trigger created for leaderboard updates
- [ ] Documentation shared with team

---

## Future Enhancements

1. **Additional Point Categories**
   - Top scorer predictions
   - Championship winner predictions
   - Qualified team predictions

2. **Bonus Multipliers**
   - Difficulty-based multipliers (upset predictions worth more)
   - Consecutive correct predictions streak bonus
   - Perfect round completion bonus

3. **Audit Trail**
   - Log all score calculations
   - Track score changes/corrections
   - Maintain immutable history

4. **Performance Optimization**
   - Batch processing for multiple matches
   - Materialized views for leaderboards
   - Archive old predictions

---

## Support & Troubleshooting

### Function Not Found Error

```
ERROR: function calculate_match_scores(uuid, integer, integer) does not exist
```

**Solution:** Ensure `scoring-engine.sql` has been executed in your database.

### Scores Not Updating

**Check:**
1. Verify predictions exist for the match: `SELECT * FROM bet_match_predictions WHERE match_id = 'xyz'`
2. Verify pool config exists: `SELECT * FROM bet_pool_config_versions WHERE pool_id = 'xyz'`
3. Check `bet_scores_aggregate` for updates: `SELECT * FROM bet_scores_aggregate WHERE user_id = 'xyz'`

### Incorrect Points Calculation

**Verify:**
1. Stage multiplier: `SELECT get_match_stage_multiplier('stage_name')`
2. Prediction evaluation: `SELECT evaluate_global_prediction(p_h, p_a, o_h, o_a, mult)`
3. Manual calculation against spec

---

## Contact & Questions

For issues or enhancements, please reference:
- Database Schema: `supabase-bet-schema.sql`
- API Integration: `/api/bet/process-match` endpoint
- Realtime Events: Supabase Realtime documentation
