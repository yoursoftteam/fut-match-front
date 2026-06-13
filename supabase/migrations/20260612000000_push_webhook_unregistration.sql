-- Push webhook dispatch on unregistration (DELETE).
-- Reuses the same push_webhook_config table and Cloudflare Worker URL.

CREATE OR REPLACE FUNCTION public.notify_unregistration_cloudflare()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_webhook_url    TEXT;
  v_webhook_secret TEXT;
  v_match          RECORD;
  v_headers        JSONB;
  v_payload        JSONB;
BEGIN
  IF TG_OP <> 'DELETE' THEN
    RETURN OLD;
  END IF;

  IF OLD.name ILIKE 'Arquero Alquilado%' THEN
    RETURN OLD;
  END IF;

  SELECT
    MAX(CASE WHEN key = 'webhook_url'    THEN value END),
    MAX(CASE WHEN key = 'webhook_secret' THEN value END)
  INTO v_webhook_url, v_webhook_secret
  FROM public.push_webhook_config
  WHERE key IN ('webhook_url', 'webhook_secret');

  IF v_webhook_url IS NULL OR v_webhook_url !~ '^https://' THEN
    RETURN OLD;
  END IF;

  SELECT m.id, m.title, m.location, m.date, m.created_by
  INTO v_match
  FROM public.matches m
  WHERE m.id = OLD.match_id;

  IF NOT FOUND THEN
    RETURN OLD;
  END IF;

  v_headers := jsonb_build_object('Content-Type', 'application/json');
  IF v_webhook_secret IS NOT NULL THEN
    v_headers := v_headers || jsonb_build_object('x-parti2-webhook-secret', v_webhook_secret);
  END IF;

  v_payload := jsonb_build_object(
    'event', 'match_registration_deleted',
    'registration', jsonb_build_object(
      'id',            OLD.id,
      'match_id',      OLD.match_id,
      'user_id',       OLD.user_id,
      'name',          OLD.name,
      'is_goalkeeper', OLD.is_goalkeeper,
      'registered_at', OLD.registered_at
    ),
    'match', jsonb_build_object(
      'id',         v_match.id,
      'title',      v_match.title,
      'location',   v_match.location,
      'date',       v_match.date,
      'created_by', v_match.created_by
    )
  );

  PERFORM net.http_post(
    url     := v_webhook_url,
    headers := v_headers,
    body    := v_payload
  );

  RETURN OLD;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_unregistration_cloudflare error: % (SQLSTATE=%)', SQLERRM, SQLSTATE;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_unregistration_cloudflare ON public.match_registrations;

CREATE TRIGGER trg_notify_unregistration_cloudflare
AFTER DELETE ON public.match_registrations
FOR EACH ROW
EXECUTE FUNCTION public.notify_unregistration_cloudflare();
