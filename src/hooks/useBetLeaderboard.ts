'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export interface LeaderboardEntry {
  rank: number
  user_id: string
  user_email?: string
  name: string
  points_total: number
}

interface UseBetLeaderboardParams {
  mode?: 'global' | 'pool'
  poolId?: string
  tournamentId?: string
  limit?: number
  offset?: number
  realtime?: boolean
}

interface UseBetLeaderboardReturn {
  entries: LeaderboardEntry[]
  totalCount: number
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBetLeaderboard({
  mode = 'global',
  poolId,
  tournamentId,
  limit = 100,
  offset = 0,
  realtime = true,
}: UseBetLeaderboardParams = {}): UseBetLeaderboardReturn {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchLeaderboard = useCallback(async () => {
    if (mode === 'pool' && !poolId) {
      setError('Pool ID is required for pool mode')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('mode', mode)
      if (poolId) params.append('pool_id', poolId)
      if (tournamentId) params.append('tournament_id', tournamentId)
      params.append('limit', String(limit))
      params.append('offset', String(offset))

      const response = await fetch(
        `/api/v1/bet/leaderboard?${params.toString()}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard')
      }

      const data = await response.json()
      if (data.success) {
        setEntries(data.data?.entries || [])
        setTotalCount(data.data?.total_count || 0)
      } else {
        throw new Error(data.error?.message || 'Unknown error')
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error fetching leaderboard:', err)
    } finally {
      setLoading(false)
    }
  }, [mode, poolId, tournamentId, limit, offset])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

  // Real-time subscription
  useEffect(() => {
    if (!realtime) return

    const channelName = `bet_scores:${mode}:${poolId || 'global'}`

    const existingChannels = supabase
      .getChannels()
      .filter((ch) => ch.topic === `realtime:${channelName}`)

    existingChannels.forEach((ch) => {
      supabase.removeChannel(ch)
    })

    const filter: Record<string, string> = {
      mode: `eq.${mode}`,
    }
    if (poolId) {
      filter.pool_id = `eq.${poolId}`
    } else {
      filter.pool_id = 'is.null'
    }

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bet_scores_aggregate',
          filter: Object.entries(filter)
            .map(([k, v]) => `${k}=${v}`)
            .join(' and '),
        },
        () => {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => {
            fetchLeaderboard()
          }, 500)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [realtime, mode, poolId, fetchLeaderboard])

  return {
    entries,
    totalCount,
    loading,
    error,
    refetch: fetchLeaderboard,
  }
}
