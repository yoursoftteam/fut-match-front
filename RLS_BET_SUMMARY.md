# Parti2 Bet Module - Row Level Security (RLS) Implementation Summary

**Date:** 2024  
**Status:** ✅ Production-Ready  
**File:** `supabase-bet-rls.sql`

---

## Overview

This document summarizes all Row Level Security policies, helper functions, and triggers implemented for the Parti2 Bet module. All policies are designed to enforce data access control at the database level, ensuring users can only access data they're authorized to see.

---

## 🔐 Security Architecture

### Authentication Model
- **Role:** `authenticated` (all logged-in users)
- **Auth Context:** `auth.uid()` provides the current user's UUID
- **Execution:** Policies evaluated using SECURITY DEFINER functions for elevated privileges

### Core Principles
1. **Principle of Least Privilege:** Users get minimum required access
2. **Temporal Constraints:** Match lock time (kickoff - 10 min) controls prediction visibility
3. **Membership-Based Access:** Pool membership determines visibility of private pool data
4. **Immutable Audit Trail:** All prediction changes logged (cannot be modified/deleted)

---

## 📋 Tables with RLS Enabled

| Table | Purpose | RLS Status |
|-------|---------|-----------|
| `bet_tournaments` | Tournament reference data | ✅ Enabled (read-only) |
| `bet_teams` | Team reference data | ✅ Enabled (read-only) |
| `bet_matches` | Match reference data | ✅ Enabled (read-only) |
| `bet_pools` | Betting pools | ✅ Enabled (full control) |
| `bet_pool_config_versions` | Pool scoring configuration | ✅ Enabled (owner-controlled) |
| `bet_match_predictions` | User predictions | ✅ Enabled (time-locked) |
| `bet_scores_aggregate` | Leaderboard scores | ✅ Enabled (system-only writes) |
| `bet_audit_log` | Audit trail | ✅ Enabled (append-only) |
| `bet_notification_queue` | Notification queue | ✅ Enabled (system-only) |

---

## 🔧 Helper Functions

### 1. `is_pool_member(user_id UUID, pool_id UUID) → BOOLEAN`

**Purpose:** Determine if a user is a member of a betting pool

**Logic:**
- Returns `TRUE` if user is:
  1. Pool owner, OR
  2. Has predictions in pool, OR
  3. Has score aggregates in pool

**Security:** SECURITY DEFINER (elevated execution)

**Usage:**
- BET_POOLS policies (visibility='private')
- BET_POOL_CONFIG_VERSIONS policies
- BET_MATCH_PREDICTIONS policies (private pool access)
- BET_SCORES_AGGREGATE policies (private pool scores)

**Example:**
```sql
-- Check if user abc123 is member of pool xyz789
SELECT is_pool_member('abc123'::uuid, 'xyz789'::uuid);
```

---

### 2. `is_match_locked(match_id UUID) → BOOLEAN`

**Purpose:** Check if a match is locked for prediction modifications

**Lock Logic:**
- Match is locked when: `NOW() > (kickoff_at - INTERVAL '10 minutes')`
- Lock time prevents predictions within 10 minutes of kickoff

**Security:** SECURITY DEFINER

**Usage:**
- BET_MATCH_PREDICTIONS INSERT/UPDATE/DELETE policies
- Trigger: `check_prediction_lock()`
- Determines if users can still modify their predictions

**Example:**
```sql
-- Check if match abc123 is locked
SELECT is_match_locked('abc123'::uuid);
```

---

### 3. `can_see_match_results(match_id UUID) → BOOLEAN`

**Purpose:** Check if match results/predictions are visible to other users

**Visibility Logic:**
- Results visible when: `NOW() > (kickoff_at - INTERVAL '10 minutes')`
- Once match is locked, other users' predictions become visible

**Security:** SECURITY DEFINER

**Usage:**
- BET_MATCH_PREDICTIONS SELECT policies (reading others' predictions)

**Example:**
```sql
-- Check if results for match abc123 are visible
SELECT can_see_match_results('abc123'::uuid);
```

---

### 4. `can_see_prediction(prediction_id UUID) → BOOLEAN`

**Purpose:** Fine-grained visibility check for a specific prediction

**Visibility Rules:**
- User's own predictions: Always visible
- Others' predictions: Visible only if:
  1. Match is locked, AND
  2. Either:
     - Prediction in public pool, OR
     - User is member of private pool, OR
     - Prediction is in global pool (pool_id IS NULL)

**Security:** SECURITY DEFINER

**Example:**
```sql
-- Check if current user can see prediction pred123
SELECT can_see_prediction('pred123'::uuid);
```

---

## 📊 Policies by Table

### BET_TOURNAMENTS
| Action | Rule | Public? |
|--------|------|---------|
| SELECT | All authenticated users | ✅ Yes |
| INSERT | Blocked (service role only) | ❌ No |
| UPDATE | Blocked (service role only) | ❌ No |
| DELETE | Blocked (service role only) | ❌ No |

**Intent:** Reference data, read-only for all users

---

### BET_TEAMS
| Action | Rule | Public? |
|--------|------|---------|
| SELECT | All authenticated users | ✅ Yes |
| INSERT | Blocked (service role only) | ❌ No |
| UPDATE | Blocked (service role only) | ❌ No |
| DELETE | Blocked (service role only) | ❌ No |

**Intent:** Reference data, read-only for all users

---

### BET_MATCHES
| Action | Rule | Public? |
|--------|------|---------|
| SELECT | All authenticated users | ✅ Yes |
| INSERT | Blocked (service role only) | ❌ No |
| UPDATE | Blocked (service role only) | ❌ No |
| DELETE | Blocked (service role only) | ❌ No |

**Intent:** Reference data, read-only for all users

---

### BET_POOLS

**Requirement 1: SELECT with visibility control**

| Scenario | Access |
|----------|--------|
| visibility='public' | All authenticated users ✅ |
| visibility='private' + owner | Pool owner ✅ |
| visibility='private' + member | Pool members ✅ |
| visibility='private' + other | Denied ❌ |

**Policy:**
```sql
-- Public pools: anyone authenticated
CREATE POLICY "allow_read_public_pools"
  USING (visibility = 'public');

-- Private pools: owner or member only
CREATE POLICY "allow_read_private_pools_if_member"
  USING (
    visibility = 'private'
    AND (owner_id = auth.uid() OR is_pool_member(auth.uid(), id))
  );
```

**Requirement 2: INSERT/UPDATE/DELETE - owner only**

| Action | Rule |
|--------|------|
| INSERT | `owner_id = auth.uid()` ✅ |
| UPDATE | `owner_id = auth.uid()` ✅ |
| DELETE | `owner_id = auth.uid()` ✅ |

**Policy:**
```sql
CREATE POLICY "allow_pool_creation"
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "allow_pool_owner_update"
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "allow_pool_owner_delete"
  USING (owner_id = auth.uid());
```

---

### BET_POOL_CONFIG_VERSIONS

**Requirement: All operations - owner-controlled**

| Action | Rule |
|--------|------|
| SELECT | Owner or pool member ✅ |
| INSERT | Owner only ✅ |
| UPDATE | Owner only ✅ |
| DELETE | Owner only ✅ |

**Policy:** Owner/member access via pool relationship

---

### BET_MATCH_PREDICTIONS

**Requirement 1: SELECT - temporal and membership-based**

| Scenario | Access |
|----------|--------|
| Own prediction | Always ✅ |
| Others' prediction, match locked | Public pool or member ✅ |
| Others' prediction, match unlocked | Denied ❌ |
| Global prediction (pool_id IS NULL), match locked | Access ✅ |

**Policy:**
```sql
-- Always see own predictions
CREATE POLICY "allow_read_own_predictions"
  USING (user_id = auth.uid());

-- See others only after match lock
CREATE POLICY "allow_read_others_predictions_when_locked"
  USING (
    user_id != auth.uid()
    AND is_match_locked(match_id)
    AND (
      pool_id IS NULL
      OR (SELECT visibility = 'public' FROM bet_pools WHERE id = pool_id)
      OR is_pool_member(auth.uid(), pool_id)
    )
  );
```

**Requirement 2: INSERT - user-owned, time-locked**

| Rule | Check |
|------|-------|
| User must own prediction | `user_id = auth.uid()` ✅ |
| Match must be unlocked | `NOT is_match_locked(match_id)` ✅ |

**Requirement 3: UPDATE - user-owned, time-locked**

| Rule | Check |
|------|-------|
| User must own prediction | `user_id = auth.uid()` ✅ |
| Match must be unlocked | `NOT is_match_locked(match_id)` ✅ |

**Requirement 4: DELETE - user-owned, time-locked**

| Rule | Check |
|------|-------|
| User must own prediction | `user_id = auth.uid()` ✅ |
| Match must be unlocked | `NOT is_match_locked(match_id)` ✅ |

---

### BET_SCORES_AGGREGATE

**Requirement 1: SELECT - visibility-based**

| Scenario | Access |
|----------|--------|
| Own score | Always ✅ |
| Public pool score | Any user ✅ |
| Private pool score | Member only ✅ |

**Policy:**
```sql
-- Own scores
CREATE POLICY "allow_read_own_scores"
  USING (user_id = auth.uid());

-- Public pool scores
CREATE POLICY "allow_read_public_pool_scores"
  USING (
    pool_id IS NOT NULL
    AND (SELECT visibility = 'public' FROM bet_pools WHERE id = pool_id)
  );

-- Private pool scores (members)
CREATE POLICY "allow_read_private_pool_scores_if_member"
  USING (
    pool_id IS NOT NULL
    AND (SELECT visibility = 'private' FROM bet_pools WHERE id = pool_id)
    AND is_pool_member(auth.uid(), pool_id)
  );
```

**Requirement 2: INSERT/UPDATE/DELETE - system-only**

| Action | User Access |
|--------|-------------|
| INSERT | Blocked ❌ |
| UPDATE | Blocked ❌ |
| DELETE | Blocked ❌ |

**Policy:** All blocked via `WITH CHECK (false)` / `USING (false)`

**Note:** Only backend/triggers can modify scores via service role

---

### BET_AUDIT_LOG

**Requirement 1: SELECT - own records only**

| Scenario | Access |
|----------|--------|
| Own audit entry | ✅ |
| Other user's entry | ❌ |

**Policy:**
```sql
CREATE POLICY "allow_read_own_audit_logs"
  USING (user_id = auth.uid());
```

**Requirement 2: INSERT/UPDATE/DELETE - system-only**

| Action | User Access | System Access |
|--------|-------------|---------------|
| INSERT | Blocked ❌ | Allowed (triggers) ✅ |
| UPDATE | Blocked ❌ | Blocked ❌ |
| DELETE | Blocked ❌ | Blocked ❌ |

**Policy:** All user writes blocked, only system can insert via triggers

---

### BET_NOTIFICATION_QUEUE

**Requirement 1: SELECT - own notifications only**

| Scenario | Access |
|----------|--------|
| Own notification | ✅ |
| Other user's notification | ❌ |

**Policy:**
```sql
CREATE POLICY "allow_read_own_notifications"
  USING (user_id = auth.uid());
```

**Requirement 2: INSERT/UPDATE/DELETE - system-only**

| Action | User Access | System Access |
|--------|-------------|---------------|
| INSERT | Blocked ❌ | Allowed ✅ |
| UPDATE | Blocked ❌ | Allowed ✅ |
| DELETE | Blocked ❌ | Blocked ❌ |

**Policy:** All user writes blocked, only system can modify

---

## 🔔 Triggers

### Trigger: `check_prediction_lock()`

**Type:** BEFORE UPDATE on `bet_match_predictions`

**Purpose:** Enforce that locked matches cannot have predictions updated

**Logic:**
```sql
IF is_match_locked(NEW.match_id) THEN
  RAISE EXCEPTION 'Cannot update prediction after match lock time (kickoff - 10 minutes)';
END IF;
```

**Behavior:**
- Fires before every prediction UPDATE
- Double-checks match lock status (defense in depth)
- Throws exception if match is locked
- Prevents both RLS bypass and direct SQL updates

---

### Trigger: `log_prediction_audit()`

**Type:** AFTER UPDATE on `bet_match_predictions`

**Purpose:** Log all prediction changes to audit trail

**Logic:**
```sql
IF OLD.home_score_predicted != NEW.home_score_predicted
   OR OLD.away_score_predicted != NEW.away_score_predicted THEN
  INSERT INTO bet_audit_log (
    user_id, action, match_id, old_value, new_value
  );
END IF;
```

**Behavior:**
- Fires after successful prediction UPDATE
- Only logs if prediction values actually changed
- Records old and new scores for accountability
- Bypasses INSERT RLS policy via SECURITY DEFINER trigger

**Audit Entry Format:**
- `user_id`: User who made the change
- `action`: "update_prediction"
- `match_id`: The match being predicted
- `old_value`: Combined score `(home * 100 + away)`
- `new_value`: Combined score `(home * 100 + away)`
- `timestamp`: Automatic NOW()

**Example:**
- User predicts 2-1 (old: 0-0, new: 2-1)
- Audit record: `old_value=0, new_value=201`

---

## 🎯 Security Test Scenarios

### Scenario 1: Public Pool Visibility

```
User A creates public pool "EPO2024"
User B queries bet_pools → sees pool ✅ (visibility='public')
User B queries predictions → sees others' after match locks ✅
User B attempts INSERT → blocked ❌ (not owner)
```

**Policies Enforced:**
- `allow_read_public_pools` ✅
- `allow_read_others_predictions_when_locked` ✅
- `allow_pool_creation` blocks non-owner ❌

---

### Scenario 2: Private Pool Membership

```
User A creates private pool "Amigos"
User B tries to read → blocked ❌ (not member)
User A invites User B (User B makes prediction)
User B queries pool → sees pool ✅ (is_pool_member returns TRUE)
User C tries to read → blocked ❌ (not invited, no predictions)
```

**Policies Enforced:**
- `allow_read_private_pools_if_member` checks membership ✅
- `is_pool_member()` detects User B has predictions ✅
- Non-member denied access ❌

---

### Scenario 3: Match Lock Enforcement

```
Match kicks off at 2024-01-15 14:00 UTC
Lock time: 2024-01-15 13:50 UTC (kickoff - 10 min)

13:45 UTC: User A can INSERT prediction ✅
13:49 UTC: User A can UPDATE prediction ✅
13:50 UTC: User A cannot UPDATE (locked) ❌
13:51 UTC: User B can READ User A's prediction ✅ (match locked)
```

**Policies Enforced:**
- `allow_user_create_predictions`: `NOT is_match_locked()` ✅
- `allow_user_update_predictions`: `NOT is_match_locked()` ✅
- `allow_read_others_predictions_when_locked`: `is_match_locked()` ✅
- Trigger `check_prediction_lock()`: Double check ✅

---

### Scenario 4: Audit Trail Immutability

```
User A makes prediction (2-1)
User A updates prediction (3-0)
  → Audit logged: 0 → 300 ✅
User A tries to DELETE audit → blocked ❌
User A tries to UPDATE audit → blocked ❌
Service role queries audit → sees all changes ✅
```

**Policies Enforced:**
- Trigger `log_prediction_audit()` records update ✅
- `block_user_insert/update/delete_audit_logs` prevents tampering ❌
- RLS allows service role unrestricted access ✅

---

## 📈 Performance Considerations

### Indexed Lookups
Helper functions use indexed columns for membership checks:
- `bet_pools.owner_id` (indexed)
- `bet_match_predictions.user_id` (indexed)
- `bet_match_predictions.pool_id` (indexed)
- `bet_scores_aggregate.user_id` (indexed)

### Query Optimization
- Subqueries in policies use EXISTS (efficient)
- No N+1 problems (single table joins)
- Lock check via `kickoff_at` column (indexed on `bet_matches`)

### Caching Strategy
- Helper functions are SECURITY DEFINER (can be cached at session level)
- Functions called per row filtered (efficient with proper indexes)

---

## 🚀 Deployment Checklist

- [x] All tables have RLS enabled
- [x] All helper functions created with SECURITY DEFINER
- [x] All policies defined with clear intent
- [x] Triggers for enforcement and audit
- [x] GRANT EXECUTE on authenticated role
- [x] Foreign key constraints verified
- [x] Index coverage for policy conditions

---

## 📝 Notes for Maintenance

### Adding New Policies
1. Identify the table and access pattern
2. Create helper function if needed (SECURITY DEFINER)
3. Define policies (USING for row filtering, WITH CHECK for new rows)
4. Grant appropriate permissions
5. Test with real user scenarios

### Modifying Lock Time
Current: 10 minutes before kickoff

To change:
```sql
-- Update INTERVAL in functions:
ALTER FUNCTION is_match_locked() -- change '10 minutes' to desired interval
ALTER FUNCTION can_see_match_results() -- same
```

### Audit Log Retention
Audit logs are append-only (no deletion). Consider archival strategy:
```sql
-- Archive old audit entries (example)
INSERT INTO bet_audit_log_archive
SELECT * FROM bet_audit_log
WHERE timestamp < NOW() - INTERVAL '12 months';
```

---

## 🔗 Related Files

- `supabase-bet-schema.sql` — Table definitions
- `supabase-bet-rls.sql` — This file (RLS policies)
- Schema migrations — Applied in order: schema → RLS

---

**Generated:** 2024  
**Version:** 1.0  
**Status:** Production Ready ✅
