CREATE TABLE bet_tournament_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode TEXT NOT NULL DEFAULT 'pool',
  user_id UUID NOT NULL,
  pool_id UUID NOT NULL,
  category VARCHAR(30) NOT NULL,
  team_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_pool_category UNIQUE (user_id, pool_id, category),
  CONSTRAINT valid_category CHECK (category IN ('champion', 'subchampion', 'third_place'))
);

CREATE INDEX idx_tournament_preds_pool ON bet_tournament_predictions(pool_id);
CREATE INDEX idx_tournament_preds_user ON bet_tournament_predictions(user_id);
CREATE INDEX idx_tournament_preds_category ON bet_tournament_predictions(category);

ALTER TABLE bet_tournament_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own tournament predictions"
  ON bet_tournament_predictions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tournament predictions"
  ON bet_tournament_predictions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tournament predictions"
  ON bet_tournament_predictions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Tournament predictions visible to pool members"
  ON bet_tournament_predictions FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM bet_pool_members
      WHERE pool_id = bet_tournament_predictions.pool_id
      AND user_id = auth.uid()
    )
  );
