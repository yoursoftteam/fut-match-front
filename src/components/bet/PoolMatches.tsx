'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { MatchCard } from './MatchCard'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Match } from '@/types/bet'

interface Prediction {
  id: string
  match_id: string
  home_score_predicted: number
  away_score_predicted: number
  points_earned: number | null
}

interface PoolMatchesProps {
  poolId: string
  tournamentId: string
}

export function PoolMatches({ poolId, tournamentId }: PoolMatchesProps) {
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const saveTimeouts = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    const timeouts = saveTimeouts.current
    return () => {
      for (const id of Object.keys(timeouts)) {
        clearTimeout(timeouts[id])
      }
    }
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data: authData } = await supabase.auth.getSession()
      const token = authData?.session?.access_token
      if (!token) return

      const [matchesRes, predictionsRes] = await Promise.all([
        fetch(`/api/v1/bet/matches?tournament_id=${tournamentId}`),
        fetch(`/api/v1/bet/predictions?pool_id=${poolId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      const [matchesData, predictionsData] = await Promise.all([
        matchesRes.json(),
        predictionsRes.json(),
      ])

      if (matchesData.success) {
        setMatches(matchesData.data)
      }
      if (predictionsData.success) {
        setPredictions(predictionsData.data)
      }
    } catch {
      setError('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }, [poolId, tournamentId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const savePrediction = useCallback(
    async (matchId: string, homeScore: number, awayScore: number) => {
      try {
        const { data: authData } = await supabase.auth.getSession()
        const token = authData?.session?.access_token
        if (!token) return

        const response = await fetch('/api/v1/bet/predictions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            match_id: matchId,
            home_score_predicted: homeScore,
            away_score_predicted: awayScore,
            pool_id: poolId,
          }),
        })

        const result = await response.json()
        if (result.success) {
          setPredictions((prev) => {
            const idx = prev.findIndex((p) => p.match_id === matchId)
            const updated = {
              id: result.data.id,
              match_id: matchId,
              home_score_predicted: homeScore,
              away_score_predicted: awayScore,
              points_earned: null,
            }
            if (idx >= 0) {
              const next = [...prev]
              next[idx] = updated
              return next
            }
            return [...prev, updated]
          })
        }
      } catch {
        /* ignore */
      }
    },
    [poolId]
  )

  const handleUpdatePrediction = useCallback(
    (matchId: string, homeScore: number, awayScore: number) => {
      setPredictions((prev) => {
        const idx = prev.findIndex((p) => p.match_id === matchId)
        const updated = {
          id: prev[idx]?.id ?? '',
          match_id: matchId,
          home_score_predicted: homeScore,
          away_score_predicted: awayScore,
          points_earned: null,
        }
        if (idx >= 0) {
          const next = [...prev]
          next[idx] = updated
          return next
        }
        return [...prev, updated]
      })

      if (saveTimeouts.current[matchId]) {
        clearTimeout(saveTimeouts.current[matchId])
      }
      saveTimeouts.current[matchId] = setTimeout(() => {
        savePrediction(matchId, homeScore, awayScore)
      }, 800)
    },
    [savePrediction]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-3 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-5 animate-spin text-emerald-400" />
        Cargando partidos…
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
        <AlertCircle className="size-4 shrink-0" />
        {error}
      </div>
    )
  }

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
        No hay partidos disponibles para este torneo
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {matches.map((match) => {
        const prediction = predictions.find((p) => p.match_id === match.id)
        const fallbackTeam = (name: string) => ({
          name,
          fifa_code: '---' as const,
          flag_svg_url: '',
        })
        const homeTeam = match.home_team
          ? { ...match.home_team, flag_svg_url: match.home_team.flag_svg_url ?? '' }
          : fallbackTeam(match.home_placeholder ?? 'TBD')
        const awayTeam = match.away_team
          ? { ...match.away_team, flag_svg_url: match.away_team.flag_svg_url ?? '' }
          : fallbackTeam(match.away_placeholder ?? 'TBD')

        return (
          <MatchCard
            key={match.id}
            match={{
              id: match.id,
              home_team: homeTeam,
              away_team: awayTeam,
              kickoff_at: match.kickoff_at,
              stage: match.stage,
              status: match.status,
            }}
            prediction={
              prediction
                ? {
                    home_score_predicted: prediction.home_score_predicted,
                    away_score_predicted: prediction.away_score_predicted,
                  }
                : undefined
            }
            canEdit={match.status === 'scheduled'}
            onUpdatePrediction={(home, away) => handleUpdatePrediction(match.id, home, away)}
            compact
          />
        )
      })}
    </div>
  )
}
