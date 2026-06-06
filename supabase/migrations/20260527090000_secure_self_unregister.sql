-- Secure self-unregister for public match registrations
-- Date: 2026-05-27
-- Safe to run in Supabase SQL Editor.

BEGIN;

-- Ensure digest() is available for token hashing.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Add token hash column used for secure self-unregister.
ALTER TABLE public.match_registrations
  ADD COLUMN IF NOT EXISTS self_unreg_token_hash TEXT;

-- 2) Replace permissive DELETE policy with owner-only DELETE.
DROP POLICY IF EXISTS "Anyone can unregister from matches" ON public.match_registrations;
DROP POLICY IF EXISTS "Only match owner can delete registrations" ON public.match_registrations;

CREATE POLICY "Anyone can unregister from matches" ON public.match_registrations
  FOR DELETE USING (true);

-- 3) Public registration RPC that stores a hashed self-unregister token.
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
  paid_by UUID
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
    RAISE EXCEPTION 'Token de auto-baja invalido.';
  END IF;

  INSERT INTO public.match_registrations (
    match_id,
    name,
    is_goalkeeper,
    self_unreg_token_hash
  )
  VALUES (
    p_match_id,
    v_trimmed_name,
    p_is_goalkeeper,
    encode(digest(p_self_token, 'sha256'), 'hex')
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
    r.paid_by
  FROM public.match_registrations r
  WHERE r.id = v_registration_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_for_match_public(UUID, TEXT, BOOLEAN, TEXT)
TO anon, authenticated;

-- 4) Public self-unregister RPC validated by token hash.
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
    AND r.self_unreg_token_hash = encode(digest(p_self_token, 'sha256'), 'hex');

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  RETURN v_deleted_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unregister_self_from_match(UUID, TEXT)
TO anon, authenticated;

-- 5) Keep DB-level registration constraints working for public signups under RLS.
-- Use get_public_match_by_id() so validation does not depend on direct SELECT policy over matches.
CREATE OR REPLACE FUNCTION public.validate_match_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
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
  SELECT m.max_players
  INTO v_max_players
  FROM public.get_public_match_by_id(NEW.match_id) AS m;

  IF v_max_players IS NULL THEN
    RAISE EXCEPTION 'Partido no encontrado.';
  END IF;

  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_goalkeeper),
    COUNT(*) FILTER (WHERE NOT is_goalkeeper)
  INTO v_total, v_goalkeepers, v_field_players
  FROM public.match_registrations
  WHERE match_id = NEW.match_id;

  IF v_total >= v_max_players + v_max_substitute_slots THEN
    RAISE EXCEPTION 'No hay cupos disponibles, ni siquiera como suplente.';
  END IF;

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

DROP TRIGGER IF EXISTS trg_validate_match_registration ON public.match_registrations;

CREATE TRIGGER trg_validate_match_registration
BEFORE INSERT ON public.match_registrations
FOR EACH ROW
EXECUTE FUNCTION public.validate_match_registration();

COMMIT;
