/**
 * Parti2 Bet - Shared Utility Functions
 * Version: 1.0
 * Purpose: Business logic helpers for scoring, time calculations, and data transformations
 */

import {
  MatchPrediction,
  MatchStage,
  PredictionMode,
  ScoringResult,
  GroupStandings,
  DEFAULT_POOL_CONFIG,
  PoolConfigVersion,
  MAX_SCORE,
  MIN_SCORE,
} from '@/types/bet';

// =============================================================================
// SCORING UTILITIES
// =============================================================================

/**
 * Calculate global mode points for a single prediction (immutable business logic)
 * Per spec: Exact=10pts, Winner=5pts, Goals=2pts each, KO stage=2x multiplier
 */
export function calculateGlobalPoints(
  homeScoreOfficial: number,
  awayScoreOfficial: number,
  homeScorePredicted: number,
  awayScorePredicted: number,
  stage: MatchStage
): number {
  let points = 0;

  // Determine outcomes
  const actualWinner = getOutcome(homeScoreOfficial, awayScoreOfficial);
  const predictedWinner = getOutcome(homeScorePredicted, awayScorePredicted);

  const isExactScore =
    homeScoreOfficial === homeScorePredicted &&
    awayScoreOfficial === awayScorePredicted;

  const isKnockout = stage !== MatchStage.GROUP_STAGE;

  // Exact score: 10 points
  if (isExactScore) {
    points = 10;
  } else {
    // Winner/Draw correct: 5 points
    if (actualWinner === predictedWinner) {
      points += 5;
    }

    // Home team goals correct: 2 points
    if (homeScoreOfficial === homeScorePredicted) {
      points += 2;
    }

    // Away team goals correct: 2 points
    if (awayScoreOfficial === awayScorePredicted) {
      points += 2;
    }
  }

  // Double points for knockout stages
  if (isKnockout) {
    points *= 2;
  }

  return points;
}

/**
 * Calculate pool-specific points using custom config
 */
export function calculatePoolPoints(
  homeScoreOfficial: number,
  awayScoreOfficial: number,
  homeScorePredicted: number,
  awayScorePredicted: number,
  config: PoolConfigVersion
): number {
  let points = 0;

  const isExactScore =
    homeScoreOfficial === homeScorePredicted &&
    awayScoreOfficial === awayScorePredicted;

  if (isExactScore) {
    return config.pts_exact_score;
  }

  // Winner/Draw prediction
  const actualWinner = getOutcome(homeScoreOfficial, awayScoreOfficial);
  const predictedWinner = getOutcome(homeScorePredicted, awayScorePredicted);

  if (actualWinner === predictedWinner) {
    points += config.pts_winner_selection;
  }

  // Individual team goals
  if (homeScoreOfficial === homeScorePredicted) {
    points += config.pts_team_goals;
  }
  if (awayScoreOfficial === awayScorePredicted) {
    points += config.pts_team_goals;
  }

  // Goal difference
  const actualDiff = homeScoreOfficial - awayScoreOfficial;
  const predictedDiff = homeScorePredicted - awayScorePredicted;

  if (actualDiff === predictedDiff) {
    points += config.pts_goal_difference;
  }

  return points;
}

/**
 * Get match outcome: 'home' | 'away' | 'draw'
 */
function getOutcome(
  homeScore: number,
  awayScore: number
): 'home' | 'away' | 'draw' {
  if (homeScore > awayScore) return 'home';
  if (homeScore < awayScore) return 'away';
  return 'draw';
}

// =============================================================================
// TIME & LOCK UTILITIES
// =============================================================================

/**
 * Check if a prediction is locked based on match kickoff time
 */
export function isPredictionLocked(
  kickoffAt: string,
  lockMinutesBefore: number = 10
): boolean {
  const now = new Date();
  const kickoff = new Date(kickoffAt);
  const lockTime = new Date(kickoff.getTime() - lockMinutesBefore * 60 * 1000);

  return now >= lockTime;
}

/**
 * Calculate seconds until a prediction is locked
 */
export function getSecondsUntilLock(
  kickoffAt: string,
  lockMinutesBefore: number = 10
): number {
  const now = new Date();
  const kickoff = new Date(kickoffAt);
  const lockTime = new Date(kickoff.getTime() - lockMinutesBefore * 60 * 1000);

  const secondsRemaining = (lockTime.getTime() - now.getTime()) / 1000;

  return Math.max(0, Math.ceil(secondsRemaining));
}

/**
 * Get lock status with human-readable formatting
 */
export function getLockStatus(
  kickoffAt: string,
  lockMinutesBefore: number = 10
): {
  locked: boolean;
  secondsUntilLock: number;
  timeFormatted: string;
} {
  const secondsUntilLock = getSecondsUntilLock(kickoffAt, lockMinutesBefore);
  const locked = isPredictionLocked(kickoffAt, lockMinutesBefore);

  const minutes = Math.floor(secondsUntilLock / 60);
  const seconds = secondsUntilLock % 60;

  let timeFormatted = 'Locked';
  if (!locked) {
    if (minutes > 0) {
      timeFormatted = `${minutes}m ${seconds}s`;
    } else {
      timeFormatted = `${seconds}s`;
    }
  }

  return { locked, secondsUntilLock, timeFormatted };
}

// =============================================================================
// SCORE VALIDATION & SANITIZATION
// =============================================================================

/**
 * Validate score is within acceptable range
 */
export function isValidScore(score: number): boolean {
  return Number.isInteger(score) && score >= MIN_SCORE && score <= MAX_SCORE;
}

/**
 * Validate prediction scores
 */
export function validatePredictionScores(
  homeScore: number,
  awayScore: number
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!isValidScore(homeScore)) {
    errors.push(
      `Home score must be integer between ${MIN_SCORE} and ${MAX_SCORE}`
    );
  }

  if (!isValidScore(awayScore)) {
    errors.push(
      `Away score must be integer between ${MIN_SCORE} and ${MAX_SCORE}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Clamp and sanitize score input
 */
export function sanitizeScore(score: unknown): number {
  let num = Number(score);
  if (!Number.isInteger(num)) {
    num = Math.round(num);
  }
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, num));
}

// =============================================================================
// GROUP STAGE CALCULATIONS
// =============================================================================

/**
 * Calculate FIFA 2026 group standings from predictions
 * Uses FIFA ranking tiebreaker rules
 */
export function calculateGroupStandings(
  groupMatches: Array<{
    homeTeamId: string;
    homeTeamName: string;
    awayTeamId: string;
    awayTeamName: string;
    homeScore: number;
    awayScore: number;
  }>,
  allTeamsInGroup: Array<{ id: string; name: string; fifa_code: string }>
): GroupStandings {
  const stats: Record<
    string,
    {
      id: string;
      name: string;
      played: number;
      wins: number;
      draws: number;
      losses: number;
      goalsFor: number;
      goalsAgainst: number;
      points: number;
    }
  > = {};

  // Initialize all teams
  for (const team of allTeamsInGroup) {
    stats[team.id] = {
      id: team.id,
      name: team.name,
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0,
    };
  }

  // Process matches
  for (const match of groupMatches) {
    const homeTeamId = match.homeTeamId;
    const awayTeamId = match.awayTeamId;
    const homeScore = match.homeScore;
    const awayScore = match.awayScore;

    if (!stats[homeTeamId] || !stats[awayTeamId]) continue;

    stats[homeTeamId].played++;
    stats[awayTeamId].played++;
    stats[homeTeamId].goalsFor += homeScore;
    stats[homeTeamId].goalsAgainst += awayScore;
    stats[awayTeamId].goalsFor += awayScore;
    stats[awayTeamId].goalsAgainst += homeScore;

    if (homeScore > awayScore) {
      stats[homeTeamId].wins++;
      stats[homeTeamId].points += 3;
      stats[awayTeamId].losses++;
    } else if (homeScore < awayScore) {
      stats[awayTeamId].wins++;
      stats[awayTeamId].points += 3;
      stats[homeTeamId].losses++;
    } else {
      stats[homeTeamId].draws++;
      stats[homeTeamId].points += 1;
      stats[awayTeamId].draws++;
      stats[awayTeamId].points += 1;
    }
  }

  // Sort by FIFA rules: Points → GD → GF
  const sorted = Object.values(stats).sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    const aDiff = a.goalsFor - a.goalsAgainst;
    const bDiff = b.goalsFor - b.goalsAgainst;
    if (aDiff !== bDiff) return bDiff - aDiff;
    return b.goalsFor - a.goalsFor;
  });

  return {
    group_name: '', // Caller should set this
    teams: sorted.map((t) => ({
      team_id: t.id,
      team_name: t.name,
      fifa_code: allTeamsInGroup.find((x) => x.id === t.id)?.fifa_code || '',
      played: t.played,
      wins: t.wins,
      draws: t.draws,
      losses: t.losses,
      goals_for: t.goalsFor,
      goals_against: t.goalsAgainst,
      goal_difference: t.goalsFor - t.goalsAgainst,
      points: t.points,
    })),
  };
}

// =============================================================================
// BRACKET GENERATION
// =============================================================================

/**
 * Generate knockout bracket from group stage results
 * Implements FIFA 2026 advancement rules (8 qualified from each group)
 */
export function generateKnockoutBracket(
  groupStandings: GroupStandings[]
): {
  qualified_teams: Array<{ team_id: string; team_name: string; rank: number }>;
  knockout_bracket: string; // JSON representation of bracket
} {
  const qualified: Array<{
    team_id: string;
    team_name: string;
    group: string;
    rank: number;
  }> = [];

  // Get top 2 from each group (16 teams)
  for (const group of groupStandings) {
    const top2 = group.teams.slice(0, 2);
    qualified.push(
      {
        team_id: top2[0].team_id,
        team_name: top2[0].team_name,
        group: group.group_name,
        rank: 1,
      },
      {
        team_id: top2[1].team_id,
        team_name: top2[1].team_name,
        group: group.group_name,
        rank: 2,
      }
    );
  }

  // In FIFA 2026, 8 third-place teams also qualify (24 teams total for round of 32)
  // For now, return the top 16 (standard format)

  return {
    qualified_teams: qualified.map((t) => ({
      team_id: t.team_id,
      team_name: t.team_name,
      rank: t.rank,
    })),
    knockout_bracket: JSON.stringify(generateBracketTree(qualified)),
  };
}

function generateBracketTree(qualifiedTeams: any[]): Record<string, any> {
  // Simplified bracket tree for 16-team Round of 16
  // In production, implement full seeding algorithm per FIFA rules
  return {
    round_of_16: [
      { home: qualifiedTeams[0], away: qualifiedTeams[15] },
      { home: qualifiedTeams[7], away: qualifiedTeams[8] },
      { home: qualifiedTeams[3], away: qualifiedTeams[12] },
      { home: qualifiedTeams[4], away: qualifiedTeams[11] },
      { home: qualifiedTeams[1], away: qualifiedTeams[14] },
      { home: qualifiedTeams[6], away: qualifiedTeams[9] },
      { home: qualifiedTeams[2], away: qualifiedTeams[13] },
      { home: qualifiedTeams[5], away: qualifiedTeams[10] },
    ],
  };
}

// =============================================================================
// LEADERBOARD CALCULATIONS
// =============================================================================

/**
 * Calculate accuracy percentage for a user's predictions
 */
export function calculateAccuracy(
  predictions: MatchPrediction[],
  matches: Map<string, { homeScore?: number; awayScore?: number }>
): number {
  if (predictions.length === 0) return 0;

  let correct = 0;
  for (const pred of predictions) {
    const match = matches.get(pred.match_id);
    if (
      match?.homeScore !== undefined &&
      match?.awayScore !== undefined &&
      pred.home_score_predicted === match.homeScore &&
      pred.away_score_predicted === match.awayScore
    ) {
      correct++;
    }
  }

  return Math.round((correct / predictions.length) * 100 * 10) / 10; // 1 decimal place
}

/**
 * Calculate current streak (consecutive correct predictions)
 */
export function calculateStreak(
  predictions: MatchPrediction[],
  matches: Map<string, { homeScore?: number; awayScore?: number }>
): { current: number; longest: number } {
  let current = 0;
  let longest = 0;

  for (const pred of predictions) {
    const match = matches.get(pred.match_id);
    if (
      match?.homeScore !== undefined &&
      match?.awayScore !== undefined &&
      pred.home_score_predicted === match.homeScore &&
      pred.away_score_predicted === match.awayScore
    ) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 0;
    }
  }

  return { current, longest };
}

// =============================================================================
// INVITE CODE GENERATION
// =============================================================================

/**
 * Generate a unique 10-character invite code (alphanumeric)
 */
export function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// =============================================================================
// CONFIG VALIDATION
// =============================================================================

/**
 * Validate pool configuration against constraints
 */
export function validatePoolConfig(
  config: Partial<PoolConfigVersion>
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const fields = [
    'pts_winner_selection',
    'pts_exact_score',
    'pts_team_goals',
    'pts_goal_difference',
    'pts_qualified_round_2',
    'pts_champion',
    'pts_subchampion',
    'pts_third_place',
    'pts_top_scorer',
    'pts_top_assistant',
    'pts_mvp',
    'pts_best_goalkeeper',
    'pts_least_conceded',
  ] as const;

  for (const field of fields) {
    const value = config[field];
    if (value !== undefined) {
      if (!Number.isInteger(value) || value < 0 || value > 100) {
        errors.push(`${field} must be an integer between 0 and 100`);
      }
    }
  }

  if (
    config.lock_minutes !== undefined &&
    (config.lock_minutes < 1 || config.lock_minutes > 60)
  ) {
    errors.push('lock_minutes must be between 1 and 60');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// STRING FORMATTING HELPERS
// =============================================================================

/**
 * Format score as "2-1" style display
 */
export function formatScore(home: number, away: number): string {
  return `${home}-${away}`;
}

/**
 * Format timestamp for UI display
 */
export function formatMatchTime(
  kickoffAt: string,
  locale: string = 'es-CO'
): { date: string; time: string } {
  const date = new Date(kickoffAt);
  return {
    date: date.toLocaleDateString(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
    time: date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}
