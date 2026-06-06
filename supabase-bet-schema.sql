-- ============================================================================
-- Parti2 Bet Module - Database Schema
-- ============================================================================
-- This migration creates all tables and enums for the betting functionality.
-- Tables are created in dependency order to satisfy foreign key constraints.
-- ============================================================================

-- ============================================================================
-- 1. ENUM TYPES
-- ============================================================================

CREATE TYPE bet_tournament_status AS ENUM ('draft', 'active', 'completed');
CREATE TYPE bet_match_stage AS ENUM ('group_stage', 'round_of_32', 'round_of_16', 'quarter_finals', 'semi_finals', 'third_place', 'final');
CREATE TYPE bet_match_status AS ENUM ('scheduled', 'live', 'finished');
CREATE TYPE bet_pool_visibility AS ENUM ('public', 'private');
CREATE TYPE bet_prediction_mode AS ENUM ('pool', 'global');
CREATE TYPE bet_notification_type AS ENUM ('daily_digest', 'last_chance');

-- ============================================================================
-- 2. BET_TOURNAMENTS
-- ============================================================================

CREATE TABLE bet_tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  slug VARCHAR NOT NULL UNIQUE,
  status bet_tournament_status NOT NULL DEFAULT 'draft',
  kickoff_inaugural_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bet_tournaments_status ON bet_tournaments(status);
CREATE INDEX idx_bet_tournaments_slug ON bet_tournaments(slug);

-- ============================================================================
-- 3. BET_TEAMS
-- ============================================================================

CREATE TABLE bet_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR NOT NULL,
  fifa_code VARCHAR(3) NOT NULL UNIQUE,
  flag_svg_url TEXT
);

CREATE INDEX idx_bet_teams_fifa_code ON bet_teams(fifa_code);

-- ============================================================================
-- 4. BET_MATCHES
-- ============================================================================

CREATE TABLE bet_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES bet_tournaments(id) ON DELETE CASCADE,
  stage bet_match_stage NOT NULL,
  group_name CHAR(1),
  kickoff_at TIMESTAMPTZ NOT NULL,
  home_team_id UUID NOT NULL REFERENCES bet_teams(id) ON DELETE RESTRICT,
  away_team_id UUID NOT NULL REFERENCES bet_teams(id) ON DELETE RESTRICT,
  home_score_official INT,
  away_score_official INT,
  status bet_match_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bet_matches_tournament_stage ON bet_matches(tournament_id, stage);
CREATE INDEX idx_bet_matches_kickoff ON bet_matches(kickoff_at);
CREATE INDEX idx_bet_matches_status ON bet_matches(status);

-- ============================================================================
-- 5. BET_POOLS
-- ============================================================================

CREATE TABLE bet_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES bet_tournaments(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  visibility bet_pool_visibility NOT NULL DEFAULT 'private',
  invite_code VARCHAR NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bet_pools_tournament ON bet_pools(tournament_id);
CREATE INDEX idx_bet_pools_owner ON bet_pools(owner_id);
CREATE INDEX idx_bet_pools_invite_code ON bet_pools(invite_code);

-- ============================================================================
-- 6. BET_POOL_CONFIG_VERSIONS
-- ============================================================================

CREATE TABLE bet_pool_config_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES bet_pools(id) ON DELETE CASCADE,
  lock_minutes INT NOT NULL DEFAULT 10,
  pts_winner_selection INT NOT NULL DEFAULT 3,
  pts_exact_score INT NOT NULL DEFAULT 2,
  pts_team_goals INT NOT NULL DEFAULT 1,
  pts_goal_difference INT NOT NULL DEFAULT 1,
  pts_qualified_round_2 INT NOT NULL DEFAULT 5,
  pts_champion INT NOT NULL DEFAULT 18,
  pts_subchampion INT NOT NULL DEFAULT 15,
  pts_third_place INT NOT NULL DEFAULT 12,
  pts_top_scorer INT NOT NULL DEFAULT 12,
  pts_top_assistant INT NOT NULL DEFAULT 12,
  pts_mvp INT NOT NULL DEFAULT 12,
  pts_best_goalkeeper INT NOT NULL DEFAULT 12,
  pts_least_conceded INT NOT NULL DEFAULT 10,
  is_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bet_pool_config_versions_pool ON bet_pool_config_versions(pool_id);

-- ============================================================================
-- 7. BET_MATCH_PREDICTIONS
-- ============================================================================

CREATE TABLE bet_match_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode bet_prediction_mode NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pool_id UUID REFERENCES bet_pools(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES bet_matches(id) ON DELETE CASCADE,
  home_score_predicted INT NOT NULL,
  away_score_predicted INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bet_match_predictions_user ON bet_match_predictions(user_id);
CREATE INDEX idx_bet_match_predictions_pool_user ON bet_match_predictions(pool_id, user_id);
CREATE INDEX idx_bet_match_predictions_match ON bet_match_predictions(match_id);
CREATE INDEX idx_bet_match_predictions_mode ON bet_match_predictions(mode);

-- ============================================================================
-- 8. BET_SCORES_AGGREGATE
-- ============================================================================

CREATE TABLE bet_scores_aggregate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode bet_prediction_mode NOT NULL,
  pool_id UUID REFERENCES bet_pools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_total INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bet_scores_aggregate_user ON bet_scores_aggregate(user_id);
CREATE INDEX idx_bet_scores_aggregate_pool_user ON bet_scores_aggregate(pool_id, user_id);
CREATE INDEX idx_bet_scores_aggregate_points_desc ON bet_scores_aggregate(points_total DESC);

-- ============================================================================
-- 9. BET_NOTIFICATION_QUEUE
-- ============================================================================

CREATE TABLE bet_notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_id UUID REFERENCES bet_matches(id) ON DELETE SET NULL,
  type bet_notification_type NOT NULL,
  send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  idempotency_key VARCHAR NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bet_notification_queue_user ON bet_notification_queue(user_id);
CREATE INDEX idx_bet_notification_queue_send_at ON bet_notification_queue(send_at);
CREATE INDEX idx_bet_notification_queue_sent_at ON bet_notification_queue(sent_at);

-- ============================================================================
-- 10. BET_AUDIT_LOG
-- ============================================================================

CREATE TABLE bet_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action VARCHAR NOT NULL,
  match_id UUID REFERENCES bet_matches(id) ON DELETE SET NULL,
  old_value INT,
  new_value INT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bet_audit_log_user ON bet_audit_log(user_id);
CREATE INDEX idx_bet_audit_log_timestamp ON bet_audit_log(timestamp);
CREATE INDEX idx_bet_audit_log_match ON bet_audit_log(match_id);

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================
