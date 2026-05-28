/**
 * Hook personalizado para gestionar predicciones de fútbol
 * Integra con los endpoints de API: GET/POST /api/v1/bet/predictions
 */

'use client'

import { useState, useCallback } from 'react'
import { useAuth } from './useAuth'
import { MatchPrediction } from '@/types/bet'

interface UseBetPredictionsReturn {
  loading: boolean
  error: string | null
  predictions: Map<string, MatchPrediction>
  createOrUpdatePrediction: (
    matchId: string,
    homeScore: number,
    awayScore: number,
    poolId?: string
  ) => Promise<void>
  getPrediction: (matchId: string) => MatchPrediction | undefined
}

export function useBetPredictions(): UseBetPredictionsReturn {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<Map<string, MatchPrediction>>(
    new Map()
  )

  const createOrUpdatePrediction = useCallback(
    async (
      matchId: string,
      homeScore: number,
      awayScore: number,
      poolId?: string
    ) => {
      if (!user) {
        setError('User not authenticated')
        return
      }

      setLoading(true)
      setError(null)

      try {
        // Get current user's session token
        const { data: authData } = await (
          await import('@/lib/supabase')
        ).supabase.auth.getSession()
        const token = authData?.session?.access_token

        if (!token) {
          throw new Error('No authentication token available')
        }

        const response = await fetch('/api/v1/bet/predictions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            match_id: matchId,
            home_score_predicted: homeScore,
            away_score_predicted: awayScore,
            ...(poolId && { pool_id: poolId }),
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(
            errorData.error?.message || 'Failed to save prediction'
          )
        }

        const data = await response.json()
        if (data.success) {
          // Update local state
          setPredictions((prev) => {
            const updated = new Map(prev)
            updated.set(matchId, data.data)
            return updated
          })
        } else {
          throw new Error(data.error?.message || 'Unknown error')
        }
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An error occurred'
        setError(errorMessage)
        console.error('Error saving prediction:', err)
      } finally {
        setLoading(false)
      }
    },
    [user]
  )

  const getPrediction = useCallback(
    (matchId: string) => predictions.get(matchId),
    [predictions]
  )

  return {
    loading,
    error,
    predictions,
    createOrUpdatePrediction,
    getPrediction,
  }
}
