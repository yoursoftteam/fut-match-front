/**
 * Hook personalizado para obtener matches de fútbol
 * Integra con el endpoint GET /api/v1/bet/matches
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Match, MatchStage } from '@/types/bet'

interface UseBetMatchesParams {
  tournamentId?: string
  stage?: MatchStage
  groupName?: string
  status?: 'scheduled' | 'live' | 'finished'
}

interface UseBetMatchesReturn {
  matches: Match[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBetMatches({
  tournamentId,
  stage,
  groupName,
  status,
}: UseBetMatchesParams = {}): UseBetMatchesReturn {
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMatches = useCallback(async () => {
    if (!tournamentId) {
      setLoading(true)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.append('tournament_id', tournamentId)
      if (stage) params.append('stage', stage)
      if (groupName) params.append('group_name', groupName)
      if (status) params.append('status', status)

      const response = await fetch(
        `/api/v1/bet/matches?${params.toString()}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch matches')
      }

      const data = await response.json()
      if (data.success) {
        setMatches(data.data || [])
      } else {
        throw new Error(data.error?.message || 'Unknown error')
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error fetching matches:', err)
    } finally {
      setLoading(false)
    }
  }, [tournamentId, stage, groupName, status])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  return {
    matches,
    loading,
    error,
    refetch: fetchMatches,
  }
}
