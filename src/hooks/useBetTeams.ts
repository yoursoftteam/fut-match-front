/**
 * Hook personalizado para obtener equipos de fútbol
 * Integra con el endpoint GET /api/v1/bet/teams
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { Team } from '@/types/bet'

interface UseBetTeamsParams {
  tournamentId?: string
}

interface UseBetTeamsReturn {
  teams: Team[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useBetTeams({
  tournamentId,
}: UseBetTeamsParams = {}): UseBetTeamsReturn {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTeams = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      if (tournamentId) params.append('tournament_id', tournamentId)

      const response = await fetch(
        `/api/v1/bet/teams${params.toString() ? '?' + params.toString() : ''}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch teams')
      }

      const data = await response.json()
      if (data.success) {
        setTeams(data.data || [])
      } else {
        throw new Error(data.error?.message || 'Unknown error')
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      console.error('Error fetching teams:', err)
    } finally {
      setLoading(false)
    }
  }, [tournamentId])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  return {
    teams,
    loading,
    error,
    refetch: fetchTeams,
  }
}
