/**
 * Página de Partidos - FIFA 2026
 * Muestra todos los partidos de grupos con predicciones
 */

'use client'

import { useState, useEffect } from 'react'
import { MatchCard } from '@/components/bet/MatchCard'
import { useBetMatches } from '@/hooks/useBetMatches'
import { useBetPredictions } from '@/hooks/useBetPredictions'
import { useAuth } from '@/hooks/useAuth'
import { MatchStage } from '@/types/bet'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function BetMatchesPage() {
  const { user, loading: authLoading } = useAuth()
  const [tournamentId, setTournamentId] = useState<string>('')
  const [selectedGroup, setSelectedGroup] = useState<string>('A')
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  // Get matches from API
  const { matches, loading: matchesLoading, error: matchesError } = useBetMatches({
    tournamentId,
    stage: MatchStage.GROUP_STAGE,
    groupName: selectedGroup,
  })

  // Get predictions from hook
  const { createOrUpdatePrediction, getPrediction, error: predError } =
    useBetPredictions()

  // In a real app, we'd get tournament ID from database or context
  // For now, using a hardcoded one for testing
  useEffect(() => {
    if (!tournamentId) {
      // This would come from your tournament selector in a real app
      setTournamentId('fifa-2026-tournament-id')
    }
  }, [tournamentId])

  const handleUpdatePrediction = async (
    matchId: string,
    homeScore: number,
    awayScore: number
  ) => {
    setSaving(true)
    setSaveSuccess(null)

    try {
      await createOrUpdatePrediction(matchId, homeScore, awayScore)
      setSaveSuccess(`Predicción guardada para el partido`)
      setTimeout(() => setSaveSuccess(null), 2000)
    } catch (err) {
      console.error('Error updating prediction:', err)
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md p-6">
          <p className="text-center text-slate-300 mb-4">
            Debes iniciar sesión para ver y hacer predicciones
          </p>
          <Button className="w-full" asChild>
            <a href="/auth?mode=signin">Iniciar Sesión</a>
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 py-6 px-4 md:py-12 md:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-slate-50 mb-2">
            FIFA 2026 - Predicciones
          </h1>
          <p className="text-slate-400">
            Haz tus predicciones antes de que cierre el plazo (10 minutos antes de cada partido)
          </p>
        </div>

        {/* Success Message */}
        {saveSuccess && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-emerald-300">
            ✓ {saveSuccess}
          </div>
        )}

        {/* Error Messages */}
        {(matchesError || predError) && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-300">
            {matchesError || predError}
          </div>
        )}

         {/* Group Selector */}
         <div className="mb-8">
           <h2 className="text-lg font-semibold text-slate-200 mb-4">Grupo</h2>
           <div className="flex flex-wrap gap-2">
             {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].map((group) => (
              <button
                key={group}
                onClick={() => setSelectedGroup(group)}
                className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                  selectedGroup === group
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                Grupo {group}
              </button>
            ))}
          </div>
        </div>

        {/* Matches List */}
        <div className="space-y-4">
          {matchesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
              <p className="text-slate-400">Cargando partidos...</p>
            </div>
          ) : matches.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-slate-400">No hay partidos disponibles para este grupo</p>
            </Card>
          ) : (
            matches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                prediction={getPrediction(match.id) as any}
                canEdit={!authLoading && !!user}
                onUpdatePrediction={(homeScore, awayScore) =>
                  handleUpdatePrediction(match.id, homeScore, awayScore)
                }
              />
            ))
          )}
        </div>

        {/* Info Footer */}
        <div className="mt-12 p-6 bg-slate-800/30 rounded-lg border border-slate-700/30">
          <h3 className="font-semibold text-slate-200 mb-2">📋 Sistema de Puntuación</h3>
          <ul className="space-y-1 text-slate-400 text-sm">
            <li>• <strong>Resultado exacto:</strong> 10 puntos</li>
            <li>• <strong>Ganador/Empate:</strong> 5 puntos</li>
            <li>• <strong>Goles locales correctos:</strong> 2 puntos</li>
            <li>• <strong>Goles visitantes correctos:</strong> 2 puntos</li>
            <li>• <strong>Fases eliminatorias:</strong> x2 multiplicador</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
