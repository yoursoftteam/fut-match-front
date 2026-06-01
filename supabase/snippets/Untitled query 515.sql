ALTER TABLE bet_pools
  ADD COLUMN IF NOT EXISTS competition_type TEXT NOT NULL DEFAULT 'pool';

ALTER TABLE bet_pools
  DROP CONSTRAINT IF EXISTS bet_pools_competition_type_check;

ALTER TABLE bet_pools
  ADD CONSTRAINT bet_pools_competition_type_check
  CHECK (competition_type IN ('pool', 'predictions'));

CREATE INDEX IF NOT EXISTS idx_bet_pools_competition_type
  ON bet_pools(competition_type);