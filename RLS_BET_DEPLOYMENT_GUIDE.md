# Parti2 Bet Module - RLS Deployment Guide

**Version:** 1.0 | **Date:** 2024 | **Status:** Ready for Production

---

## 🚀 Deployment Steps

### Step 1: Pre-Deployment Verification

✅ Verify Supabase project is set up:
```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE 'bet_%';
```

✅ Expected tables:
- `bet_tournaments`
- `bet_teams`
- `bet_matches`
- `bet_pools`
- `bet_pool_config_versions`
- `bet_match_predictions`
- `bet_scores_aggregate`
- `bet_audit_log`
- `bet_notification_queue`

### Step 2: Run Schema Migration (if not already done)

```bash
# Apply schema
psql -h [host] -U [user] -d [db] < supabase-bet-schema.sql
```

### Step 3: Run RLS Migration

```bash
# Apply RLS policies
psql -h [host] -U [user] -d [db] < supabase-bet-rls.sql
```

**Or via Supabase SQL Editor:**
1. Go to Supabase Dashboard → SQL Editor
2. Create new query
3. Copy entire content from `supabase-bet-rls.sql`
4. Execute

### Step 4: Post-Deployment Verification

✅ Verify RLS is enabled:
```sql
SELECT 
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE 'bet_%'
ORDER BY tablename;
```

Expected output: All tables should have `rowsecurity = t` (true)

✅ Verify policies exist:
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' AND tablename LIKE 'bet_%'
ORDER BY tablename, policyname;
```

Expected: 40 policies listed

✅ Verify functions exist:
```sql
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_name LIKE 'is_%' OR routine_name LIKE 'can_%'
ORDER BY routine_name;
```

Expected:
- `can_see_match_results`
- `can_see_prediction`
- `is_match_locked`
- `is_pool_member`

✅ Verify triggers exist:
```sql
SELECT 
  trigger_name,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public' AND event_object_table LIKE 'bet_%'
ORDER BY event_object_table, trigger_name;
```

Expected:
- `check_prediction_lock` on `bet_match_predictions`
- `log_prediction_audit` on `bet_match_predictions`

---

## 🧪 Testing After Deployment

### Test 1: Public Pool Visibility

```sql
-- Create test users
INSERT INTO auth.users (id, email) VALUES 
  ('user1'::uuid, 'user1@test.com'),
  ('user2'::uuid, 'user2@test.com');

-- Create public pool as user1
INSERT INTO bet_pools (owner_id, tournament_id, name, visibility, invite_code)
VALUES ('user1'::uuid, '...'::uuid, 'Test Pool', 'public', 'TEST123');

-- Test user2 can see public pool
SET LOCAL SESSION auth.uid = 'user2'::uuid;
SELECT * FROM bet_pools WHERE visibility = 'public';
-- Expected: 1 row visible
```

### Test 2: Private Pool Access Control

```sql
-- Create private pool as user1
INSERT INTO bet_pools (owner_id, tournament_id, name, visibility, invite_code)
VALUES ('user1'::uuid, '...'::uuid, 'Private Pool', 'private', 'PRIVATE123');

-- Test user2 cannot see private pool
SET LOCAL SESSION auth.uid = 'user2'::uuid;
SELECT * FROM bet_pools WHERE visibility = 'private';
-- Expected: 0 rows (access denied)

-- Test user1 can see own private pool
SET LOCAL SESSION auth.uid = 'user1'::uuid;
SELECT * FROM bet_pools WHERE visibility = 'private';
-- Expected: 1 row visible
```

### Test 3: Prediction Lock Enforcement

```sql
-- Create test match with kickoff in 15 minutes
INSERT INTO bet_matches (tournament_id, stage, home_team_id, away_team_id, kickoff_at)
VALUES 
  ('tour123'::uuid, 'group_stage'::uuid, 'team1'::uuid, 'team2'::uuid, NOW() + INTERVAL '15 minutes');

-- Create prediction as user1 (should succeed - match not locked)
SET LOCAL SESSION auth.uid = 'user1'::uuid;
INSERT INTO bet_match_predictions (user_id, match_id, pool_id, mode, home_score_predicted, away_score_predicted)
VALUES ('user1'::uuid, 'match123'::uuid, NULL, 'global', 2, 1);
-- Expected: 1 row inserted

-- Wait until 11 minutes before kickoff (lock time passed)
-- Try to update prediction (should fail - match locked)
UPDATE bet_match_predictions 
SET home_score_predicted = 3 
WHERE user_id = 'user1'::uuid;
-- Expected: ERROR - Cannot update prediction after match lock time
```

### Test 4: Audit Trail

```sql
-- Check audit log
SELECT * FROM bet_audit_log WHERE user_id = 'user1'::uuid;
-- Expected: Entries for prediction changes
```

---

## 🔒 Security Hardening Checklist

After deployment:

- [ ] Verify `authenticated` role has EXECUTE on all functions
- [ ] Verify `public` role cannot execute functions (security)
- [ ] Enable audit logging on `bet_audit_log` table
- [ ] Set up automated backups of audit trail
- [ ] Document access control policies in team wiki
- [ ] Train team on RLS principles
- [ ] Set up monitoring/alerts for audit anomalies

---

## 🛠️ Maintenance

### Adding New Users

No special action needed. RLS policies automatically apply.

### Modifying Lock Time

Current: 10 minutes before kickoff

To change to 15 minutes:

```sql
-- Update helper functions
CREATE OR REPLACE FUNCTION is_match_locked(match_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  lock_time TIMESTAMPTZ;
BEGIN
  SELECT kickoff_at - INTERVAL '15 minutes' INTO lock_time -- Changed from '10 minutes'
  FROM bet_matches
  WHERE id = match_id;
  
  IF lock_time IS NULL THEN
    RETURN FALSE;
  END IF;
  
  RETURN NOW() > lock_time;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Repeat for can_see_match_results()
```

### Archiving Old Audit Entries

```sql
-- Archive audit entries older than 1 year
INSERT INTO bet_audit_log_archive
SELECT * FROM bet_audit_log
WHERE timestamp < NOW() - INTERVAL '1 year';

DELETE FROM bet_audit_log
WHERE timestamp < NOW() - INTERVAL '1 year';
```

### Monitoring Policy Performance

```sql
-- Check for slow queries involving RLS
SELECT 
  query,
  mean_exec_time,
  calls
FROM pg_stat_statements
WHERE query LIKE '%bet_%'
ORDER BY mean_exec_time DESC
LIMIT 10;
```

---

## 🚨 Troubleshooting

### Issue: "permission denied" on policy query

**Cause:** User not properly authenticated

**Solution:**
```sql
-- Ensure auth.uid() is set
SET LOCAL SESSION auth.uid = 'your-user-id'::uuid;

-- Verify setting
SELECT auth.uid();
```

### Issue: Audit logs not recording

**Cause:** Trigger not firing or RLS blocking insert

**Solution:**
```sql
-- Check if trigger exists
SELECT trigger_name FROM information_schema.triggers 
WHERE event_object_table = 'bet_match_predictions';

-- Check trigger status
SELECT tgenabled FROM pg_trigger 
WHERE tgname = 'log_prediction_audit';
-- Should return 't' (enabled)

-- Enable if disabled
ALTER TABLE bet_match_predictions ENABLE TRIGGER log_prediction_audit;
```

### Issue: Private pool visible to unauthorized users

**Cause:** is_pool_member() not working or visibility flag wrong

**Solution:**
```sql
-- Verify visibility setting
SELECT id, name, visibility, owner_id FROM bet_pools;

-- Test is_pool_member function
SELECT is_pool_member('user-id'::uuid, 'pool-id'::uuid);

-- Verify predictions exist in pool
SELECT COUNT(*) FROM bet_match_predictions 
WHERE pool_id = 'pool-id'::uuid AND user_id = 'user-id'::uuid;
```

### Issue: Users can't create predictions

**Cause:** Match is locked or user_id mismatch

**Solution:**
```sql
-- Check if match is locked
SELECT is_match_locked('match-id'::uuid);

-- Check match kickoff time
SELECT kickoff_at, (kickoff_at - INTERVAL '10 minutes') as lock_time 
FROM bet_matches WHERE id = 'match-id'::uuid;

-- Verify user_id matches auth.uid()
SET LOCAL SESSION auth.uid = 'user-id'::uuid;
SELECT auth.uid();
-- Should match the user_id in INSERT statement
```

---

## 📊 Performance Optimization

### Add Indexes (if missing)

```sql
-- These should already exist from schema, but verify:
CREATE INDEX IF NOT EXISTS idx_bet_pools_visibility ON bet_pools(visibility);
CREATE INDEX IF NOT EXISTS idx_bet_pools_owner ON bet_pools(owner_id);
CREATE INDEX IF NOT EXISTS idx_bet_matches_kickoff ON bet_matches(kickoff_at);
CREATE INDEX IF NOT EXISTS idx_bet_match_predictions_user ON bet_match_predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_bet_match_predictions_pool_user ON bet_match_predictions(pool_id, user_id);
CREATE INDEX IF NOT EXISTS idx_bet_scores_aggregate_user ON bet_scores_aggregate(user_id);
```

### Query Planning

```sql
-- Analyze query performance
EXPLAIN ANALYZE
SELECT * FROM bet_pools 
WHERE visibility = 'private' 
  AND (owner_id = 'user-id'::uuid OR is_pool_member('user-id'::uuid, id));

-- Look for sequential scans (bad) vs index scans (good)
```

---

## 📝 Rollback Plan

If needed to rollback RLS:

```sql
-- Disable RLS on all tables
ALTER TABLE bet_tournaments DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_pools DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_pool_config_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_match_predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_scores_aggregate DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_audit_log DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_notification_queue DISABLE ROW LEVEL SECURITY;

-- Drop policies
DROP POLICY IF EXISTS allow_read_public_pools ON bet_pools;
-- ... (repeat for all policies)

-- Drop functions
DROP FUNCTION IF EXISTS is_pool_member(UUID, UUID);
DROP FUNCTION IF EXISTS is_match_locked(UUID);
DROP FUNCTION IF EXISTS can_see_match_results(UUID);
DROP FUNCTION IF EXISTS can_see_prediction(UUID);
```

---

## ✅ Final Verification

After deployment, verify:

```sql
-- 1. All tables have RLS enabled
SELECT COUNT(*) as rls_enabled FROM pg_tables 
WHERE schemaname = 'public' AND tablename LIKE 'bet_%' AND rowsecurity = true;
-- Expected: 9

-- 2. All policies defined
SELECT COUNT(*) as total_policies FROM pg_policies 
WHERE schemaname = 'public' AND tablename LIKE 'bet_%';
-- Expected: 40

-- 3. All functions exist
SELECT COUNT(*) as total_functions FROM information_schema.routines
WHERE routine_schema = 'public' 
  AND (routine_name LIKE 'is_%' OR routine_name LIKE 'can_%');
-- Expected: 4

-- 4. All triggers exist
SELECT COUNT(*) as total_triggers FROM information_schema.triggers
WHERE trigger_schema = 'public' AND event_object_table LIKE 'bet_%';
-- Expected: 2
```

---

## 📞 Support

For issues or questions:

1. Check `RLS_BET_POLICIES_QUICKREF.md` for policy reference
2. Check `RLS_BET_SUMMARY.md` for detailed documentation
3. Review `RLS_BET_VERIFICATION_REPORT.md` for verification steps
4. Contact database administrator

---

**Deployment Complete** ✅  
**Status:** Production Ready  
**Last Updated:** 2024
