-- Allow tournament team captains to read their own teams by email,
-- regardless of tournament status (open/in_progress/finished).
-- Previously only tournament owners or public (open tournaments) could read teams.
DROP POLICY IF EXISTS "Captains can read own teams" ON tournament_teams;
CREATE POLICY "Captains can read own teams" ON tournament_teams
  FOR SELECT
  USING (captain_email = auth.email());
