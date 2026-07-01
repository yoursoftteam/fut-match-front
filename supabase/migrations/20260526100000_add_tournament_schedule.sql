alter table public.tournaments
  add column if not exists scheduled_days jsonb;
