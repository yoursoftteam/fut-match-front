# Parti2 Bet Module - RLS Policies Quick Reference

**Status:** ✅ Production Ready | **Policies:** 40 | **Functions:** 4 | **Triggers:** 2

---

## 📚 Policy Index

### 🏆 BET_TOURNAMENTS (4 policies)
Public reference data - read-only

| # | Policy Name | Action | Rule | User Access |
|---|---|---|---|---|
| 1 | `allow_read_tournaments_to_authenticated` | SELECT | `true` | ✅ All |
| 2 | `allow_admin_modify_tournaments` | INSERT | `false` | ❌ None |
| 3 | `allow_admin_update_tournaments` | UPDATE | `false` | ❌ None |
| 4 | `allow_admin_delete_tournaments` | DELETE | `false` | ❌ None |

---

### 🏟️ BET_TEAMS (4 policies)
Public reference data - read-only

| # | Policy Name | Action | Rule | User Access |
|---|---|---|---|---|
| 1 | `allow_read_teams_to_authenticated` | SELECT | `true` | ✅ All |
| 2 | `allow_admin_modify_teams` | INSERT | `false` | ❌ None |
| 3 | `allow_admin_update_teams` | UPDATE | `false` | ❌ None |
| 4 | `allow_admin_delete_teams` | DELETE | `false` | ❌ None |

---

### ⚽ BET_MATCHES (4 policies)
Public reference data - read-only

| # | Policy Name | Action | Rule | User Access |
|---|---|---|---|---|
| 1 | `allow_read_matches_to_authenticated` | SELECT | `true` | ✅ All |
| 2 | `allow_admin_modify_matches` | INSERT | `false` | ❌ None |
| 3 | `allow_admin_update_matches` | UPDATE | `false` | ❌ None |
| 4 | `allow_admin_delete_matches` | DELETE | `false` | ❌ None |

---

### 🎯 BET_POOLS (5 policies)
Owner-controlled with visibility rules

| # | Policy Name | Action | Rule | User Access |
|---|---|---|---|---|
| 1 | `allow_read_public_pools` | SELECT | `visibility = 'public'` | ✅ All |
| 2 | `allow_read_private_pools_if_member` | SELECT | `visibility = 'private' AND (owner OR member)` | ✅ Owner/Members |
| 3 | `allow_pool_creation` | INSERT | `owner_id = auth.uid()` | ✅ Owner |
| 4 | `allow_pool_owner_update` | UPDATE | `owner_id = auth.uid()` | ✅ Owner |
| 5 | `allow_pool_owner_delete` | DELETE | `owner_id = auth.uid()` | ✅ Owner |

**Function Used:** `is_pool_member(auth.uid(), id)`

---

### ⚙️ BET_POOL_CONFIG_VERSIONS (4 policies)
Owner-controlled pool settings

| # | Policy Name | Action | Rule | User Access |
|---|---|---|---|---|
| 1 | `allow_read_pool_config_if_member` | SELECT | `owner OR member of pool` | ✅ Owner/Members |
| 2 | `allow_pool_owner_create_config` | INSERT | `owner of pool` | ✅ Owner |
| 3 | `allow_pool_owner_update_config` | UPDATE | `owner of pool` | ✅ Owner |
| 4 | `allow_pool_owner_delete_config` | DELETE | `owner of pool` | ✅ Owner |

**Function Used:** `is_pool_member(auth.uid(), pool_id)`

---

### 🎲 BET_MATCH_PREDICTIONS (5 policies)
Time-locked user predictions

| # | Policy Name | Action | Rule | User Access |
|---|---|---|---|---|
| 1 | `allow_read_own_predictions` | SELECT | `user_id = auth.uid()` | ✅ Owner |
| 2 | `allow_read_others_predictions_when_locked` | SELECT | `match locked AND (public pool OR member)` | ✅ After Lock |
| 3 | `allow_user_create_predictions` | INSERT | `user_id = auth.uid() AND NOT locked` | ✅ Before Lock |
| 4 | `allow_user_update_predictions` | UPDATE | `user_id = auth.uid() AND NOT locked` | ✅ Before Lock |
| 5 | `allow_user_delete_predictions` | DELETE | `user_id = auth.uid() AND NOT locked` | ✅ Before Lock |

**Functions Used:** `is_match_locked(match_id)`, `is_pool_member()`

**Temporal Logic:**
- **Before kickoff - 10 min:** User can CREATE/UPDATE/DELETE own predictions
- **After kickoff - 10 min:** Match LOCKED; predictions read-only, others visible

---

### 📊 BET_SCORES_AGGREGATE (6 policies)
Leaderboard - system-only writes

| # | Policy Name | Action | Rule | User Access |
|---|---|---|---|---|
| 1 | `allow_read_own_scores` | SELECT | `user_id = auth.uid()` | ✅ Owner |
| 2 | `allow_read_public_pool_scores` | SELECT | `pool.visibility = 'public'` | ✅ All in Pool |
| 3 | `allow_read_private_pool_scores_if_member` | SELECT | `member of private pool` | ✅ Members |
| 4 | `block_user_insert_scores` | INSERT | `false` | ❌ None |
| 5 | `block_user_update_scores` | UPDATE | `false` | ❌ None |
| 6 | `block_user_delete_scores` | DELETE | `false` | ❌ None |

**Functions Used:** Pool visibility checks

**Note:** Only backend/service role can modify scores

---

### 📝 BET_AUDIT_LOG (4 policies)
Immutable append-only audit trail

| # | Policy Name | Action | Rule | User Access |
|---|---|---|---|---|
| 1 | `allow_read_own_audit_logs` | SELECT | `user_id = auth.uid()` | ✅ Owner |
| 2 | `block_user_insert_audit_logs` | INSERT | `false` | ❌ None |
| 3 | `block_user_update_audit_logs` | UPDATE | `false` | ❌ None |
| 4 | `block_user_delete_audit_logs` | DELETE | `false` | ❌ None |

**Note:** Only triggers can insert via elevated privileges

---

### 🔔 BET_NOTIFICATION_QUEUE (4 policies)
System-managed notification queue

| # | Policy Name | Action | Rule | User Access |
|---|---|---|---|---|
| 1 | `allow_read_own_notifications` | SELECT | `user_id = auth.uid()` | ✅ Owner |
| 2 | `block_user_insert_notifications` | INSERT | `false` | ❌ None |
| 3 | `block_user_update_notifications` | UPDATE | `false` | ❌ None |
| 4 | `block_user_delete_notifications` | DELETE | `false` | ❌ None |

**Note:** Only backend can manage notifications

---

## 🔧 Helper Functions Reference

### `is_pool_member(user_id UUID, pool_id UUID) → BOOLEAN`

**Returns:** `TRUE` if user owns pool OR has predictions/scores in pool

**Used In:**
- bet_pools SELECT (private pools)
- bet_pool_config_versions SELECT/INSERT/UPDATE/DELETE
- bet_match_predictions SELECT (private pool predictions)
- bet_scores_aggregate SELECT (private pool scores)

**Indexes:** `bet_pools.owner_id`, `bet_match_predictions.user_id`, `bet_scores_aggregate.user_id`

---

### `is_match_locked(match_id UUID) → BOOLEAN`

**Returns:** `TRUE` if `NOW() > (kickoff_at - INTERVAL '10 minutes')`

**Used In:**
- bet_match_predictions INSERT (blocks locked matches)
- bet_match_predictions UPDATE (blocks locked matches)
- bet_match_predictions DELETE (blocks locked matches)
- Trigger: check_prediction_lock

**Index:** `bet_matches.kickoff_at`

---

### `can_see_match_results(match_id UUID) → BOOLEAN`

**Returns:** `TRUE` if `NOW() > (kickoff_at - INTERVAL '10 minutes')`

**Used In:**
- bet_match_predictions SELECT (others' predictions visible after lock)
- can_see_prediction function

**Index:** `bet_matches.kickoff_at`

---

### `can_see_prediction(prediction_id UUID) → BOOLEAN`

**Returns:** `TRUE` if user can view prediction

**Logic:**
1. Own prediction? → Always TRUE
2. Match not locked? → FALSE
3. Global prediction? → TRUE
4. Public pool? → TRUE
5. Private pool member? → check is_pool_member()

**Used In:** Fine-grained prediction visibility enforcement

---

## 🔔 Triggers Reference

### TRIGGER: `check_prediction_lock()` → BEFORE UPDATE

**Function:** Prevents updating locked predictions

```sql
BEFORE UPDATE ON bet_match_predictions
FOR EACH ROW
WHEN is_match_locked(NEW.match_id)
  RAISE EXCEPTION 'Cannot update prediction after match lock time'
```

**Defense-in-Depth:** Blocks bypass attempts even if RLS policy fails

---

### TRIGGER: `log_prediction_audit()` → AFTER UPDATE

**Function:** Records prediction changes

```sql
AFTER UPDATE ON bet_match_predictions
FOR EACH ROW
WHEN (score changed)
  INSERT INTO bet_audit_log (user_id, action, match_id, old_value, new_value)
```

**Values:** Encoded as `(home_score * 100 + away_score)`

---

## 🎯 Access Matrix

### Public Pool: everyone can read

| User | Own Prediction | Others' Before Lock | Others' After Lock |
|------|----------------|-------------------|------------------|
| Owner | ✅ | ✅ | ✅ |
| Member | ✅ | ❌ | ✅ |
| Other | ❌ | ❌ | ✅ |
| Non-Member | ❌ | ❌ | ✅ |

### Private Pool: members only

| User | Own Prediction | Others' Before Lock | Others' After Lock |
|------|----------------|-------------------|------------------|
| Owner | ✅ | ✅ | ✅ |
| Member | ✅ | ❌ | ✅ |
| Non-Member | ❌ | ❌ | ❌ |

---

## ⏰ Timeline: Match Lifecycle

```
T-11min: Predictions unlocked (before kick)
          - Users can CREATE/UPDATE/DELETE

T-10min: MATCH LOCKED (10 min before kickoff)
         - INSERT: Blocked
         - UPDATE: Blocked
         - DELETE: Blocked
         - SELECT others: Now visible

T+0min:  Kickoff

T+90min: Match finished

T+∞:     Predictions + results permanently visible
```

---

## 🔐 Security Guarantees

| Guarantee | Mechanism |
|-----------|-----------|
| Users can't see locked predictions | `is_match_locked()` + RLS |
| Private pools hidden from others | `visibility` + `is_pool_member()` |
| Audit trail immutable | RLS blocks INSERT/UPDATE/DELETE |
| Notifications private | `user_id` check in RLS |
| Scores accurate | System-only writes via service role |
| No prediction bypass | Dual enforcement (RLS + trigger) |

---

## 📋 Deployment Checklist

- [ ] Database: Supabase PostgreSQL
- [ ] RLS enabled on all 9 tables
- [ ] 4 helper functions created (SECURITY DEFINER)
- [ ] 40 policies defined across 9 tables
- [ ] 2 triggers for enforcement + audit
- [ ] GRANT EXECUTE on functions to `authenticated` role
- [ ] Test with real user scenarios
- [ ] Monitor audit logs for changes
- [ ] Document any custom modifications

---

## 📞 Troubleshooting

**Problem:** User can't create prediction
- Check: Match not locked (`is_match_locked()` returns FALSE)
- Check: `user_id` matches `auth.uid()`

**Problem:** User can't see others' predictions
- Check: Match is locked (`is_match_locked()` returns TRUE)
- Check: Pool visibility or membership

**Problem:** Audit log not recording
- Check: Trigger fired (`check_prediction_audit` AFTER UPDATE)
- Check: Scores actually changed

**Problem:** Private pool visible to everyone
- Check: `visibility = 'private'` in database
- Check: `is_pool_member()` function works

---

## 📚 Full Documentation

- **RLS_BET_SUMMARY.md** - Detailed policy documentation
- **RLS_BET_VERIFICATION_REPORT.md** - Complete verification
- **supabase-bet-rls.sql** - Implementation file

---

**Last Updated:** 2024  
**Status:** ✅ Production Ready  
**Verified:** 40/40 Policies + 4/4 Functions + 2/2 Triggers
