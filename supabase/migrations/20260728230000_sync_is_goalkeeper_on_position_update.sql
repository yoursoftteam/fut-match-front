-- Sync is_goalkeeper flag when position is updated.
--
-- Problem: updateRegistrationPosition in the app only updated the `position`
-- column, never the `is_goalkeeper` boolean. When a field player's position was
-- changed to "portero" via the inline position editor (PositionEditInline),
-- is_goalkeeper stayed false. This caused:
--   1. The UI (filters by is_goalkeeper) to under-count goalkeepers
--   2. The DB BEFORE INSERT trigger (only counts is_goalkeeper=true) to
--      under-count, allowing more than 2 effective goalkeepers
--   3. Changing a goalkeeper to a field position left is_goalkeeper=true,
--      falsely occupying a goalkeeper slot
--
-- Fix:
--   1. BEFORE UPDATE trigger keeps is_goalkeeper in sync with position
--   2. Validates goalkeeper slot limit on UPDATE too (not just INSERT)

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
  -- Only run when position actually changes
  IF OLD.position IS NOT DISTINCT FROM NEW.position THEN
    RETURN NEW;
  END IF;

  -- Auto-sync is_goalkeeper with the new position
  NEW.is_goalkeeper := (NEW.position = 'portero');

  -- Fetch match config
  SELECT m.max_players INTO v_max_players
  FROM get_public_match_by_id(NEW.match_id) AS m;

  IF v_max_players IS NULL THEN
    RAISE EXCEPTION 'Partido no encontrado.';
  END IF;

  -- Count current registrations (excluding this one since it's already counted in v_total)
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_goalkeeper)
  INTO v_total, v_goalkeepers
  FROM match_registrations
  WHERE match_id = NEW.match_id;

  -- Hard cap: titular slots + substitute slots
  IF v_total > v_max_players + v_max_substitute_slots THEN
    RAISE EXCEPTION 'No hay cupos disponibles, ni siquiera como suplente.';
  END IF;

  -- Enforce goalkeeper limit while filling titular slots.
  -- On UPDATE the total count already includes this row, so check
  -- v_goalkeepers includes the effect of the new is_goalkeeper value.
  IF v_total <= v_max_players AND NEW.is_goalkeeper THEN
    v_reserved_goalkeeper_slots := LEAST(2, v_max_players);
    -- Count the new state: current + change delta
    -- Since this row is already counted in v_goalkeepers with OLD value,
    -- we need to adjust: (v_goalkeepers - old_is_goalkeeper + new_is_goalkeeper)
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
