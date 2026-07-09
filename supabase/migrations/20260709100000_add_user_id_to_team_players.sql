-- Add user_id column to tournament_team_players
ALTER TABLE tournament_team_players
  ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Authenticated users can insert themselves into a team
DROP POLICY IF EXISTS "Users can join a team" ON tournament_team_players;
CREATE POLICY "Users can join a team" ON tournament_team_players
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM tournament_teams t
      JOIN tournaments tour ON tour.id = t.tournament_id
      WHERE t.id = team_id
        AND tour.status = 'open'
    )
  );

-- Users can read their own player record
DROP POLICY IF EXISTS "Users can read own player record" ON tournament_team_players;
CREATE POLICY "Users can read own player record" ON tournament_team_players
  FOR SELECT
  USING (auth.uid() = user_id);
