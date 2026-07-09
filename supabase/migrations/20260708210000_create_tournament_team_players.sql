CREATE TABLE IF NOT EXISTS tournament_team_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES tournament_teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tournament_team_players ENABLE ROW LEVEL SECURITY;

-- Captains can read players in their own teams
DROP POLICY IF EXISTS "Captain can read own team players" ON tournament_team_players;
CREATE POLICY "Captain can read own team players" ON tournament_team_players
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournament_teams t
      WHERE t.id = tournament_team_players.team_id
        AND t.captain_email = auth.email()
    )
  );

-- Public can read players in open tournaments
DROP POLICY IF EXISTS "Public can read players in open tournaments" ON tournament_team_players;
CREATE POLICY "Public can read players in open tournaments" ON tournament_team_players
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournament_teams t
      JOIN tournaments tour ON tour.id = t.tournament_id
      WHERE t.id = tournament_team_players.team_id
        AND tour.status = 'open'
    )
  );

-- Tournament owner can read players in own tournaments
DROP POLICY IF EXISTS "Owner can read players in own tournaments" ON tournament_team_players;
CREATE POLICY "Owner can read players in own tournaments" ON tournament_team_players
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournament_teams t
      JOIN tournaments tour ON tour.id = t.tournament_id
      WHERE t.id = tournament_team_players.team_id
        AND tour.owner_id = auth.uid()
    )
  );

-- Captains can insert/update/delete players in their own teams
DROP POLICY IF EXISTS "Captain can manage team players" ON tournament_team_players;
CREATE POLICY "Captain can manage team players" ON tournament_team_players
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tournament_teams t
      WHERE t.id = tournament_team_players.team_id
        AND t.captain_email = auth.email()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tournament_teams t
      WHERE t.id = tournament_team_players.team_id
        AND t.captain_email = auth.email()
    )
  );
