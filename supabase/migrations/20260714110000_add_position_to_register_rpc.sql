-- Add position parameter to register_for_match_public RPC
-- The function was created before the position column existed; this update
-- makes the registration atomic (avoids a separate client-side UPDATE).

-- Drop old version without position parameter (Postgres function overloading would
-- leave both variants; we only want the one with position support).
DROP FUNCTION IF EXISTS public.register_for_match_public(
  p_match_id UUID,
  p_name TEXT,
  p_is_goalkeeper BOOLEAN,
  p_self_token TEXT
);

CREATE OR REPLACE FUNCTION public.register_for_match_public(
  p_match_id UUID,
  p_name TEXT,
  p_is_goalkeeper BOOLEAN,
  p_position TEXT DEFAULT NULL,
  p_self_token TEXT DEFAULT NULL
)
RETURNS TABLE(
  id UUID,
  name TEXT,
  is_goalkeeper BOOLEAN,
  registered_at TIMESTAMPTZ,
  has_paid BOOLEAN,
  paid_at TIMESTAMPTZ,
  paid_by UUID,
  user_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
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
    FROM public.match_registrations r
    WHERE r.match_id = p_match_id
      AND r.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Ya estas inscrito en este partido';
  END IF;
  INSERT INTO public.match_registrations (
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
  RETURNING public.match_registrations.id INTO v_registration_id;
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
  FROM public.match_registrations r
  WHERE r.id = v_registration_id;
END;
$$;
