-- Fix pgcrypto digest resolution under SECURITY DEFINER functions.
-- PostgREST may surface this as 404/42883 when digest() is unresolved.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.register_for_match_public(
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
    self_unreg_token_hash
  )
  VALUES (
    p_match_id,
    auth.uid(),
    v_trimmed_name,
    p_is_goalkeeper,
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

GRANT EXECUTE ON FUNCTION public.register_for_match_public(UUID, TEXT, BOOLEAN, TEXT)
TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.unregister_self_from_match(
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

  DELETE FROM public.match_registrations r
  WHERE r.id = p_registration_id
    AND r.self_unreg_token_hash IS NOT NULL
    AND r.self_unreg_token_hash = encode(extensions.digest(p_self_token, 'sha256'), 'hex');

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unregister_self_from_match(UUID, TEXT)
TO anon, authenticated;
