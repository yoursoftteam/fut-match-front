# Parti2 Bet Module - RLS Deployment Guide

## 📋 Pre-Deployment Checklist

### 1. Prerequisites
- [ ] Supabase project is set up
- [ ] `supabase-bet-schema.sql` has been applied (tables exist)
- [ ] You have admin/service role access to Supabase

### 2. Files Required
- [ ] `supabase-bet-rls.sql` - Main RLS migration file
- [ ] `RLS_SUMMARY.md` - Policy documentation
- [ ] This guide

---

## 🚀 Deployment Steps

### Step 1: Backup Database
```bash
# If using Supabase CLI:
supabase db pull  # Creates a backup of remote schema
```

### Step 2: Apply RLS Migration

#### Option A: Using Supabase Dashboard
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Open `supabase-bet-rls.sql` and copy all content
5. Paste into the editor
6. Click **Run** button

#### Option B: Using Supabase CLI
```bash
# Create a migration file
supabase migration new apply_bet_rls

# Copy content of supabase-bet-rls.sql into the migration file
cp supabase-bet-rls.sql supabase/migrations/001_apply_bet_rls.sql

# Apply migration
supabase db push
```

### Step 3: Verify Deployment

Run these SQL queries in the SQL Editor to verify:

#### Check RLS is Enabled
```sql
-- Should show 't' (true) for all bet_* tables
SELECT tablename, 
       (SELECT relrowsecurity FROM pg_class WHERE relname = tablename) as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename LIKE 'bet_%'
ORDER BY tablename;
```

#### Count Policies
```sql
-- Should show approximately 47 policies across all bet_* tables
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename LIKE 'bet_%'
GROUP BY tablename
ORDER BY tablename;
```

#### Verify Functions
```sql
-- Should show 5 functions
SELECT proname, pronargs
FROM pg_proc
WHERE proname IN ('is_pool_member', 'is_match_locked', 'can_see_match_results', 
                   'check_prediction_lock', 'log_prediction_audit')
ORDER BY proname;
```

#### Verify Triggers
```sql
-- Should show 2 triggers on bet_match_predictions
SELECT triggername, tgtype
FROM pg_trigger
WHERE tgname IN ('check_prediction_lock', 'log_prediction_audit')
ORDER BY triggername;
```

---

## ✅ Post-Deployment Validation

### Security Tests

#### Test 1: Public Pool Visibility
```sql
-- Create test data
INSERT INTO bet_pools (tournament_id, owner_id, name, visibility, invite_code)
VALUES ('tournament-id-here', 'owner-user-id', 'Test Public Pool', 'public', 'TESTPUB123');

-- Login as different user, run SELECT
-- Should be able to read the pool
SELECT * FROM bet_pools WHERE visibility = 'public';
```

#### Test 2: Private Pool Restriction
```sql
-- Create private pool as User A
INSERT INTO bet_pools (tournament_id, owner_id, name, visibility, invite_code)
VALUES ('tournament-id-here', 'user-a-id', 'Test Private Pool', 'private', 'TESTPRIV123');

-- Login as User B (non-member)
-- Should NOT see the pool
SELECT COUNT(*) FROM bet_pools WHERE id = 'private-pool-id';  -- Returns 0

-- Add User B as member via prediction
INSERT INTO bet_match_predictions (mode, user_id, pool_id, match_id, home_score_predicted, away_score_predicted)
VALUES ('pool', 'user-b-id', 'private-pool-id', 'match-id', 2, 1);

-- Now User B should see the pool
SELECT COUNT(*) FROM bet_pools WHERE id = 'private-pool-id';  -- Returns 1
```

#### Test 3: Prediction Lock Enforcement
```sql
-- Get a match that's within 10 minutes of kickoff
SELECT id, kickoff_at, kickoff_at - interval '10 minutes' as lock_time
FROM bet_matches
WHERE NOW() > (kickoff_at - interval '10 minutes')
AND NOW() <= kickoff_at
LIMIT 1;

-- Try to update a prediction for this match (as the prediction owner)
UPDATE bet_match_predictions 
SET home_score_predicted = 3, away_score_predicted = 1
WHERE match_id = 'the-locked-match-id' AND user_id = auth.uid();

-- Should fail with: "Cannot update prediction after match lock time"
```

#### Test 4: Prediction Audit Logging
```sql
-- Check audit log before update
SELECT COUNT(*) FROM bet_audit_log WHERE user_id = auth.uid();

-- Update a prediction (if not locked)
UPDATE bet_match_predictions
SET home_score_predicted = 2, away_score_predicted = 0
WHERE id = 'some-prediction-id' AND user_id = auth.uid();

-- Check audit log after update - should have new entry
SELECT * FROM bet_audit_log 
WHERE user_id = auth.uid() 
AND action = 'update_prediction'
ORDER BY timestamp DESC
LIMIT 1;
```

#### Test 5: Score Read-Only
```sql
-- Try to insert scores as regular user
INSERT INTO bet_scores_aggregate (mode, pool_id, user_id, points_total)
VALUES ('pool', 'pool-id', auth.uid(), 100);

-- Should fail: permission denied (violates RLS policy)
```

#### Test 6: Notification Read-Own
```sql
-- Login as User A
SELECT COUNT(*) FROM bet_notification_queue WHERE user_id = auth.uid();  -- Returns notifications for User A

-- Should not be able to see notifications from other users
SELECT COUNT(*) FROM bet_notification_queue WHERE user_id != auth.uid();  -- Returns 0
```

---

## 🔍 Monitoring & Troubleshooting

### Check Policy Violations
```sql
-- Supabase logs permission errors; check them via dashboard
-- Dashboard → Logs → Filter by "RLS" or "policy"

-- Or via SQL (if audit logging is enabled):
SELECT * FROM auth.audit_log_entries
WHERE message LIKE '%RLS%' OR message LIKE '%policy%'
ORDER BY created_at DESC
LIMIT 20;
```

### Common Issues

#### Issue: "Permission denied for schema public"
**Cause:** RLS policy is blocking the operation
**Solution:** Review the operation against the policy rule and verify user context

#### Issue: "Column 'auth' does not exist"
**Cause:** `auth.uid()` or `auth.role()` called without proper context
**Solution:** Ensure operation is done by authenticated user (not service role)

#### Issue: Triggers not firing
**Cause:** Triggers disabled or table doesn't have them
**Solution:** Verify triggers exist via:
```sql
SELECT * FROM pg_trigger WHERE tgname IN ('check_prediction_lock', 'log_prediction_audit');
```

#### Issue: Infinite loop from trigger
**Cause:** Trigger recursion on same table
**Solution:** Ensure `log_prediction_audit` only inserts to `bet_audit_log`, not `bet_match_predictions`

---

## 🛠️ Policy Modification Guide

If you need to modify policies later:

### Update a Single Policy
```sql
DROP POLICY "policy_name" ON table_name;

CREATE POLICY "policy_name"
  ON table_name FOR SELECT
  TO authenticated
  USING (new_condition);
```

### Disable All RLS Temporarily (⚠️ Use with caution)
```sql
ALTER TABLE bet_tournaments DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_pools DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_pool_config_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_match_predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_scores_aggregate DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_notification_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_audit_log DISABLE ROW LEVEL SECURITY;
```

### Re-enable RLS
```sql
ALTER TABLE bet_tournaments ENABLE ROW LEVEL SECURITY;
-- ... (repeat for all tables)
```

---

## 📊 Performance Considerations

### Function Performance
- `is_pool_member()` - Performs 3 lookups; consider caching if called frequently
- `is_match_locked()` - Single table lookup; very fast
- Both functions are marked SECURITY DEFINER and indexed queries

### Trigger Performance
- `log_prediction_audit` - Only runs on UPDATE; minimal overhead
- `check_prediction_lock` - Runs on UPDATE; adds one function call

### Index Optimization
Ensure these indexes exist (created in schema):
```sql
CREATE INDEX idx_bet_pools_owner ON bet_pools(owner_id);
CREATE INDEX idx_bet_pools_visibility ON bet_pools(visibility);
CREATE INDEX idx_bet_match_predictions_user ON bet_match_predictions(user_id);
CREATE INDEX idx_bet_match_predictions_pool_user ON bet_match_predictions(pool_id, user_id);
CREATE INDEX idx_bet_match_predictions_match ON bet_match_predictions(match_id);
CREATE INDEX idx_bet_scores_aggregate_user ON bet_scores_aggregate(user_id);
CREATE INDEX idx_bet_scores_aggregate_pool_user ON bet_scores_aggregate(pool_id, user_id);
```

---

## 🚨 Rollback Procedure

If you need to rollback the RLS deployment:

### Option 1: Drop All Policies
```sql
-- Run this SQL to remove all policies
DO $$
DECLARE
  policy RECORD;
BEGIN
  FOR policy IN SELECT policyname, tablename FROM pg_policies WHERE tablename LIKE 'bet_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy.policyname, policy.tablename);
  END LOOP;
END $$;

-- Then disable RLS on all tables
ALTER TABLE bet_tournaments DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_teams DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_pools DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_pool_config_versions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_match_predictions DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_scores_aggregate DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_notification_queue DISABLE ROW LEVEL SECURITY;
ALTER TABLE bet_audit_log DISABLE ROW LEVEL SECURITY;
```

### Option 2: Drop Functions & Triggers
```sql
DROP TRIGGER IF EXISTS check_prediction_lock ON bet_match_predictions;
DROP TRIGGER IF EXISTS log_prediction_audit ON bet_match_predictions;
DROP FUNCTION IF EXISTS check_prediction_lock();
DROP FUNCTION IF EXISTS log_prediction_audit();
DROP FUNCTION IF EXISTS is_pool_member(UUID, UUID);
DROP FUNCTION IF EXISTS is_match_locked(UUID);
DROP FUNCTION IF EXISTS can_see_match_results(UUID);
```

---

## 📚 Reference Documentation

- **RLS Summary:** See `RLS_SUMMARY.md` for detailed policy documentation
- **Supabase RLS Guide:** https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL RLS:** https://www.postgresql.org/docs/current/ddl-rowsecurity.html

---

## ✨ Final Checklist

- [ ] All 9 tables have RLS enabled
- [ ] 47 policies successfully created
- [ ] 5 helper functions deployed
- [ ] 2 triggers active on bet_match_predictions
- [ ] Verification queries run and show correct counts
- [ ] Security tests passed
- [ ] No permission errors in logs
- [ ] Performance acceptable
- [ ] Team notified of RLS deployment
- [ ] Documentation updated if needed

**Status:** ✅ Ready for Production
