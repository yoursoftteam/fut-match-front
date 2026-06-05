# Parti2 Bet Module - RLS Quick Reference

## 🎯 Quick Rules by Table

### Bet Pools
| Action | Who | Condition |
|--------|-----|-----------|
| **READ** | Anyone | visibility='public' |
| **READ** | Member | visibility='private' |
| **CREATE** | Owner | owner_id == auth.uid() |
| **MODIFY** | Owner | owner_id == auth.uid() |

### Predictions
| Action | Who | Condition |
|--------|-----|-----------|
| **READ OWN** | User | Always |
| **READ OTHERS** | Member | Only after match locked (kickoff - 10 min) |
| **CREATE/UPDATE** | User | NOT locked AND user_id == auth.uid() |
| **DELETE** | User | NOT locked AND user_id == auth.uid() |

### Scores
| Action | Who | Condition |
|--------|-----|-----------|
| **READ OWN** | User | Always |
| **READ PUBLIC** | Anyone | pool.visibility='public' |
| **READ PRIVATE** | Member | is_pool_member() |
| **WRITE** | System | User action blocked |

### Notifications
| Action | Who | Condition |
|--------|-----|-----------|
| **READ** | Owner | user_id == auth.uid() |
| **WRITE** | System | User action blocked |

### Audit Log
| Action | Who | Condition |
|--------|-----|-----------|
| **READ** | Owner | user_id == auth.uid() |
| **WRITE** | System | Trigger on prediction UPDATE |

---

## 🔐 Lock Time Logic

**Match Lock = kickoff - 10 minutes**

```
                    Lock Time    Kickoff
                        |          |
Timeline: -------|------|----------|------|--------
                        Now()  

✅ Can predict: NOW() <= Lock Time
❌ Cannot predict: NOW() > Lock Time

✅ Can see others' predictions: NOW() > Lock Time
❌ Cannot see others: NOW() <= Lock Time
```

---

## 💾 Helper Functions

### Check if user is pool member
```sql
SELECT is_pool_member('user-uuid', 'pool-uuid');
-- Returns TRUE if:
--   - user is pool owner, OR
--   - user has predictions in pool, OR
--   - user has scores in pool
```

### Check if match is locked
```sql
SELECT is_match_locked('match-uuid');
-- Returns TRUE if: NOW() > (kickoff - 10 min)
```

### Check if results are visible
```sql
SELECT can_see_match_results('match-uuid');
-- Returns TRUE if: NOW() > (kickoff - 10 min)
```

---

## 🚫 What Users CANNOT Do

```sql
-- ❌ Create tournament (admin only)
INSERT INTO bet_tournaments ...

-- ❌ Modify team data (admin only)
UPDATE bet_teams ...

-- ❌ Create match (admin only)
INSERT INTO bet_matches ...

-- ❌ Update another user's prediction
UPDATE bet_match_predictions WHERE user_id != auth.uid()

-- ❌ Predict on locked match
INSERT INTO bet_match_predictions ... -- if now() > match lock time

-- ❌ Insert/update scores
INSERT INTO bet_scores_aggregate ...
UPDATE bet_scores_aggregate ...

-- ❌ Read others' notifications
SELECT * FROM bet_notification_queue WHERE user_id != auth.uid()

-- ❌ Modify audit log
INSERT INTO bet_audit_log ...
UPDATE bet_audit_log ...
DELETE FROM bet_audit_log ...
```

---

## ✅ What Users CAN Do

```sql
-- ✅ Create a pool
INSERT INTO bet_pools (owner_id, name, visibility, ...) 
VALUES (auth.uid(), ...)

-- ✅ Read public pools
SELECT * FROM bet_pools WHERE visibility = 'public'

-- ✅ Read private pools they own/member of
SELECT * FROM bet_pools WHERE visibility = 'private'
-- if owner OR is_pool_member(auth.uid(), id)

-- ✅ Make a prediction (if not locked)
INSERT INTO bet_match_predictions (user_id, match_id, ...)
VALUES (auth.uid(), ...) -- if now() <= match lock time

-- ✅ Update their own prediction (if not locked)
UPDATE bet_match_predictions WHERE user_id = auth.uid()

-- ✅ Read their own scores
SELECT * FROM bet_scores_aggregate WHERE user_id = auth.uid()

-- ✅ Read other scores in public pool
SELECT * FROM bet_scores_aggregate 
WHERE pool_id = 'public-pool' AND visibility = 'public'

-- ✅ Read their own notifications
SELECT * FROM bet_notification_queue WHERE user_id = auth.uid()

-- ✅ Read their own audit log
SELECT * FROM bet_audit_log WHERE user_id = auth.uid()
```

---

## 🔧 Backend Operations (Service Role)

Service role (via backend/API with service key) can:

```sql
-- ✅ Create/update tournaments and matches
INSERT INTO bet_tournaments ...
UPDATE bet_matches ...

-- ✅ Create/update scores (scoring engine)
INSERT INTO bet_scores_aggregate ...
UPDATE bet_scores_aggregate ...

-- ✅ Create notifications
INSERT INTO bet_notification_queue ...
UPDATE bet_notification_queue SET sent_at = NOW()

-- ✅ Bypass RLS (with proper caution)
-- Service role is not bound by RLS policies
```

---

## 🐛 Common Errors & Solutions

### "Permission denied for schema public"
```
Cause: RLS policy blocked your query
Check: Are you authenticated? Do you have permission?
```

### "Cannot update prediction after match lock time"
```
Cause: Trigger rejected UPDATE on locked match
Check: Is match within 10 min of kickoff? Try again after window closes.
```

### "Violates row-level security policy"
```
Cause: Policy WITH CHECK failed on INSERT/UPDATE
Check: Are your values correct? (e.g., user_id must equal auth.uid())
```

### "Did not find any rows"
```
Cause: SELECT succeeded but RLS filtered all rows
Check: Do you have permission to see this data?
```

---

## 📍 Function Locations

All functions are defined in `supabase-bet-rls.sql`:

| Function | Line | Purpose |
|----------|------|---------|
| `is_pool_member()` | ~30 | Check pool membership |
| `is_match_locked()` | ~55 | Check prediction lock |
| `can_see_match_results()` | ~75 | Check result visibility |
| `check_prediction_lock()` | ~446 | Trigger: enforce lock on UPDATE |
| `log_prediction_audit()` | ~468 | Trigger: log changes |

---

## 📞 Support

For questions about RLS:
1. Check `RLS_SUMMARY.md` for detailed policy docs
2. Check `RLS_DEPLOYMENT_GUIDE.md` for troubleshooting
3. Read PostgreSQL RLS docs: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
4. Supabase RLS guide: https://supabase.com/docs/guides/auth/row-level-security

