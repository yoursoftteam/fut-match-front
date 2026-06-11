BEGIN;

DROP INDEX IF EXISTS public.idx_bet_matches_api_fixture_id;

ALTER TABLE public.bet_matches
	ALTER COLUMN api_fixture_id TYPE TEXT
	USING api_fixture_id::TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_bet_matches_api_fixture_id
	ON public.bet_matches USING btree (api_fixture_id)
	WHERE api_fixture_id IS NOT NULL;

COMMENT ON COLUMN public.bet_matches.api_fixture_id IS
	'Immutable external match id used for result synchronization';

COMMIT;
