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

CREATE UNIQUE INDEX IF NOT EXISTS idx_match_registrations_match_user_unique
ON match_registrations (match_id, user_id)
WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION register_for_match_public(
  p_match_id UUID,
  p_name TEXT,
  p_is_goalkeeper BOOLEAN,
  p_self_token TEXT
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
    self_unreg_token_hash
  )
  VALUES (
    p_match_id,
    auth.uid(),
    v_trimmed_name,
    p_is_goalkeeper,
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

GRANT EXECUTE ON FUNCTION register_for_match_public(UUID, TEXT, BOOLEAN, TEXT) TO anon, authenticated;

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
  v_field_players INTEGER;
  v_reserved_goalkeeper_slots INTEGER;
  v_max_field_players INTEGER;
  v_max_substitute_slots CONSTANT INTEGER := 10;
BEGIN
  SELECT m.max_players INTO v_max_players
  FROM get_public_match_by_id(NEW.match_id) AS m;

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

  -- Position restrictions only apply while filling titular slots.
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

