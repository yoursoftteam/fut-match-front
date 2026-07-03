CREATE TABLE IF NOT EXISTS tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  description TEXT,
  registration_fee NUMERIC NOT NULL DEFAULT 0,
  tournament_type TEXT NOT NULL CHECK (tournament_type IN ('league', 'groups')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'in_progress', 'finished')),
  max_teams INTEGER NOT NULL CHECK (max_teams > 1),
  min_players_per_team INTEGER NOT NULL CHECK (min_players_per_team > 0),
  starts_at TIMESTAMP WITH TIME ZONE,
  registration_deadline TIMESTAMP WITH TIME ZONE,
  rules_text TEXT,
  rules_pdf_url TEXT,
  league_mode TEXT CHECK (league_mode IN ('single_leg', 'home_away')),
  groups_count INTEGER,
  qualifiers_per_group INTEGER,
  has_knockout BOOLEAN,
  knockout_phase TEXT CHECK (knockout_phase IN ('round_of_16', 'quarterfinals', 'semifinals', 'final')),
  scheduled_days JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS league_mode TEXT CHECK (league_mode IN ('single_leg', 'home_away')),
  ADD COLUMN IF NOT EXISTS groups_count INTEGER,
  ADD COLUMN IF NOT EXISTS qualifiers_per_group INTEGER,
  ADD COLUMN IF NOT EXISTS has_knockout BOOLEAN,
  ADD COLUMN IF NOT EXISTS knockout_phase TEXT CHECK (knockout_phase IN ('round_of_16', 'quarterfinals', 'semifinals', 'final')),
  ADD COLUMN IF NOT EXISTS scheduled_days JSONB,
  ADD COLUMN IF NOT EXISTS registration_deadline TIMESTAMP WITH TIME ZONE;

CREATE TABLE IF NOT EXISTS tournament_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  logo_url TEXT,
  captain_name TEXT NOT NULL,
  captain_phone TEXT,
  captain_email TEXT,
  kit_colors TEXT,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  home_team_id UUID REFERENCES tournament_teams(id) ON DELETE SET NULL,
  away_team_id UUID REFERENCES tournament_teams(id) ON DELETE SET NULL,
  home_goals INTEGER,
  away_goals INTEGER,
  starts_at TIMESTAMP WITH TIME ZONE,
  match_status TEXT NOT NULL DEFAULT 'pending' CHECK (match_status IN ('pending', 'played', 'live')),
  phase_label TEXT,
  round_number INTEGER,
  group_label TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CHECK (home_team_id IS NULL OR away_team_id IS NULL OR home_team_id <> away_team_id)
);

CREATE TABLE IF NOT EXISTS tournament_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES tournament_teams(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0 CHECK (amount >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  provider_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (tournament_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_tournaments_owner_id ON tournaments (owner_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON tournaments (status);
CREATE INDEX IF NOT EXISTS idx_tournaments_starts_at ON tournaments (starts_at);

CREATE INDEX IF NOT EXISTS idx_tournament_teams_tournament_id ON tournament_teams (tournament_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_teams_unique_name_per_tournament
  ON tournament_teams (tournament_id, lower(name));

CREATE INDEX IF NOT EXISTS idx_tournament_matches_tournament_id ON tournament_matches (tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_matches_starts_at ON tournament_matches (starts_at);

CREATE INDEX IF NOT EXISTS idx_tournament_payments_tournament_id ON tournament_payments (tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_payments_team_id ON tournament_payments (team_id);
CREATE INDEX IF NOT EXISTS idx_tournament_payments_status ON tournament_payments (status);

CREATE OR REPLACE FUNCTION set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tournaments_set_updated_at ON tournaments;
CREATE TRIGGER trg_tournaments_set_updated_at
BEFORE UPDATE ON tournaments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_tournament_payments_set_updated_at ON tournament_payments;
CREATE TRIGGER trg_tournament_payments_set_updated_at
BEFORE UPDATE ON tournament_payments
FOR EACH ROW
EXECUTE FUNCTION set_updated_at_timestamp();

CREATE OR REPLACE FUNCTION validate_tournament_team_capacity()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_status TEXT;
  v_max_teams INTEGER;
  v_current_teams INTEGER;
BEGIN
  SELECT status, max_teams
  INTO v_status, v_max_teams
  FROM tournaments
  WHERE id = NEW.tournament_id;

  IF v_status IS NULL THEN
    RAISE EXCEPTION 'Torneo no encontrado.';
  END IF;

  IF v_status <> 'open' THEN
    RAISE EXCEPTION 'El torneo no está abierto para inscripciones.';
  END IF;

  SELECT COUNT(*)
  INTO v_current_teams
  FROM tournament_teams
  WHERE tournament_id = NEW.tournament_id;

  IF v_current_teams >= v_max_teams THEN
    RAISE EXCEPTION 'No hay cupos disponibles para este torneo.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_tournament_team_capacity ON tournament_teams;
CREATE TRIGGER trg_validate_tournament_team_capacity
BEFORE INSERT ON tournament_teams
FOR EACH ROW
EXECUTE FUNCTION validate_tournament_team_capacity();

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner can read own tournaments" ON tournaments;
CREATE POLICY "Owner can read own tournaments" ON tournaments
  FOR SELECT
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Public can read open tournaments" ON tournaments;
CREATE POLICY "Public can read open tournaments" ON tournaments
  FOR SELECT
  USING (status = 'open');

DROP POLICY IF EXISTS "Owner can create tournaments" ON tournaments;
CREATE POLICY "Owner can create tournaments" ON tournaments
  FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owner can update tournaments" ON tournaments;
CREATE POLICY "Owner can update tournaments" ON tournaments
  FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owner can delete tournaments" ON tournaments;
CREATE POLICY "Owner can delete tournaments" ON tournaments
  FOR DELETE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owner can read teams in own tournaments" ON tournament_teams;
CREATE POLICY "Owner can read teams in own tournaments" ON tournament_teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_teams.tournament_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public can read teams in open tournaments" ON tournament_teams;
CREATE POLICY "Public can read teams in open tournaments" ON tournament_teams
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_teams.tournament_id
        AND t.status = 'open'
    )
  );

DROP POLICY IF EXISTS "Anyone can insert teams" ON tournament_teams;
CREATE POLICY "Anyone can insert teams" ON tournament_teams
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Owner can update teams in own tournaments" ON tournament_teams;
CREATE POLICY "Owner can update teams in own tournaments" ON tournament_teams
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_teams.tournament_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owner can delete teams in own tournaments" ON tournament_teams;
CREATE POLICY "Owner can delete teams in own tournaments" ON tournament_teams
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_teams.tournament_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owner can read matches in own tournaments" ON tournament_matches;
CREATE POLICY "Owner can read matches in own tournaments" ON tournament_matches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_matches.tournament_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public can read matches in open tournaments" ON tournament_matches;
CREATE POLICY "Public can read matches in open tournaments" ON tournament_matches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_matches.tournament_id
        AND t.status = 'open'
    )
  );

DROP POLICY IF EXISTS "Owner can insert matches" ON tournament_matches;
CREATE POLICY "Owner can insert matches" ON tournament_matches
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_matches.tournament_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owner can update matches" ON tournament_matches;
CREATE POLICY "Owner can update matches" ON tournament_matches
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_matches.tournament_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owner can delete matches" ON tournament_matches;
CREATE POLICY "Owner can delete matches" ON tournament_matches
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_matches.tournament_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owner can read payments in own tournaments" ON tournament_payments;
DROP POLICY IF EXISTS "Public can read payments in open tournaments" ON tournament_payments;
CREATE POLICY "Public can read payments in open tournaments" ON tournament_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_payments.tournament_id
        AND t.status = 'open'
    )
  );

DROP POLICY IF EXISTS "Owner can insert payments" ON tournament_payments;
DROP POLICY IF EXISTS "Public can create payments for open tournaments" ON tournament_payments;
CREATE POLICY "Public can create payments for open tournaments" ON tournament_payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_payments.tournament_id
        AND t.status = 'open'
    )
    AND EXISTS (
      SELECT 1
      FROM tournament_teams tt
      WHERE tt.id = tournament_payments.team_id
        AND tt.tournament_id = tournament_payments.tournament_id
    )
  );

DROP POLICY IF EXISTS "Owner can update payments" ON tournament_payments;
CREATE POLICY "Owner can update payments" ON tournament_payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_payments.tournament_id
        AND t.owner_id = auth.uid()
    )
  );
