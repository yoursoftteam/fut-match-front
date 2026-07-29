-- Create matches table
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_players INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  field_cost NUMERIC NOT NULL DEFAULT 0,
  rental_cost NUMERIC NOT NULL DEFAULT 0,
  has_rented_goalkeepers BOOLEAN NOT NULL DEFAULT FALSE,
  rented_goalkeepers_count INTEGER NOT NULL DEFAULT 0,
  players_per_team INTEGER NOT NULL DEFAULT 5,
  source_template_id UUID REFERENCES match_templates(id) ON DELETE SET NULL,
  rules TEXT
);

-- Enable Row Level Security
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own matches" ON matches
  FOR SELECT USING (auth.uid() = created_by);

CREATE POLICY "Authenticated users can create matches" ON matches
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own matches" ON matches
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own matches" ON matches
  FOR DELETE USING (auth.uid() = created_by);

-- Public read for shared links without exposing list endpoints.
-- This function can be called by anon/authenticated users to fetch only one match by id.
CREATE OR REPLACE FUNCTION get_public_match_by_id(p_match_id UUID)
RETURNS TABLE (
  id UUID,
  title TEXT,
  location TEXT,
  date TIMESTAMP WITH TIME ZONE,
  max_players INTEGER,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE,
  field_cost NUMERIC,
  rental_cost NUMERIC,
  has_rented_goalkeepers BOOLEAN,
  rented_goalkeepers_count INTEGER,
  players_per_team INTEGER,
  source_template_id UUID
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    m.id,
    m.title,
    m.location,
    m.date,
    m.max_players,
    m.created_by,
    m.created_at,
    m.field_cost,
    m.rental_cost,
    m.has_rented_goalkeepers,
    m.rented_goalkeepers_count,
    m.players_per_team,
    m.source_template_id
  FROM matches m
  WHERE m.id = p_match_id
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION get_public_match_by_id(UUID) TO anon, authenticated;

CREATE INDEX IF NOT EXISTS idx_matches_source_template_id ON matches (source_template_id);

-- Create match_registrations table
CREATE TABLE match_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  is_goalkeeper BOOLEAN NOT NULL DEFAULT FALSE,
  self_unreg_token_hash TEXT,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  has_paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMP WITH TIME ZONE NULL,
  paid_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE match_registrations ENABLE ROW LEVEL SECURITY;

-- Create policies for match_registrations
CREATE POLICY "Anyone can view match registrations" ON match_registrations
  FOR SELECT USING (true);

CREATE POLICY "Anyone can register for matches" ON match_registrations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Any registered player or match owner can delete" ON match_registrations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.match_registrations r2
      WHERE r2.match_id = match_id
        AND r2.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE id = match_id AND created_by = auth.uid()
    )
  );

-- Only match creator can update payment status
CREATE POLICY "Only match owner can update payments" ON match_registrations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM matches m
      WHERE m.id = match_registrations.match_id
        AND m.created_by = auth.uid()
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_match_registrations_match_user_unique
ON match_registrations (match_id, user_id)
WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION register_for_match_public(
  p_match_id UUID,
  p_name TEXT,
  p_is_goalkeeper BOOLEAN,
  p_position TEXT DEFAULT NULL,
  p_self_token TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  is_goalkeeper BOOLEAN,
  registered_at TIMESTAMP WITH TIME ZONE,
  has_paid BOOLEAN,
  paid_at TIMESTAMP WITH TIME ZONE,
  paid_by UUID,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_registration_id UUID;
  v_trimmed_name TEXT;
BEGIN
  v_trimmed_name := btrim(p_name);

  IF char_length(v_trimmed_name) < 2 THEN
    RAISE EXCEPTION 'El nombre debe tener al menos 2 caracteres.';
  END IF;

  IF char_length(v_trimmed_name) > 100 THEN
    RAISE EXCEPTION 'El nombre no puede superar los 100 caracteres.';
  END IF;

  IF p_self_token IS NULL OR char_length(btrim(p_self_token)) < 10 THEN
    RAISE EXCEPTION 'Token de auto-baja inválido.';
  END IF;

  IF auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1
    FROM match_registrations r
    WHERE r.match_id = p_match_id
      AND r.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Ya estas inscrito en este partido';
  END IF;

  INSERT INTO match_registrations (
    match_id,
    user_id,
    name,
    is_goalkeeper,
    position,
    self_unreg_token_hash
  )
  VALUES (
    p_match_id,
    auth.uid(),
    v_trimmed_name,
    p_is_goalkeeper,
    CASE WHEN p_position IS NOT NULL AND p_position != '' THEN btrim(p_position) ELSE NULL END,
    encode(extensions.digest(p_self_token, 'sha256'), 'hex')
  )
  RETURNING match_registrations.id INTO v_registration_id;

  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.is_goalkeeper,
    r.registered_at,
    r.has_paid,
    r.paid_at,
    r.paid_by,
    r.user_id
  FROM match_registrations r
  WHERE r.id = v_registration_id;
END;
$$;

GRANT EXECUTE ON FUNCTION register_for_match_public(UUID, TEXT, BOOLEAN, TEXT, TEXT) TO anon, authenticated;

CREATE OR REPLACE FUNCTION unregister_self_from_match(
  p_registration_id UUID,
  p_self_token TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  IF p_self_token IS NULL OR char_length(btrim(p_self_token)) < 10 THEN
    RETURN FALSE;
  END IF;

  DELETE FROM match_registrations r
  WHERE r.id = p_registration_id
    AND r.self_unreg_token_hash IS NOT NULL
    AND r.self_unreg_token_hash = encode(extensions.digest(p_self_token, 'sha256'), 'hex');

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION unregister_self_from_match(UUID, TEXT) TO anon, authenticated;

-- Enforce registration rules at DB level:
-- 1) max 2 goalkeepers (for titular slots only)
-- 2) reserve 2 titular slots for goalkeepers while titulars are being filled
-- 3) allow up to max_players + 10 substitute slots (no position restrictions for substitutes)
CREATE OR REPLACE FUNCTION validate_match_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_players INTEGER;
  v_total INTEGER;
  v_goalkeepers INTEGER;
  v_reserved_goalkeeper_slots INTEGER;
  v_max_substitute_slots CONSTANT INTEGER := 10;
BEGIN
  SELECT m.max_players INTO v_max_players
  FROM get_public_match_by_id(NEW.match_id) AS m;

  IF v_max_players IS NULL THEN
    RAISE EXCEPTION 'Partido no encontrado.';
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_goalkeeper)
  INTO v_total, v_goalkeepers
  FROM match_registrations
  WHERE match_id = NEW.match_id;

  -- Hard cap: titular slots + substitute slots
  IF v_total >= v_max_players + v_max_substitute_slots THEN
    RAISE EXCEPTION 'No hay cupos disponibles, ni siquiera como suplente.';
  END IF;

  -- Position restrictions only while filling titular slots.
  IF v_total < v_max_players THEN
    v_reserved_goalkeeper_slots := LEAST(2, v_max_players);

    IF NEW.is_goalkeeper THEN
      IF v_goalkeepers >= v_reserved_goalkeeper_slots THEN
        RAISE EXCEPTION 'Ya se completaron los cupos de arqueros (máximo 2).';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_match_registration ON match_registrations;

CREATE TRIGGER trg_validate_match_registration
BEFORE INSERT ON match_registrations
FOR EACH ROW
EXECUTE FUNCTION validate_match_registration();

-- Sync is_goalkeeper when position changes via UPDATE, and enforce
-- goalkeeper slot limits on UPDATE (not just INSERT).
CREATE OR REPLACE FUNCTION sync_is_goalkeeper_on_position_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_players INTEGER;
  v_total INTEGER;
  v_goalkeepers INTEGER;
  v_reserved_goalkeeper_slots INTEGER;
  v_max_substitute_slots CONSTANT INTEGER := 10;
BEGIN
  -- Auto-sync is_goalkeeper with the new position
  NEW.is_goalkeeper := (NEW.position = 'portero');

  SELECT m.max_players INTO v_max_players
  FROM get_public_match_by_id(NEW.match_id) AS m;

  IF v_max_players IS NULL THEN
    RAISE EXCEPTION 'Partido no encontrado.';
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_goalkeeper)
  INTO v_total, v_goalkeepers
  FROM match_registrations
  WHERE match_id = NEW.match_id;

  IF v_total > v_max_players + v_max_substitute_slots THEN
    RAISE EXCEPTION 'No hay cupos disponibles, ni siquiera como suplente.';
  END IF;

  -- Enforce goalkeeper limit: adjust count for this row's change
  IF v_total <= v_max_players AND NEW.is_goalkeeper THEN
    v_reserved_goalkeeper_slots := LEAST(2, v_max_players);

    IF (v_goalkeepers - OLD.is_goalkeeper::int + NEW.is_goalkeeper::int) > v_reserved_goalkeeper_slots THEN
      RAISE EXCEPTION 'Ya se completaron los cupos de arqueros (máximo 2).';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_is_goalkeeper_on_position_update ON match_registrations;

CREATE TRIGGER trg_sync_is_goalkeeper_on_position_update
BEFORE UPDATE OF position ON match_registrations
FOR EACH ROW
WHEN (OLD.position IS DISTINCT FROM NEW.position)
EXECUTE FUNCTION sync_is_goalkeeper_on_position_update();

-- Automatic push notification dispatch to Cloudflare when a player registers.
CREATE EXTENSION IF NOT EXISTS pg_net;
CREATE EXTENSION IF NOT EXISTS vault;

CREATE OR REPLACE FUNCTION notify_registration_cloudflare()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_webhook_url TEXT := NULLIF(current_setting('app.settings.cloudflare_push_webhook_url', true), '');
  v_webhook_secret_name TEXT := COALESCE(
    NULLIF(current_setting('app.settings.cloudflare_push_webhook_secret_name', true), ''),
    'cloudflare_push_webhook_secret'
  );
  v_webhook_secret TEXT;
  v_match RECORD;
  v_headers JSONB;
  v_payload JSONB;
BEGIN
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF NEW.name ILIKE 'Arquero Alquilado%' THEN
    RETURN NEW;
  END IF;

  IF v_webhook_url IS NULL THEN
    RETURN NEW;
  END IF;

  IF v_webhook_url !~ '^https://' THEN
    RAISE LOG 'notify_registration_cloudflare skipped non-https webhook url';
    RETURN NEW;
  END IF;

  SELECT ds.decrypted_secret
  INTO v_webhook_secret
  FROM vault.decrypted_secrets ds
  WHERE ds.name = v_webhook_secret_name
  ORDER BY ds.created_at DESC
  LIMIT 1;

  SELECT
    m.id,
    m.title,
    m.location,
    m.date,
    m.created_by
  INTO v_match
  FROM matches m
  WHERE m.id = NEW.match_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_headers := jsonb_build_object('Content-Type', 'application/json');

  IF v_webhook_secret IS NOT NULL THEN
    v_headers := v_headers || jsonb_build_object('x-parti2-webhook-secret', v_webhook_secret);
  END IF;

  v_payload := jsonb_build_object(
    'event', 'match_registration_created',
    'registration', jsonb_build_object(
      'id', NEW.id,
      'match_id', NEW.match_id,
      'user_id', NEW.user_id,
      'name', NEW.name,
      'is_goalkeeper', NEW.is_goalkeeper,
      'registered_at', NEW.registered_at
    ),
    'match', jsonb_build_object(
      'id', v_match.id,
      'title', v_match.title,
      'location', v_match.location,
      'date', v_match.date,
      'created_by', v_match.created_by
    )
  );

  PERFORM net.http_post(
    url := v_webhook_url,
    headers := v_headers,
    body := v_payload
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_registration_cloudflare failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_registration_cloudflare ON match_registrations;

CREATE TRIGGER trg_notify_registration_cloudflare
AFTER INSERT ON match_registrations
FOR EACH ROW
EXECUTE FUNCTION notify_registration_cloudflare();

DROP TABLE IF EXISTS app_runtime_config;

-- Realtime: include table in publication for postgres_changes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'match_registrations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.match_registrations;
  END IF;
END
$$;

-- Recommended so DELETE/UPDATE payloads include previous row values
ALTER TABLE match_registrations REPLICA IDENTITY FULL;

-- ============================================================
-- PARTIDOS FRECUENTES (plantillas)
-- ============================================================

CREATE TABLE match_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  time TEXT NOT NULL DEFAULT '',
  players_per_team INTEGER NOT NULL DEFAULT 6,
  has_rented_goalkeepers BOOLEAN NOT NULL DEFAULT FALSE,
  rented_goalkeepers_count INTEGER NOT NULL DEFAULT 0,
  field_cost NUMERIC NOT NULL DEFAULT 0,
  rental_cost NUMERIC NOT NULL DEFAULT 0,
  save_participants BOOLEAN NOT NULL DEFAULT FALSE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,
  match_id UUID REFERENCES matches(id),
  match_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE match_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates" ON match_templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own templates" ON match_templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON match_templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON match_templates
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_match_templates_user_id ON match_templates (user_id);
CREATE INDEX idx_match_templates_match_id ON match_templates (match_id);

CREATE TABLE match_template_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID REFERENCES match_templates(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  is_goalkeeper BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE match_template_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own template participants" ON match_template_participants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM match_templates WHERE id = template_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can create own template participants" ON match_template_participants
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM match_templates WHERE id = template_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can update own template participants" ON match_template_participants
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM match_templates WHERE id = template_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can delete own template participants" ON match_template_participants
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM match_templates WHERE id = template_id AND user_id = auth.uid())
  );

CREATE INDEX idx_mtp_template_id ON match_template_participants (template_id);

-- ============================================================
-- TORNEOS (Fase 1 & 2)
-- ============================================================

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

DROP POLICY IF EXISTS "Public can register team in open tournaments" ON tournament_teams;
CREATE POLICY "Public can register team in open tournaments" ON tournament_teams
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_teams.tournament_id
        AND t.status = 'open'
    )
  );

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

DROP POLICY IF EXISTS "Captains can read own teams" ON tournament_teams;
CREATE POLICY "Captains can read own teams" ON tournament_teams
  FOR SELECT
  USING (captain_email = auth.email());

DROP POLICY IF EXISTS "Owner can read tournament matches" ON tournament_matches;
CREATE POLICY "Owner can read tournament matches" ON tournament_matches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_matches.tournament_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Public can read matches of visible tournaments" ON tournament_matches;
CREATE POLICY "Public can read matches of visible tournaments" ON tournament_matches
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_matches.tournament_id
        AND t.status IN ('open', 'in_progress', 'finished')
    )
  );

DROP POLICY IF EXISTS "Owner can create tournament matches" ON tournament_matches;
CREATE POLICY "Owner can create tournament matches" ON tournament_matches
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_matches.tournament_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owner can update tournament matches" ON tournament_matches;
CREATE POLICY "Owner can update tournament matches" ON tournament_matches
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_matches.tournament_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owner can delete tournament matches" ON tournament_matches;
CREATE POLICY "Owner can delete tournament matches" ON tournament_matches
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
CREATE POLICY "Owner can read payments in own tournaments" ON tournament_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_payments.tournament_id
        AND t.owner_id = auth.uid()
    )
  );

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

DROP POLICY IF EXISTS "Owner can update payments in own tournaments" ON tournament_payments;
CREATE POLICY "Owner can update payments in own tournaments" ON tournament_payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_payments.tournament_id
        AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Owner can delete payments in own tournaments" ON tournament_payments;
CREATE POLICY "Owner can delete payments in own tournaments" ON tournament_payments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM tournaments t
      WHERE t.id = tournament_payments.tournament_id
        AND t.owner_id = auth.uid()
    )
  );

-- Tournament team players
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_team_players_shirt_number
  ON tournament_team_players (team_id, shirt_number)
  WHERE shirt_number IS NOT NULL;

ALTER TABLE tournament_team_players ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Public can read players in open tournaments" ON tournament_team_players;
CREATE POLICY "Public can read players in open tournaments" ON tournament_team_players
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tournament_teams t
      JOIN tournaments tour ON tour.id = t.tournament_id
      WHERE t.id = tournament_team_players.team_id
        AND t.captain_email = auth.email()
    )
  );

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

DROP POLICY IF EXISTS "Users can read own player record" ON tournament_team_players;
CREATE POLICY "Users can read own player record" ON tournament_team_players
  FOR SELECT
  USING (auth.uid() = user_id);

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

