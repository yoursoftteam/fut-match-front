/**
 * Parti2 Bet - Shared TypeScript Types & Interfaces
 * Version: 1.0
 * Purpose: Type-safe definitions for all database entities, API responses, and business logic
 */

// =============================================================================
// ENUMS
// =============================================================================

export enum TournamentStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  COMPLETED = 'completed',
}

export enum MatchStage {
  GROUP_STAGE = 'group_stage',
  ROUND_OF_32 = 'round_of_32',
  ROUND_OF_16 = 'round_of_16',
  QUARTER_FINALS = 'quarter_finals',
  SEMI_FINALS = 'semi_finals',
  THIRD_PLACE = 'third_place',
  FINAL = 'final',
}

export enum MatchStatus {
  SCHEDULED = 'scheduled',
  LIVE = 'live',
  FINISHED = 'finished',
}

export enum PoolVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
}

export type PoolCompetitionType = 'pool' | 'predictions'

export enum PredictionMode {
  POOL = 'pool',
  GLOBAL = 'global',
}

export enum ErrorCode {
  PREDICTION_LOCKED = 'PREDICTION_LOCKED',
  TOURNAMENT_PREDICTION_LOCKED = 'TOURNAMENT_PREDICTION_LOCKED',
  CONFIG_FROZEN = 'CONFIG_FROZEN',
  INVALID_POOL_MODE = 'INVALID_POOL_MODE',
  MATCH_NOT_FOUND = 'MATCH_NOT_FOUND',
  POOL_NOT_FOUND = 'POOL_NOT_FOUND',
  UNAUTHORIZED_POOL_ACCESS = 'UNAUTHORIZED_POOL_ACCESS',
  INVALID_SCORE_RANGE = 'INVALID_SCORE_RANGE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INTERNAL_CALCULATION_ERROR = 'INTERNAL_CALCULATION_ERROR',
  AUDIT_LOG_WRITE_FAILED = 'AUDIT_LOG_WRITE_FAILED',
}

// =============================================================================
// TOURNAMENT ENTITIES
// =============================================================================

export interface Tournament {
  id: string;
  name: string;
  slug: string;
  status: TournamentStatus;
  kickoff_inaugural_at: string; // ISO 8601
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  fifa_code: string; // 3-letter code
  flag_svg_url?: string;
  created_at: string;
}

export interface Match {
  id: string;
  tournament_id: string;
  stage: MatchStage;
  group_name?: string; // 'A', 'B', etc.
  kickoff_at: string;
  home_team_id?: string | null;
  away_team_id?: string | null;
  home_placeholder?: string | null;
  away_placeholder?: string | null;
  venue?: string | null;
  fifa_match_number?: number | null;
  home_score_official?: number;
  away_score_official?: number;
  status: MatchStatus;
  created_at: string;
  updated_at: string;
  
  // Denormalized for convenience
  home_team?: Team | null;
  away_team?: Team | null;
}

// =============================================================================
// POOL ENTITIES
// =============================================================================

export interface Pool {
  id: string;
  tournament_id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  competition_type: PoolCompetitionType;
  visibility: PoolVisibility;
  invite_code: string;
  created_at: string;
  updated_at: string;
}

export interface PoolMember {
  id: string;
  pool_id: string;
  user_id: string;
  joined_at: string;
}

export interface PoolConfigVersion {
  id: string;
  pool_id: string;
  lock_minutes: number;
  
  // Match-level scoring
  pts_winner_selection: number;
  pts_exact_score: number;
  pts_team_goals: number;
  pts_goal_difference: number;
  
  // Phase advancement & tournament
  pts_qualified_round_2: number;
  pts_champion: number;
  pts_subchampion: number;
  pts_third_place: number;
  
  
  is_frozen: boolean;
  frozen_at?: string;
  created_at: string;
}

export interface PoolWithStats extends Pool {
  member_count: number;
  prediction_count: number;
  config_active: PoolConfigVersion;
  members?: PoolMember[];
}

// =============================================================================
// PREDICTION ENTITIES
// =============================================================================

export type TournamentCategory = 'champion' | 'subchampion' | 'third_place'

export interface TournamentPrediction {
  id: string
  mode: PredictionMode
  user_id: string
  pool_id: string
  category: TournamentCategory
  team_id: string
  created_at: string
  updated_at: string
  team?: Team | null
}

export interface MatchPrediction {
  id: string;
  mode: PredictionMode;
  user_id: string;
  pool_id?: string;
  match_id: string;
  home_score_predicted: number;
  away_score_predicted: number;
  created_at: string;
  updated_at: string;
  
  // Runtime computed
  locked?: boolean;
  time_until_lock_seconds?: number;
  match_kickoff_at?: string;
  points_earned?: number | null;
}

export interface MatchPredictionWithDetails extends MatchPrediction {
  match: Match;
}

// =============================================================================
// SCORING ENTITIES
// =============================================================================

export interface ScoreAggregate {
  id: string;
  mode: PredictionMode;
  pool_id?: string;
  user_id: string;
  points_total: number;
  updated_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  user_email?: string;
  points_total: number;
  matches_predicted: number;
  accuracy_percentage?: number;
  streak_current_wins?: number;
  joined_at?: string;
}

// =============================================================================
// AUDIT ENTITIES
// =============================================================================

export interface AuditLog {
  id: string;
  event_type: string;
  user_id?: string;
  match_id?: string;
  pool_id?: string;
  old_value?: Record<string, any>;
  new_value?: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export enum AuditEventType {
  PREDICTION_CREATED = 'PREDICTION_CREATED',
  PREDICTION_UPDATED = 'PREDICTION_UPDATED',
  PREDICTION_DELETED = 'PREDICTION_DELETED',
  MATCH_SCORED = 'MATCH_SCORED',
  POOL_CREATED = 'POOL_CREATED',
  POOL_CONFIG_UPDATED = 'POOL_CONFIG_UPDATED',
  POOL_CONFIG_FROZEN = 'POOL_CONFIG_FROZEN',
}

// =============================================================================
// NOTIFICATION ENTITIES
// =============================================================================

export interface NotificationQueueItem {
  id: string;
  user_id: string;
  email: string;
  notification_type: string;
  payload: Record<string, any>;
  idempotency_key: string;
  attempts: number;
  max_attempts: number;
  send_at: string;
  sent_at?: string;
  failed_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export enum NotificationType {
  DAILY_DIGEST = 'daily_digest',
  LAST_CHANCE = 'last_chance',
  SCORE_UPDATE = 'score_update',
  POOL_INVITE = 'pool_invite',
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface CreatePoolRequest {
  tournament_id: string;
  name: string;
  visibility: PoolVisibility;
  competition_type?: PoolCompetitionType;
  config: Partial<PoolConfigVersion>;
}

export interface UpdatePoolConfigRequest {
  pts_winner_selection?: number;
  pts_exact_score?: number;
  pts_team_goals?: number;
  pts_goal_difference?: number;
  pts_qualified_round_2?: number;
  pts_champion?: number;
  pts_subchampion?: number;
  pts_third_place?: number;
}

export interface CreatePredictionRequest {
  mode: PredictionMode;
  pool_id?: string;
  match_id: string;
  home_score_predicted: number;
  away_score_predicted: number;
}

export interface RegisterResultRequest {
  home_score_official: number;
  away_score_official: number;
  status: MatchStatus;
}

export interface ErrorResponse {
  code: ErrorCode | string;
  message: string;
  status: number;
  timestamp: string;
  request_id: string;
  details?: Record<string, any>;
}

export interface SuccessResponse<T> {
  data: T;
  timestamp: string;
  request_id: string;
}

// =============================================================================
// LOCK STATUS & TIME-SENSITIVE TYPES
// =============================================================================

export interface MatchLockStatus {
  match_id: string;
  stage: MatchStage;
  home_team: string;
  away_team: string;
  kickoff_at: string;
  locked: boolean;
  lock_in_seconds: number;
  user_has_prediction: boolean;
  can_edit: boolean;
}

export interface PredictionLockInfo {
  match_id: string;
  locked: boolean;
  seconds_until_lock: number;
  kickoff_at: string;
  lock_window_minutes: number;
}

// =============================================================================
// TOURNAMENT STATS TYPES
// =============================================================================

export interface TournamentStats {
  total_teams: number;
  total_groups: number;
  group_stage_matches: number;
  knockout_stage_matches: number;
  matches_completed: number;
  completion_percentage: number;
}

// =============================================================================
// PAGINATION & QUERY TYPES
// =============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
    total_count: number;
    has_more: boolean;
  };
}

export interface LeaderboardQueryParams {
  mode: PredictionMode;
  pool_id?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'points' | 'joined_date';
}

export interface PredictionQueryParams {
  user_id?: string;
  mode?: PredictionMode;
  pool_id?: string;
  match_id?: string;
  match_stage?: MatchStage;
  locked?: boolean;
}

// =============================================================================
// CALCULATION & UTILITY TYPES
// =============================================================================

export interface ScoringResult {
  user_id: string;
  match_id: string;
  points_earned: number;
  bonus_applied: boolean;
  breakdown: {
    exact_score?: boolean;
    winner_correct?: boolean;
    home_goals_correct?: boolean;
    away_goals_correct?: boolean;
    goal_diff_correct?: boolean;
    ko_multiplier?: number;
  };
}

export interface GroupStandings {
  group_name: string;
  teams: Array<{
    team_id: string;
    team_name: string;
    fifa_code: string;
    played: number;
    wins: number;
    draws: number;
    losses: number;
    goals_for: number;
    goals_against: number;
    goal_difference: number;
    points: number;
  }>;
}

export interface BracketNode {
  round: number;
  position: number;
  home_team_id?: string;
  away_team_id?: string;
  home_team_name?: string;
  away_team_name?: string;
  match_id?: string;
  predicted_winner_id?: string;
}

export interface FreezePoolConfigsResult {
  pools_frozen: number;
  frozen_at: string;
}

export interface HealthCheckResult {
  status: string;
  database_online: boolean;
  checked_at: string;
}

// =============================================================================
// ZUSTAND STORE TYPES
// =============================================================================

export interface FixturesSliceState {
  matches: Match[];
  tournaments: Tournament[];
  teams: Map<string, Team>;
  loading: boolean;
  error?: string;
  setMatches: (matches: Match[]) => void;
  setTournaments: (tournaments: Tournament[]) => void;
  addTeam: (team: Team) => void;
  setLoading: (loading: boolean) => void;
}

export interface PredictionsDraftSliceState {
  predictions: Map<string, MatchPrediction>;
  dirty: Set<string>; // IDs of unsaved predictions
  addPrediction: (prediction: MatchPrediction) => void;
  updatePrediction: (id: string, scores: { home: number; away: number }) => void;
  markDirty: (id: string) => void;
  markClean: (id: string) => void;
  clearAll: () => void;
}

export interface LeaderboardRealtimeSliceState {
  global_leaderboard: LeaderboardEntry[];
  pool_leaderboards: Map<string, LeaderboardEntry[]>;
  subscribed_pools: Set<string>;
  subscribe: (pool_id: string) => void;
  unsubscribe: (pool_id: string) => void;
  updateEntry: (entry: LeaderboardEntry, pool_id?: string) => void;
}

// =============================================================================
// ZSTORING CONFIG CONSTANTS
// =============================================================================

export const DEFAULT_LOCK_MINUTES = 10;

export const DEFAULT_POOL_CONFIG: Omit<PoolConfigVersion, 'id' | 'pool_id' | 'created_at' | 'is_frozen' | 'frozen_at'> = {
  lock_minutes: 10,
  pts_winner_selection: 3,
  pts_exact_score: 2,
  pts_team_goals: 1,
  pts_goal_difference: 1,
  pts_qualified_round_2: 5,
  pts_champion: 18,
  pts_subchampion: 15,
  pts_third_place: 12,
};

export const PREDICTION_COMPETITION_CONFIG: Omit<PoolConfigVersion, 'id' | 'pool_id' | 'created_at' | 'is_frozen' | 'frozen_at'> = {
  lock_minutes: 10,
  pts_winner_selection: 5,
  pts_exact_score: 0,
  pts_team_goals: 2,
  pts_goal_difference: 1,
  pts_qualified_round_2: 0,
  pts_champion: 0,
  pts_subchampion: 0,
  pts_third_place: 0,
};

export const STAGE_ORDER: Record<MatchStage, number> = {
  [MatchStage.GROUP_STAGE]: 1,
  [MatchStage.ROUND_OF_32]: 2,
  [MatchStage.ROUND_OF_16]: 3,
  [MatchStage.QUARTER_FINALS]: 4,
  [MatchStage.SEMI_FINALS]: 5,
  [MatchStage.THIRD_PLACE]: 6,
  [MatchStage.FINAL]: 7,
};

export const MAX_SCORE = 20;
export const MIN_SCORE = 0;
export const RATE_LIMIT_REQUESTS_PER_MINUTE = 100;
export const AUDIT_RETENTION_DAYS = 90;
export const NOTIFICATION_ARCHIVE_SENT_DAYS = 30;
export const NOTIFICATION_ARCHIVE_FAILED_DAYS = 7;
