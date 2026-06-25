-- Parti2 Bet - Setup pg_cron Jobs for Email Campaigns
-- Requires pg_cron extension (Supabase Pro)
-- Gracefully handles missing extension (local dev) and missing jobs (fresh install)

DO $body$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    RAISE NOTICE 'pg_cron not available, skipping cron job setup';
    RETURN;
  END IF;

  -- Campaign 1: Last Chance Alerts (every 15 minutes)
  BEGIN
    PERFORM cron.unschedule('last-chance-every-15min');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not unschedule last-chance-every-15min: %', SQLERRM;
  END;
  PERFORM cron.schedule(
    'last-chance-every-15min',
    '*/15 * * * *',
    $q$SELECT fn_enqueue_last_chance_alerts()$q$
  );

  -- Campaign 2: Daily Digest at 9:00 AM Colombia (14:00 UTC)
  BEGIN
    PERFORM cron.unschedule('daily-digest-9am-col');
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not unschedule daily-digest-9am-col: %', SQLERRM;
  END;
  PERFORM cron.schedule(
    'daily-digest-9am-col',
    '0 14 * * *',
    $q$SELECT fn_enqueue_daily_digests()$q$
  );
END
$body$;
