'use client'

import { useState, useCallback, useRef } from 'react'
import { useAuth } from './useAuth'
import { TournamentPrediction, TournamentCategory } from '@/types/bet'

interface UseTournamentPredictionsReturn {
  loading: boolean
  saving: boolean
  error: string | null
  predictions: TournamentPrediction[]
  fetchPredictions: (poolId: string) => Promise<void>
  savePrediction: (poolId: string, category: TournamentCategory, teamId: string) => Promise<void>
  getPrediction: (category: TournamentCategory) => TournamentPrediction | undefined
}

export function useTournamentPredictions(): UseTournamentPredictionsReturn {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [predictions, setPredictions] = useState<TournamentPrediction[]>([])
  const activeRequestRef = useRef(0)

  const fetchPredictions = useCallback(async (poolId: string) => {
    if (!user) return

    const requestId = ++activeRequestRef.current
    setLoading(true)
    setError(null)

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: authData } = await supabase.auth.getSession()
      const token = authData?.session?.access_token
      if (!token) { setLoading(false); return }

      const response = await fetch(`/api/v1/bet/tournament-predictions?pool_id=${poolId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (requestId !== activeRequestRef.current) return
      if (!response.ok) { setLoading(false); return }

      const result = await response.json()
      if (requestId !== activeRequestRef.current) return

      if (result.success && Array.isArray(result.data)) {
        setPredictions(result.data)
      }
    } catch (err) {
      if (requestId !== activeRequestRef.current) return
      console.error('Error fetching tournament predictions:', err)
    } finally {
      if (requestId === activeRequestRef.current) setLoading(false)
    }
  }, [user])

  const savePrediction = useCallback(async (poolId: string, category: TournamentCategory, teamId: string) => {
    if (!user) return

    setSaving(true)
    setError(null)

    try {
      const { supabase } = await import('@/lib/supabase')
      const { data: authData } = await supabase.auth.getSession()
      const token = authData?.session?.access_token
      if (!token) { setSaving(false); return }

      const response = await fetch('/api/v1/bet/tournament-predictions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pool_id: poolId, category, team_id: teamId }),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => null)
        throw new Error(errData?.error?.message || 'Failed to save tournament prediction')
      }

      const result = await response.json()
      if (result.success) {
        setPredictions((prev) => {
          const filtered = prev.filter((p) => p.category !== category)
          return [...filtered, result.data]
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error desconocido'
      setError(msg)
      console.error('Error saving tournament prediction:', err)
    } finally {
      setSaving(false)
    }
  }, [user])

  const getPrediction = useCallback(
    (category: TournamentCategory) => predictions.find((p) => p.category === category),
    [predictions]
  )

  return {
    loading,
    saving,
    error,
    predictions,
    fetchPredictions,
    savePrediction,
    getPrediction,
  }
}
