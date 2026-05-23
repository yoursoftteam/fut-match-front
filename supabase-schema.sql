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
  source_template_id UUID REFERENCES match_templates(id) ON DELETE SET NULL
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
  name TEXT NOT NULL,
  is_goalkeeper BOOLEAN NOT NULL DEFAULT FALSE,
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

CREATE POLICY "Anyone can unregister from matches" ON match_registrations
  FOR DELETE USING (true);

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

-- Enforce registration rules at DB level:
-- 1) max 2 goalkeepers (for titular slots only)
-- 2) always reserve 2 slots for goalkeepers (for titular slots only)
-- 3) allow up to max_players + 5 substitute slots (no position restrictions for substitutes)
CREATE OR REPLACE FUNCTION validate_match_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_max_players INTEGER;
  v_total INTEGER;
  v_goalkeepers INTEGER;
  v_field_players INTEGER;
  v_reserved_goalkeeper_slots INTEGER;
  v_max_field_players INTEGER;
  v_max_substitute_slots CONSTANT INTEGER := 5;
BEGIN
  SELECT max_players INTO v_max_players
  FROM matches
  WHERE id = NEW.match_id;

  IF v_max_players IS NULL THEN
    RAISE EXCEPTION 'Partido no encontrado.';
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_goalkeeper),
    COUNT(*) FILTER (WHERE NOT is_goalkeeper)
  INTO v_total, v_goalkeepers, v_field_players
  FROM match_registrations
  WHERE match_id = NEW.match_id;

  -- Hard cap: titular slots + substitute slots
  IF v_total >= v_max_players + v_max_substitute_slots THEN
    RAISE EXCEPTION 'No hay cupos disponibles, ni siquiera como suplente.';
  END IF;

  -- Position restrictions only apply while filling titular slots
  IF v_total < v_max_players THEN
    v_reserved_goalkeeper_slots := LEAST(2, v_max_players);
    v_max_field_players := GREATEST(0, v_max_players - v_reserved_goalkeeper_slots);

    IF NEW.is_goalkeeper THEN
      IF v_goalkeepers >= v_reserved_goalkeeper_slots THEN
        RAISE EXCEPTION 'Ya se completaron los cupos de arqueros (máximo 2).';
      END IF;
    ELSE
      IF v_field_players >= v_max_field_players THEN
        RAISE EXCEPTION 'Los cupos de jugadores de campo están completos. Se reservan 2 cupos para arqueros.';
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

