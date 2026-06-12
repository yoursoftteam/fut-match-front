-- Issue #75 - Schedule Edge Function invocation every 10 minutes
-- Replace placeholders before running in SQL Editor.

-- Required extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Optional: remove previous job if exists
select cron.unschedule('invoke-match-sync')
where exists (
  select 1
  from cron.job
  where jobname = 'invoke-match-sync'
);

select cron.schedule(
  'invoke-match-sync',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/sync-match-results',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
