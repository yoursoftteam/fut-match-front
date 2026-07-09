-- Ensure all tournament tables exist (idempotent — safe to run even if already present)

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

CREATE TABLE IF NOT EXISTS tournament_team_players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES tournament_teams(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  document_type TEXT,
  document_number TEXT,
  blood_type TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  shirt_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DO $$ BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_team_players') THEN
    ALTER TABLE tournament_team_players ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
    ALTER TABLE tournament_team_players ADD COLUMN IF NOT EXISTS document_type TEXT;
    ALTER TABLE tournament_team_players ADD COLUMN IF NOT EXISTS document_number TEXT;
    ALTER TABLE tournament_team_players ADD COLUMN IF NOT EXISTS blood_type TEXT;
    ALTER TABLE tournament_team_players ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT;
    ALTER TABLE tournament_team_players ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;
    ALTER TABLE tournament_team_players ADD COLUMN IF NOT EXISTS shirt_number INTEGER;
  END IF;
END $$;

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

-- Indexes
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

-- RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_team_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_payments ENABLE ROW LEVEL SECURITY;

-- Function + trigger for updated_at
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
