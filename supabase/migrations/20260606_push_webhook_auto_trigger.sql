-- Push webhook dispatch on registration.
-- Config (URL + secret) stored in push_webhook_config table.
-- RLS blocks anon/authenticated; only the SECURITY DEFINER trigger can read it.
-- Diagnostics embedded in payload so the Cloudflare Worker logs them.

CREATE EXTENSION IF NOT EXISTS pg_net;

-- Config table: not exposed to anon/authenticated via PostgREST.
CREATE TABLE IF NOT EXISTS public.push_webhook_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

ALTER TABLE public.push_webhook_config ENABLE ROW LEVEL SECURITY;

-- No SELECT policy for anon/authenticated → completely blocked via PostgREST.
-- The SECURITY DEFINER trigger runs as its owner and bypasses RLS entirely.
REVOKE ALL ON public.push_webhook_config FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_registration_cloudflare()
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
  IF TG_OP <> 'INSERT' THEN
    RETURN NEW;
  END IF;

  IF NEW.name ILIKE 'Arquero Alquilado%' THEN
    RETURN NEW;
  END IF;

  SELECT
    MAX(CASE WHEN key = 'webhook_url'    THEN value END),
    MAX(CASE WHEN key = 'webhook_secret' THEN value END)
  INTO v_webhook_url, v_webhook_secret
  FROM public.push_webhook_config
  WHERE key IN ('webhook_url', 'webhook_secret');

  IF v_webhook_url IS NULL OR v_webhook_url !~ '^https://' THEN
    RETURN NEW;
  END IF;

  SELECT m.id, m.title, m.location, m.date, m.created_by
  INTO v_match
  FROM public.matches m
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
    '_debug', jsonb_build_object(
      'secret_found', v_webhook_secret IS NOT NULL,
      'triggered_at', now()
    ),
    'registration', jsonb_build_object(
      'id',            NEW.id,
      'match_id',      NEW.match_id,
      'user_id',       NEW.user_id,
      'name',          NEW.name,
      'is_goalkeeper', NEW.is_goalkeeper,
      'registered_at', NEW.registered_at
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

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'notify_registration_cloudflare unexpected error: % (SQLSTATE=%)', SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_registration_cloudflare ON public.match_registrations;

CREATE TRIGGER trg_notify_registration_cloudflare
AFTER INSERT ON public.match_registrations
FOR EACH ROW
EXECUTE FUNCTION public.notify_registration_cloudflare();
