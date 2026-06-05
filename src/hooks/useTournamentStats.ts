'use client'

import { useEffect, useState, useCallback } from 'react'
import { TournamentStats } from '@/types/bet'

const DEFAULT_STATS: TournamentStats = {
  total_teams: 32,
  total_groups: 8,
  group_stage_matches: 48,
  knockout_stage_matches: 16,
  matches_completed: 0,
  completion_percentage: 0,
}

interface UseTournamentStatsReturn {
  stats: TournamentStats
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useTournamentStats(
  slug = 'fifa-2026'
): UseTournamentStatsReturn {
  const [stats, setStats] = useState<TournamentStats>(DEFAULT_STATS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(
        `/api/v1/bet/tournaments/${encodeURIComponent(slug)}/stats`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch tournament stats')
      }

      const result = await response.json()
      if (result.success) {
        setStats(result.data.stats)
      } else {
        throw new Error(result.error?.message || 'Unknown error')
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error fetching tournament stats:', err)
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  }
}
