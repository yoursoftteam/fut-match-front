/**
 * Hook personalizado para gestionar predicciones de fútbol
 * Integra con los endpoints de API: GET/POST /api/v1/bet/predictions
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { MatchPrediction } from '@/types/bet'

interface UseBetPredictionsReturn {
  loading: boolean
  error: string | null
  predictions: Map<string, MatchPrediction>
  poolId: string | null
  fetchPredictions: (poolId?: string) => Promise<void>
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
  const [poolId, setPoolId] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<Map<string, MatchPrediction>>(
    new Map()
  )
  const activeRequestRef = useRef(0)

  const fetchPredictions = useCallback(
    async (targetPoolId?: string) => {
      const activePoolId = targetPoolId ?? poolId
      if (!user) return

      const requestId = ++activeRequestRef.current
      setLoading(true)
      setError(null)

      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: authData } = await supabase.auth.getSession()
        const token = authData?.session?.access_token
        if (!token) {
          setError('No se encontró sesión activa')
          setLoading(false)
          return
        }

        const url = activePoolId
          ? `/api/v1/bet/predictions?pool_id=${activePoolId}`
          : '/api/v1/bet/predictions'

        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (requestId !== activeRequestRef.current) return

        if (!response.ok) {
          const errBody = await response.text().catch(() => '')
          setError(`Error al cargar predicciones: ${response.status} ${errBody.slice(0, 200)}`)
          console.error('GET predictions failed:', response.status, errBody)
          return
        }

        const result = await response.json()
        if (requestId !== activeRequestRef.current) return

        if (result.success && Array.isArray(result.data)) {
          const map = new Map<string, MatchPrediction>()
          for (const pred of result.data) {
            map.set(pred.match_id, pred)
          }
          setPredictions(map)
          if (targetPoolId) setPoolId(targetPoolId)
        } else {
          setError(result.error?.message ?? 'Error al cargar predicciones')
        }
      } catch (err) {
        if (requestId !== activeRequestRef.current) return
        const msg = err instanceof Error ? err.message : 'Error desconocido'
        setError(msg)
        console.error('Error fetching predictions:', err)
      } finally {
        if (requestId === activeRequestRef.current) {
          setLoading(false)
        }
      }
    },
    [user, poolId]
  )

  const createOrUpdatePrediction = useCallback(
    async (
      matchId: string,
      homeScore: number,
      awayScore: number,
      targetPoolId?: string
    ) => {
      const activePoolId = targetPoolId ?? poolId
      if (!user) {
        setError('User not authenticated')
        return
      }

      setLoading(true)
      setError(null)

      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: authData } = await supabase.auth.getSession()
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
            ...(activePoolId && { pool_id: activePoolId }),
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
    [user, poolId]
  )

  const getPrediction = useCallback(
    (matchId: string) => predictions.get(matchId),
    [predictions]
  )

  return {
    loading,
    error,
    predictions,
    poolId,
    fetchPredictions,
    createOrUpdatePrediction,
    getPrediction,
  }
}
