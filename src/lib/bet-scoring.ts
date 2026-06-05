import { PoolConfigVersion } from '@/types/bet'

export type MatchScoringConfig = Pick<
  PoolConfigVersion,
  | 'pts_winner_selection'
  | 'pts_exact_score'
  | 'pts_team_goals'
  | 'pts_goal_difference'
>

export function calculateExactScorePoints(config: MatchScoringConfig): number {
  return (
    config.pts_winner_selection +
    config.pts_exact_score +
    config.pts_team_goals * 2 +
    config.pts_goal_difference
  )
}

export function calculateMatchPredictionPoints(
  config: MatchScoringConfig,
  officialHome: number,
  officialAway: number,
  predictedHome: number,
  predictedAway: number
): number {
  if (officialHome === predictedHome && officialAway === predictedAway) {
    return calculateExactScorePoints(config)
  }

  let points = 0
  const officialOutcome = Math.sign(officialHome - officialAway)
  const predictedOutcome = Math.sign(predictedHome - predictedAway)

  if (officialOutcome === predictedOutcome) {
    points += config.pts_winner_selection
  }

  if (officialHome === predictedHome) {
    points += config.pts_team_goals
  }

  if (officialAway === predictedAway) {
    points += config.pts_team_goals
  }

  if (officialHome - officialAway === predictedHome - predictedAway) {
    points += config.pts_goal_difference
  }

  return points
}
