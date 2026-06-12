import { Match, MatchStage } from '@/types/bet'

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff
    return (s >>> 0) / 0xffffffff
  }
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

function pickWeighted<T>(rng: () => number, items: Array<{ value: T; weight: number }>): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0)
  let roll = rng() * totalWeight
  for (const item of items) {
    roll -= item.weight
    if (roll <= 0) return item.value
  }
  return items[items.length - 1].value
}

function generateGroupScore(rng: () => number): { homeScore: number; awayScore: number } {
  const homeScore = pickWeighted(rng, [
    { value: 0, weight: 15 },
    { value: 1, weight: 30 },
    { value: 2, weight: 30 },
    { value: 3, weight: 15 },
    { value: 4, weight: 8 },
    { value: 5, weight: 2 },
  ])
  const awayScore = pickWeighted(rng, [
    { value: 0, weight: 30 },
    { value: 1, weight: 35 },
    { value: 2, weight: 20 },
    { value: 3, weight: 10 },
    { value: 4, weight: 4 },
    { value: 5, weight: 1 },
  ])
  return { homeScore, awayScore }
}

function generateKnockoutScore(rng: () => number): { homeScore: number; awayScore: number } {
  const isDraw = rng() < 0.25

  if (isDraw) {
    const drawScore = pickWeighted(rng, [
      { value: 0, weight: 20 },
      { value: 1, weight: 50 },
      { value: 2, weight: 25 },
      { value: 3, weight: 5 },
    ])
    return { homeScore: drawScore, awayScore: drawScore }
  }

  const homeScore = pickWeighted(rng, [
    { value: 0, weight: 10 },
    { value: 1, weight: 40 },
    { value: 2, weight: 35 },
    { value: 3, weight: 12 },
    { value: 4, weight: 3 },
  ])
  const awayScore = pickWeighted(rng, [
    { value: 0, weight: 40 },
    { value: 1, weight: 35 },
    { value: 2, weight: 18 },
    { value: 3, weight: 5 },
    { value: 4, weight: 2 },
  ])

  if (homeScore === awayScore) {
    return { homeScore: homeScore + 1, awayScore }
  }

  return { homeScore, awayScore }
}

export function simulateMatchResult(match: Match): { homeScore: number; awayScore: number } | null {
  if (match.status === 'finished') return null
  if (new Date(match.kickoff_at) > new Date()) return null

  const seed = hashString(match.id)
  const rng = seededRandom(seed)

  if (match.stage === MatchStage.GROUP_STAGE) {
    return generateGroupScore(rng)
  }

  return generateKnockoutScore(rng)
}
