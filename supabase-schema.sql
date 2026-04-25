-- Create matches table
CREATE TABLE matches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  max_players INTEGER NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view matches" ON matches
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create matches" ON matches
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own matches" ON matches
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own matches" ON matches
  FOR DELETE USING (auth.uid() = created_by);

-- Create match_registrations table
CREATE TABLE match_registrations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_goalkeeper BOOLEAN NOT NULL DEFAULT FALSE,
  registered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

