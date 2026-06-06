-- Telegram notify trigger on match_registrations
-- When someone registers or unregisters, sends updated list to linked Telegram groups

BEGIN;

CREATE OR REPLACE FUNCTION notify_registration_via_telegram()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_webhook_url TEXT := 'https://pristine-finalize-masses.ngrok-free.dev/api/v1/telegram/notify-registration';
  v_secret TEXT := 'parti2-telegram-notify-2026';
  v_match_id UUID;
  v_name TEXT;
  v_is_goalkeeper BOOLEAN;
  v_type TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_match_id := NEW.match_id;
    v_name := NEW.name;
    v_is_goalkeeper := NEW.is_goalkeeper;
    v_type := 'register';
  ELSIF TG_OP = 'DELETE' THEN
    v_match_id := OLD.match_id;
    v_name := OLD.name;
    v_is_goalkeeper := OLD.is_goalkeeper;
    v_type := 'unregister';
  ELSE
    RETURN NULL;
  END IF;

  PERFORM net.http_post(
    url := v_webhook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notify-secret', v_secret
    ),
    body := jsonb_build_object(
      'match_id', v_match_id,
      'name', v_name,
      'is_goalkeeper', v_is_goalkeeper,
      'type', v_type
    )
  );

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_telegram_on_registration ON match_registrations;

CREATE TRIGGER trg_notify_telegram_on_registration
AFTER INSERT ON match_registrations
FOR EACH ROW
EXECUTE FUNCTION notify_registration_via_telegram();

DROP TRIGGER IF EXISTS trg_notify_telegram_on_unregistration ON match_registrations;

CREATE TRIGGER trg_notify_telegram_on_unregistration
AFTER DELETE ON match_registrations
FOR EACH ROW
EXECUTE FUNCTION notify_registration_via_telegram();

COMMIT;
