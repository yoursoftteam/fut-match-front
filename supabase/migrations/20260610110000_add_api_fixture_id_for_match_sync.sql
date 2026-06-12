-- API-Football integration: external fixture link for bet_matches
-- Issue #75

BEGIN;

ALTER TABLE public.bet_matches
  ADD COLUMN IF NOT EXISTS api_fixture_id BIGINT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bet_matches_api_fixture_id
  ON public.bet_matches USING btree (api_fixture_id)
  WHERE api_fixture_id IS NOT NULL;

COMMENT ON COLUMN public.bet_matches.api_fixture_id IS
  'Immutable fixture id from API-Football used for result synchronization';

COMMIT;
