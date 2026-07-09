DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_team_players') THEN
    ALTER TABLE tournament_team_players ADD COLUMN shirt_number integer;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_team_players_shirt_number
      ON tournament_team_players (team_id, shirt_number)
      WHERE shirt_number IS NOT NULL;
  END IF;
END $$;
