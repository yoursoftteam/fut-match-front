-- Track authenticated user on registrations and prevent duplicate self-registration.
ALTER TABLE match_registrations
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_match_registrations_match_user_unique
ON match_registrations (match_id, user_id)
WHERE user_id IS NOT NULL;

DROP FUNCTION IF EXISTS register_for_match_public(UUID, TEXT, BOOLEAN, TEXT);

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
    encode(digest(p_self_token, 'sha256'), 'hex')
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
