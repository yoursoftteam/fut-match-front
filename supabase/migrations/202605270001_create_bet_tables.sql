-- Parti2 Bet Module - Database Schema Migration
-- Version: 1.0
-- Date: 2026-05-27
-- Description: Creates all tables for the Parti2 Bet FIFA 2026 betting pool system

-- =============================================================================
-- EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- ENUMS
-- =============================================================================
CREATE TYPE bet_tournament_status AS ENUM ('draft', 'active', 'completed');
CREATE TYPE bet_match_stage AS ENUM (
  'group_stage',
  'round_of_32',
  'round_of_16',
  'quarter_finals',
  'semi_finals',
  'third_place',
  'final'
);
CREATE TYPE bet_match_status AS ENUM ('scheduled', 'live', 'finished');
CREATE TYPE bet_visibility AS ENUM ('public', 'private');
CREATE TYPE bet_prediction_mode AS ENUM ('pool', 'global');

-- =============================================================================
-- TOURNAMENTS TABLE
-- =============================================================================
CREATE TABLE bet_tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  status bet_tournament_status DEFAULT 'draft',
  kickoff_inaugural_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT tournament_name_length CHECK (LENGTH(name) >= 3)
);

CREATE INDEX idx_bet_tournaments_slug ON bet_tournaments(slug);
CREATE INDEX idx_bet_tournaments_status ON bet_tournaments(status);

-- =============================================================================
-- TEAMS TABLE
-- =============================================================================
CREATE TABLE bet_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  fifa_code VARCHAR(3) NOT NULL UNIQUE,
  flag_svg_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT team_name_length CHECK (LENGTH(name) >= 2),
  CONSTRAINT fifa_code_length CHECK (LENGTH(fifa_code) = 3)
);

CREATE INDEX idx_bet_teams_fifa_code ON bet_teams(fifa_code);

-- =============================================================================
-- MATCHES TABLE
-- =============================================================================
CREATE TABLE bet_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES bet_tournaments(id) ON DELETE CASCADE,
  stage bet_match_stage NOT NULL,
  group_name CHAR(1),
  kickoff_at TIMESTAMPTZ NOT NULL,
  home_team_id UUID NOT NULL REFERENCES bet_teams(id),
  away_team_id UUID NOT NULL REFERENCES bet_teams(id),
  home_score_official INT,
  away_score_official INT,
  status bet_match_status DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_scores CHECK (
    (home_score_official IS NULL OR (home_score_official >= 0 AND home_score_official <= 20)) AND
    (away_score_official IS NULL OR (away_score_official >= 0 AND away_score_official <= 20))
  ),
  CONSTRAINT valid_teams CHECK (home_team_id != away_team_id),
  CONSTRAINT valid_group_stage CHECK (
    (stage = 'group_stage' AND group_name IS NOT NULL) OR
    (stage != 'group_stage' AND group_name IS NULL)
  )
);

CREATE INDEX idx_bet_matches_tournament ON bet_matches(tournament_id);
CREATE INDEX idx_bet_matches_kickoff ON bet_matches(kickoff_at DESC);
CREATE INDEX idx_bet_matches_stage ON bet_matches(stage);
CREATE INDEX idx_bet_matches_status ON bet_matches(status);

-- =============================================================================
-- POOLS TABLE
-- =============================================================================
CREATE TABLE bet_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES bet_tournaments(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  visibility bet_visibility DEFAULT 'private',
  invite_code VARCHAR(10) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT pool_name_length CHECK (LENGTH(name) >= 3),
  CONSTRAINT invite_code_length CHECK (LENGTH(invite_code) = 10)
);

CREATE INDEX idx_bet_pools_owner ON bet_pools(owner_id);
CREATE INDEX idx_bet_pools_tournament ON bet_pools(tournament_id);
CREATE INDEX idx_bet_pools_visibility ON bet_pools(visibility);
CREATE UNIQUE INDEX idx_bet_pools_invite_code ON bet_pools(invite_code);

-- =============================================================================
-- POOL MEMBERS TABLE
-- =============================================================================
CREATE TABLE bet_pool_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES bet_pools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(pool_id, user_id)
);

CREATE INDEX idx_bet_pool_members_pool ON bet_pool_members(pool_id);
CREATE INDEX idx_bet_pool_members_user ON bet_pool_members(user_id);

-- =============================================================================
-- POOL CONFIG VERSIONS TABLE (Immutable History)
-- =============================================================================
CREATE TABLE bet_pool_config_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES bet_pools(id) ON DELETE CASCADE,
  
  -- Locking Configuration
  lock_minutes INT DEFAULT 10,
  
  -- Match-level Scoring
  pts_winner_selection INT DEFAULT 3,
  pts_exact_score INT DEFAULT 2,
  pts_team_goals INT DEFAULT 1,
  pts_goal_difference INT DEFAULT 1,
  
  -- Phase Advancement & Tournament Completion
  pts_qualified_round_2 INT DEFAULT 5,
  pts_champion INT DEFAULT 18,
  pts_subchampion INT DEFAULT 15,
  pts_third_place INT DEFAULT 12,
  
  -- Individual Achievements
  pts_top_scorer INT DEFAULT 12,
  pts_top_assistant INT DEFAULT 12,
  pts_mvp INT DEFAULT 12,
  pts_best_goalkeeper INT DEFAULT 12,
  pts_least_conceded INT DEFAULT 10,
  
  -- Freezing & Versioning
  is_frozen BOOLEAN DEFAULT FALSE,
  frozen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_lock_minutes CHECK (lock_minutes > 0 AND lock_minutes <= 60),
  CONSTRAINT check_pts_range CHECK (
    pts_winner_selection BETWEEN 0 AND 100 AND
    pts_exact_score BETWEEN 0 AND 100 AND
    pts_team_goals BETWEEN 0 AND 100 AND
    pts_goal_difference BETWEEN 0 AND 100 AND
    pts_qualified_round_2 BETWEEN 0 AND 100 AND
    pts_champion BETWEEN 0 AND 100 AND
    pts_subchampion BETWEEN 0 AND 100 AND
    pts_third_place BETWEEN 0 AND 100 AND
    pts_top_scorer BETWEEN 0 AND 100 AND
    pts_top_assistant BETWEEN 0 AND 100 AND
    pts_mvp BETWEEN 0 AND 100 AND
    pts_best_goalkeeper BETWEEN 0 AND 100 AND
    pts_least_conceded BETWEEN 0 AND 100
  )
);

CREATE INDEX idx_bet_pool_config_pool ON bet_pool_config_versions(pool_id);
CREATE INDEX idx_bet_pool_config_frozen ON bet_pool_config_versions(is_frozen);
CREATE INDEX idx_bet_pool_config_created ON bet_pool_config_versions(created_at DESC);

-- =============================================================================
-- MATCH PREDICTIONS TABLE
-- =============================================================================
CREATE TABLE bet_match_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode bet_prediction_mode NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pool_id UUID REFERENCES bet_pools(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES bet_matches(id) ON DELETE CASCADE,
  
  home_score_predicted INT NOT NULL,
  away_score_predicted INT NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_predicted_scores CHECK (
    home_score_predicted >= 0 AND home_score_predicted <= 20 AND
    away_score_predicted >= 0 AND away_score_predicted <= 20
  ),
  CONSTRAINT pool_mode_constraint CHECK (
    (mode = 'pool' AND pool_id IS NOT NULL) OR
    (mode = 'global' AND pool_id IS NULL)
  ),
  UNIQUE(user_id, match_id, mode, pool_id)
);

CREATE INDEX idx_bet_predictions_user ON bet_match_predictions(user_id);
CREATE INDEX idx_bet_predictions_match ON bet_match_predictions(match_id);
CREATE INDEX idx_bet_predictions_pool ON bet_match_predictions(pool_id) WHERE pool_id IS NOT NULL;
CREATE INDEX idx_bet_predictions_mode ON bet_match_predictions(mode);
CREATE INDEX idx_bet_predictions_updated ON bet_match_predictions(updated_at DESC);

-- =============================================================================
-- SCORES AGGREGATE TABLE
-- =============================================================================
CREATE TABLE bet_scores_aggregate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode bet_prediction_mode NOT NULL,
  pool_id UUID REFERENCES bet_pools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  points_total INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_points CHECK (points_total >= 0),
  UNIQUE(user_id, mode, pool_id)
);

-- Critical indexes for leaderboard performance
CREATE INDEX idx_bet_scores_user_mode ON bet_scores_aggregate(user_id, mode);
CREATE INDEX idx_bet_scores_pool_rank ON bet_scores_aggregate(pool_id, points_total DESC) 
  WHERE pool_id IS NOT NULL;
CREATE INDEX idx_bet_scores_global_rank ON bet_scores_aggregate(points_total DESC) 
  WHERE mode = 'global';
CREATE INDEX idx_bet_scores_updated ON bet_scores_aggregate(updated_at DESC);

-- =============================================================================
-- AUDIT LOGS TABLE (Immutable)
-- =============================================================================
CREATE TABLE bet_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  match_id UUID REFERENCES bet_matches(id),
  pool_id UUID REFERENCES bet_pools(id),
  
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_event_type CHECK (LENGTH(event_type) >= 3)
);

-- Indexes for audit trail queries
CREATE INDEX idx_bet_audit_user ON bet_audit_logs(user_id);
CREATE INDEX idx_bet_audit_match ON bet_audit_logs(match_id);
CREATE INDEX idx_bet_audit_pool ON bet_audit_logs(pool_id);
CREATE INDEX idx_bet_audit_event_type ON bet_audit_logs(event_type);
CREATE INDEX idx_bet_audit_created ON bet_audit_logs(created_at DESC);

-- =============================================================================
-- NOTIFICATION QUEUE TABLE (For Resend Integration)
-- =============================================================================
CREATE TABLE bet_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  notification_type VARCHAR(50) NOT NULL, -- 'daily_digest', 'last_chance', etc.
  
  payload JSONB NOT NULL,
  idempotency_key VARCHAR(100) NOT NULL UNIQUE,
  
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 5,
  send_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT valid_notification_type CHECK (LENGTH(notification_type) >= 3)
);

CREATE INDEX idx_bet_notification_user ON bet_notification_queue(user_id);
CREATE INDEX idx_bet_notification_send_at ON bet_notification_queue(send_at);
CREATE INDEX idx_bet_notification_sent ON bet_notification_queue(sent_at) WHERE sent_at IS NOT NULL;
CREATE INDEX idx_bet_notification_pending ON bet_notification_queue(send_at) 
  WHERE sent_at IS NULL AND failed_at IS NULL;

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Helper function to generate unique invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS VARCHAR(10) AS $$
DECLARE
  code VARCHAR(10);
  exists_count INT;
BEGIN
  LOOP
    code := SUBSTRING(
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      1 + FLOOR(RANDOM() * 36),
      1
    ) || SUBSTRING(
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      1 + FLOOR(RANDOM() * 36),
      1
    ) || SUBSTRING(
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      1 + FLOOR(RANDOM() * 36),
      1
    ) || SUBSTRING(
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      1 + FLOOR(RANDOM() * 36),
      1
    ) || SUBSTRING(
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      1 + FLOOR(RANDOM() * 36),
      1
    ) || SUBSTRING(
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      1 + FLOOR(RANDOM() * 36),
      1
    ) || SUBSTRING(
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      1 + FLOOR(RANDOM() * 36),
      1
    ) || SUBSTRING(
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      1 + FLOOR(RANDOM() * 36),
      1
    ) || SUBSTRING(
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      1 + FLOOR(RANDOM() * 36),
      1
    ) || SUBSTRING(
      'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      1 + FLOOR(RANDOM() * 36),
      1
    );
    
    SELECT COUNT(*) INTO exists_count FROM bet_pools WHERE invite_code = code;
    EXIT WHEN exists_count = 0;
  END LOOP;
  
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Update timestamp on bet_tournaments
CREATE OR REPLACE FUNCTION update_bet_tournaments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bet_tournaments_updated_at
  BEFORE UPDATE ON bet_tournaments
  FOR EACH ROW
  EXECUTE FUNCTION update_bet_tournaments_updated_at();

-- Update timestamp on bet_matches
CREATE OR REPLACE FUNCTION update_bet_matches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bet_matches_updated_at
  BEFORE UPDATE ON bet_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_bet_matches_updated_at();

-- Update timestamp on bet_pools
CREATE OR REPLACE FUNCTION update_bet_pools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bet_pools_updated_at
  BEFORE UPDATE ON bet_pools
  FOR EACH ROW
  EXECUTE FUNCTION update_bet_pools_updated_at();

-- Update timestamp on bet_match_predictions
CREATE OR REPLACE FUNCTION update_bet_predictions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bet_predictions_updated_at
  BEFORE UPDATE ON bet_match_predictions
  FOR EACH ROW
  EXECUTE FUNCTION update_bet_predictions_updated_at();

-- Auto-update timestamp on bet_scores_aggregate
CREATE OR REPLACE FUNCTION update_bet_scores_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_bet_scores_updated_at
  BEFORE UPDATE ON bet_scores_aggregate
  FOR EACH ROW
  EXECUTE FUNCTION update_bet_scores_updated_at();

-- Auto-generate invite code on pool creation
CREATE OR REPLACE FUNCTION auto_generate_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_auto_generate_invite_code
  BEFORE INSERT ON bet_pools
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_invite_code();

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE bet_tournaments IS 'Stores tournament metadata (e.g., FIFA World Cup 2026)';
COMMENT ON TABLE bet_teams IS 'Stores participating teams/countries';
COMMENT ON TABLE bet_matches IS 'Stores all matches in a tournament with official scores';
COMMENT ON TABLE bet_pools IS 'User-created betting pools with custom scoring rules';
COMMENT ON TABLE bet_pool_config_versions IS 'Immutable history of pool scoring configurations';
COMMENT ON TABLE bet_match_predictions IS 'User predictions for match scores (pool or global mode)';
COMMENT ON TABLE bet_scores_aggregate IS 'Denormalized point totals for fast leaderboard queries';
COMMENT ON TABLE bet_audit_logs IS 'Immutable audit trail of all prediction changes and score calculations';
COMMENT ON TABLE bet_notification_queue IS 'Queue for Resend email notifications with idempotency guarantees';

-- =============================================================================
-- GRANTS (Optional - adjust based on your auth setup)
-- =============================================================================

-- Enable RLS
ALTER TABLE bet_tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_pool_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_pool_config_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_match_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_scores_aggregate ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bet_notification_queue ENABLE ROW LEVEL SECURITY;
