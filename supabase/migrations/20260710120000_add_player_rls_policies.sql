DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_teams') THEN
    EXECUTE format('
      CREATE POLICY "Players can read their team" ON tournament_teams
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM tournament_team_players p
            WHERE p.team_id = tournament_teams.id
              AND p.user_id = auth.uid()
          )
        )
    ');
  END IF;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournaments') THEN
    EXECUTE format('
      CREATE POLICY "Participants can read their tournaments" ON tournaments
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM tournament_teams t
            JOIN tournament_team_players p ON p.team_id = t.id
            WHERE t.tournament_id = tournaments.id
              AND p.user_id = auth.uid()
          )
        )
    ');
  END IF;
END;
$$;