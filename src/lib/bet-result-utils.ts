export type AccuracyLevel = 'exact' | 'partial' | 'none'

export interface PredictionDetails {
  exactScore: boolean
  winnerCorrect: boolean
  homeGoalsCorrect: boolean
  awayGoalsCorrect: boolean
  goalDiffCorrect: boolean
}

export interface PredictionEvaluation {
  accuracy: AccuracyLevel
  details: PredictionDetails
}

export function evaluatePrediction(
  predicted: { home: number; away: number },
  actual: { home: number; away: number }
): PredictionEvaluation {
  const exactScore = predicted.home === actual.home && predicted.away === actual.away

  const predDiff = predicted.home - predicted.away
  const actualDiff = actual.home - actual.away
  const predWinner = predDiff > 0 ? 'home' : predDiff < 0 ? 'away' : 'draw'
  const actualWinner = actualDiff > 0 ? 'home' : actualDiff < 0 ? 'away' : 'draw'
  const winnerCorrect = predWinner === actualWinner

  const homeGoalsCorrect = predicted.home === actual.home
  const awayGoalsCorrect = predicted.away === actual.away
  const goalDiffCorrect = predDiff === actualDiff

  const details: PredictionDetails = { exactScore, winnerCorrect, homeGoalsCorrect, awayGoalsCorrect, goalDiffCorrect }

  let accuracy: AccuracyLevel
  if (exactScore) {
    accuracy = 'exact'
  } else if (winnerCorrect || homeGoalsCorrect || awayGoalsCorrect || goalDiffCorrect) {
    accuracy = 'partial'
  } else {
    accuracy = 'none'
  }

  return { accuracy, details }
}

export interface AccuracyTheme {
  points: string
}

export const ACCURACY_THEMES: Record<AccuracyLevel, AccuracyTheme> = {
  exact: {
    points: 'text-emerald-400',
  },
  partial: {
    points: 'text-amber-400',
  },
  none: {
    points: 'text-red-400',
  },
}
