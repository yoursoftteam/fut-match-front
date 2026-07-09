-- Remove the recursive policy that caused infinite recursion:
-- "Participants can read their tournaments" on tournaments queries tournament_teams,
-- which has "Public can read teams in open tournaments" that queries tournaments back.
DROP POLICY IF EXISTS "Participants can read their tournaments" ON tournaments;
