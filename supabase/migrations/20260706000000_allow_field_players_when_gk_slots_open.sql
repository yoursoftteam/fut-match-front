-- Allow field players to register as substitutes even when filler titular
-- slots remain reserved for goalkeepers. Previously the trigger blocked field
-- players when v_field_players >= v_max_field_players while v_total <
-- v_max_players, creating a deadlock: field players couldn't register (position
-- full) and no substitute button appeared on the client because isTitularFull
-- was false (GK slot still open). The client computed isTitularFull by count
-- without considering position, so the only button shown was "Inscribirme",
-- which would fail server-side.
--
-- Fix: remove field-player position restriction while filling titular slots.
-- Goalkeeper cap (max 2) still applies. This lets field players register up to
-- the total hard cap (max_players + 10). If goalkeeper slots remain unfilled,
-- field players simply occupy them. The client now also shows the substitute
-- button when field-player titular slots are full (isFieldPlayerFull), even if
-- GK slots remain.

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

  -- Keep goalkeeper cap only for titular filling stage.
  IF v_total < v_max_players AND NEW.is_goalkeeper THEN
    v_reserved_goalkeeper_slots := LEAST(2, v_max_players);

    IF v_goalkeepers >= v_reserved_goalkeeper_slots THEN
      RAISE EXCEPTION 'Ya se completaron los cupos de arqueros (máximo 2).';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
