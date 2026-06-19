-- Parti2 Bet - Setup pg_cron Jobs for Email Campaigns
-- Requires pg_cron extension (Supabase Pro)

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- Safely schedule: delete existing jobs with same name, then create
-- This allows re-running this migration without duplicating jobs

-- Campaign 1: Last Chance Alerts (every 15 minutes)
SELECT cron.unschedule('last-chance-every-15min');
SELECT cron.schedule(
  'last-chance-every-15min',
  '*/15 * * * *',
  $$SELECT fn_enqueue_last_chance_alerts()$$
);

-- Campaign 2: Daily Digest at 9:00 AM Colombia (14:00 UTC)
SELECT cron.unschedule('daily-digest-9am-col');
SELECT cron.schedule(
  'daily-digest-9am-col',
  '0 14 * * *',
  $$SELECT fn_enqueue_daily_digests()$$
);
