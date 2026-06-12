-- Schedule check-match-status every hour from 11 AM to 11 PM COL (UTC-5)
-- Replace placeholders before running in SQL Editor.

-- Required extensions (already installed if sync-match-results is scheduled)
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;

-- Optional: remove previous job if exists
select cron.unschedule('check-match-status')
where exists (
  select 1
  from cron.job
  where jobname = 'check-match-status'
);

select cron.schedule(
  'check-match-status',
  '5,25,45 16-23,0-4 * * *',  -- cada 20 min desde 11:05 COL (UTC-5)
  $$
  select net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/check-match-status',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
