# Parti2 Bet - Database Migration Execution Guide

**Last Updated:** May 27, 2026  
**Purpose:** Step-by-step instructions to deploy the Parti2 Bet schema to Supabase

---

## Prerequisites

✅ Supabase project created  
✅ `supabase` CLI installed: `npm install -g supabase@latest`  
✅ Local repository initialized: `git init`  

---

## Step 1: Setup Supabase Link

```bash
# Authenticate with Supabase
supabase login

# Link to your project (get project-ref from Supabase dashboard)
supabase link --project-ref your_project_ref

# Verify connection
supabase projects list
```

---

## Step 2: Verify Migration Files

Ensure these files exist in your project:

```bash
ls -la supabase/migrations/
# Expected:
# - 20260527_001_create_bet_tables.sql
# - 20260527_002_create_rls_policies.sql
# - 20260527_003_create_scoring_functions.sql
```

---

## Step 3: Dry Run (Recommended)

Test the migrations without applying them:

```bash
supabase db push --dry-run

# Output should show:
# - Creating enums (bet_tournament_status, etc.)
# - Creating tables
# - Creating indexes
# - Creating functions
# - Creating triggers
# - Enabling RLS
```

If you see errors, check:
- SQL syntax in migration files
- Comment formatting
- Enum definitions

---

## Step 4: Apply Migrations

```bash
supabase db push

# Follow prompts to confirm
# Should see: "✓ Migrations applied successfully"
```

**What gets created:**
```
✅ Enums (5)
   - bet_tournament_status
   - bet_match_stage
   - bet_match_status
   - bet_visibility
   - bet_prediction_mode

✅ Tables (10)
   - bet_tournaments
   - bet_teams
   - bet_matches
   - bet_pools
   - bet_pool_members
   - bet_pool_config_versions
   - bet_match_predictions
   - bet_scores_aggregate
   - bet_audit_logs
   - bet_notification_queue

✅ Indexes (35+)
   - For leaderboard queries
   - For audit logs
   - For realtime subscriptions

✅ Functions (15+)
   - fn_calculate_global_points
   - fn_calculate_match_scores_v1
   - fn_get_global_leaderboard
   - (see migration file for full list)

✅ Triggers (6)
   - Auto-update timestamps
   - Auto-generate invite codes
```

---

## Step 5: Verify Schema in Supabase

### Via Dashboard

1. Go to https://app.supabase.com → Your Project
2. **SQL Editor** → **Saved Queries** → View schema:

```sql
-- Check tables
SELECT tablename FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE 'bet_%'
ORDER BY tablename;

-- Expected: 10 tables returned
```

### Via CLI

```bash
supabase db pull
# Pulls current schema into local migrations/

# Verify no conflicts
git diff supabase/
```

---

## Step 6: Test RLS Policies

### As Admin (Service Role)

```sql
-- In Supabase SQL Editor (connected as service role)
INSERT INTO bet_tournaments (name, slug, status, kickoff_inaugural_at)
VALUES (
  'Copa Mundial 2026',
  'fifa-2026',
  'draft',
  '2026-06-15 14:00:00+00'
);

-- Should succeed
```

### As Authenticated User

```sql
-- Test as authenticated user (use anon key)
-- Note: This requires being logged in with Supabase auth

-- Try to insert as non-owner
-- Should fail due to RLS policy
```

---

## Step 7: Seed Initial Data (Optional)

### Create FIFA 2026 Tournament

```sql
INSERT INTO bet_tournaments (name, slug, status, kickoff_inaugural_at)
VALUES (
  'Copa Mundial de la FIFA 2026',
  'fifa-2026',
  'draft',
  '2026-06-15 14:00:00+00'
) RETURNING id;

-- Save the returned UUID as TOURNAMENT_ID
```

### Insert Teams (32 Countries)

```sql
INSERT INTO bet_teams (name, fifa_code, flag_svg_url) VALUES
('Colombia', 'COL', 'https://flagcdn.com/w320/co.png'),
('México', 'MEX', 'https://flagcdn.com/w320/mx.png'),
('Argentina', 'ARG', 'https://flagcdn.com/w320/ar.png'),
('Brasil', 'BRA', 'https://flagcdn.com/w320/br.png'),
('Alemania', 'GER', 'https://flagcdn.com/w320/de.png'),
('Francia', 'FRA', 'https://flagcdn.com/w320/fr.png'),
('España', 'ESP', 'https://flagcdn.com/w320/es.png'),
('Italia', 'ITA', 'https://flagcdn.com/w320/it.png'),
('Países Bajos', 'NED', 'https://flagcdn.com/w320/nl.png'),
('Bélgica', 'BEL', 'https://flagcdn.com/w320/be.png'),
('Portugal', 'POR', 'https://flagcdn.com/w320/pt.png'),
('Japón', 'JPN', 'https://flagcdn.com/w320/jp.png'),
('Corea del Sur', 'KOR', 'https://flagcdn.com/w320/kr.png'),
('Australia', 'AUS', 'https://flagcdn.com/w320/au.png'),
('Marruecos', 'MAR', 'https://flagcdn.com/w320/ma.png'),
('Túnez', 'TUN', 'https://flagcdn.com/w320/tn.png'),
('Senegal', 'SEN', 'https://flagcdn.com/w320/sn.png'),
('Nigeria', 'NGA', 'https://flagcdn.com/w320/ng.png'),
('Irán', 'IRN', 'https://flagcdn.com/w320/ir.png'),
('Arabia Saudita', 'SAU', 'https://flagcdn.com/w320/sa.png'),
('Canadá', 'CAN', 'https://flagcdn.com/w320/ca.png'),
('Costa Rica', 'CRC', 'https://flagcdn.com/w320/cr.png'),
('Uruguay', 'URU', 'https://flagcdn.com/w320/uy.png'),
('Paraguay', 'PAR', 'https://flagcdn.com/w320/py.png'),
('Perú', 'PER', 'https://flagcdn.com/w320/pe.png'),
('Chile', 'CHI', 'https://flagcdn.com/w320/cl.png'),
('Ecuador', 'ECU', 'https://flagcdn.com/w320/ec.png'),
('Bolivia', 'BOL', 'https://flagcdn.com/w320/bo.png'),
('Suiza', 'SUI', 'https://flagcdn.com/w320/ch.png'),
('Austria', 'AUT', 'https://flagcdn.com/w320/at.png'),
('República Checa', 'CZE', 'https://flagcdn.com/w320/cz.png'),
('Ucrania', 'UKR', 'https://flagcdn.com/w320/ua.png');

-- Should insert 32 teams
```

### Insert Sample Matches (Group A)

```sql
INSERT INTO bet_matches (
  tournament_id, stage, group_name, kickoff_at,
  home_team_id, away_team_id, status
)
SELECT
  TOURNAMENT_ID,
  'group_stage'::bet_match_stage,
  'A',
  '2026-06-15 14:00:00+00',
  (SELECT id FROM bet_teams WHERE fifa_code = 'COL'),
  (SELECT id FROM bet_teams WHERE fifa_code = 'MEX'),
  'scheduled'::bet_match_status;

-- Add more matches as needed
```

---

## Step 8: Verify Functions

### Test Scoring Function

```sql
-- Set some variables (use your actual IDs)
SELECT 
  fn_calculate_global_points(
    2,  -- home_score_official
    1,  -- away_score_official
    2,  -- home_score_predicted
    1,  -- away_score_predicted
    'group_stage'::bet_match_stage
  ) as points;

-- Expected output: 10 (exact match)
```

### Test Leaderboard Function

```sql
-- Should return empty until scores are added
SELECT * FROM fn_get_global_leaderboard(100, 0);
```

---

## Step 9: Enable Realtime (Optional)

For live leaderboard updates:

```sql
-- In Supabase dashboard → Database → Publications

-- Add tables to realtime publication:
-- - bet_match_predictions
-- - bet_scores_aggregate

-- Or via CLI:
supabase realtime start
```

---

## Step 10: Backup Schema

```bash
# Export current schema
supabase db pull

# Commit to git
git add supabase/
git commit -m "feat(bet): Initialize Parti2 Bet database schema"

# Create backup
pg_dump 'postgresql://...' > bet_schema_backup.sql
```

---

## Troubleshooting

### Error: "Function does not exist"

**Cause:** Migrations ran out of order

**Solution:**
```bash
# Check migration history
supabase db pull

# Verify 003_create_scoring_functions.sql applied
grep "fn_calculate_global_points" supabase/migrations/*
```

### Error: "Permission denied" on RLS policy

**Cause:** Using wrong auth role

**Solution:**
```bash
# Verify auth role in Supabase dashboard
# Settings → Auth Providers → Enable email/password

# Test with correct auth context
supabase auth signin --email test@example.com --password password123
```

### Error: "Enum type does not exist"

**Cause:** 001_create_bet_tables.sql didn't execute

**Solution:**
```bash
# Re-apply migration 001
supabase db reset
supabase db push
```

---

## Post-Deployment Checklist

- [ ] All 10 tables created
- [ ] All 35+ indexes created
- [ ] All 15+ functions created
- [ ] All 23 RLS policies created
- [ ] RLS enabled on all 10 tables
- [ ] Service role can insert scores
- [ ] Authenticated user can create pools
- [ ] Public pool visible to all
- [ ] Private pool visible only to members
- [ ] Prediction locked after kickoff - 10 min
- [ ] Scoring function calculates correctly
- [ ] Leaderboard query returns results
- [ ] Audit logs immutable

---

## Next Steps

1. **Create API routes:** `/app/api/v1/bet/`
2. **Implement UI:** React components
3. **Add tests:** Jest + Postgres
4. **Deploy to staging:** Verify end-to-end
5. **Monitor:** Error rates, query performance
6. **Go live:** Production deployment

---

## Rollback Procedure

If something goes wrong:

```bash
# Option 1: Reset entire schema (development only!)
supabase db reset

# Option 2: Manual rollback
supabase db push --version <version_before_error>

# Option 3: Drop specific table
supabase --sql "DROP TABLE IF EXISTS bet_pools CASCADE;"

# Verify rollback
supabase db pull
```

---

## Performance Validation

After deployment, run these queries to verify performance:

```sql
-- Leaderboard query (should be < 500ms)
EXPLAIN ANALYZE
SELECT * FROM fn_get_global_leaderboard(100, 0);

-- Prediction insertion (should be < 200ms)
EXPLAIN ANALYZE
INSERT INTO bet_match_predictions 
(mode, user_id, pool_id, match_id, home_score_predicted, away_score_predicted)
VALUES ('global', 'uuid', NULL, 'uuid', 2, 1);

-- Check index usage
SELECT indexname FROM pg_indexes 
WHERE tablename LIKE 'bet_%' ORDER BY indexname;
```

---

## Monitoring & Maintenance

### Daily
- Monitor error logs for RLS violations
- Check notification queue (`bet_notification_queue`)

### Weekly
- Vacuum analyze indexes: `VACUUM ANALYZE;`
- Check unused indexes: `pg_stat_user_indexes`

### Monthly
- Archive audit logs older than 90 days
- Archive notifications older than 30 days

```sql
SELECT fn_archive_audit_logs();
SELECT fn_cleanup_notification_queue();
```

---

**Status:** Ready for Production  
**Last Tested:** May 27, 2026  
**Database Version:** Supabase PostgreSQL 15+
