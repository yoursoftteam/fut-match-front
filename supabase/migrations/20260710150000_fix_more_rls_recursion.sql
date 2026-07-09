-- Remove "Players can read their team" which causes recursion with
-- existing policies on tournament_team_players that reference tournament_teams back.
DROP POLICY IF EXISTS "Players can read their team" ON tournament_teams;
