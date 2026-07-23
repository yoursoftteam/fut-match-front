-- Drop the unique index on (match_id, user_id) to allow a single logged-in user
-- to register multiple players in the same match (e.g., parent registering kids,
-- or a captain registering the whole team).
--
-- The RPC register_for_match_public already has its own duplicate check
-- (IF auth.uid() ... AND EXISTS ... RAISE) to prevent accidental double
-- self-registration. For direct INSERTs, the frontend deduplicates by match_id
-- in the dashboard, so removing this index is safe.

DROP INDEX IF EXISTS idx_match_registrations_match_user_unique;
