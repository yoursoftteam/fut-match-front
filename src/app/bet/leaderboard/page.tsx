/**
 * Página de Leaderboard - Clasificaciones Globales
 * Muestra las mejores puntuaciones
 */

'use client'

import { useState, useEffect } from 'react'
import { LeaderboardTable } from '@/components/bet/LeaderboardTable'
import { useBetLeaderboard } from '@/hooks/useBetLeaderboard'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import Link from 'next/link'

const FIFA_TOURNAMENT_SLUG = 'fifa-2026'

interface TransformedScoreRow {
  user_id: string
  name: string
  points_total: number
  rank: number
  completion_percent: number
}

export default function BetLeaderboardPage() {
  const { user, loading: authLoading } = useAuth()
  const [tournamentId, setTournamentId] = useState<string>('')
  const [mode, setMode] = useState<'global' | 'pool'>('global')

  // Get leaderboard from hook
  const { entries, totalCount, loading, error } = useBetLeaderboard({
    mode,
    tournamentId,
    limit: 100,
  })

  useEffect(() => {
    let cancelled = false

    async function loadTournamentId() {
      if (tournamentId) return

      const response = await fetch(
        `/api/v1/bet/tournaments?slug=${FIFA_TOURNAMENT_SLUG}`
      )
      const data = await response.json().catch(() => null)

      if (!cancelled && response.ok && data?.success && data?.data?.id) {
        setTournamentId(data.data.id)
      }
    }

    loadTournamentId()

    return () => {
      cancelled = true
    }
  }, [tournamentId])

  // Transform entries to match LeaderboardTable interface
  const transformedEntries: TransformedScoreRow[] = entries.map((entry) => ({
    user_id: entry.user_id,
    name: entry.name,
    points_total: entry.points_total,
    rank: entry.rank,
    completion_percent: 0,
  }))

  return (
    <div className="min-h-screen bg-background py-6 px-4 md:py-12 md:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            🏆 Clasificaciones FIFA 2026
          </h1>
          <p className="text-muted-foreground">
            Compite con otros jugadores y sube en el ranking
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-lg text-destructive">
            {error}
          </div>
        )}

        {/* Tabs */}
        <Tabs
          value={mode}
          onValueChange={(value) => setMode(value as 'global' | 'pool')}
          className="mb-8"
        >
          <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger value="global">Global</TabsTrigger>
            <TabsTrigger value="pool" disabled>
              Pollas
            </TabsTrigger>
          </TabsList>

          {/* Global Leaderboard */}
          <TabsContent value="global" className="space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-r-transparent mx-auto mb-4"></div>
                <p className="text-muted-foreground">Cargando clasificaciones...</p>
              </div>
            ) : (
              <>
                <Card className="p-6 bg-gradient-to-r from-primary/10 to-accent/10 border-primary/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-muted-foreground text-sm">Total de Jugadores</p>
                      <p className="text-2xl font-bold text-foreground">
                        {totalCount.toLocaleString()}
                      </p>
                    </div>
                    {user && transformedEntries.length > 0 && (
                      <div className="text-right">
                        <p className="text-muted-foreground text-sm">Tu Posición</p>
                        <p className="text-2xl font-bold text-primary">
                          #{' '}
                          {transformedEntries.find((e) => e.user_id === user.id)
                            ?.rank || 'N/A'}
                        </p>
                      </div>
                    )}
                  </div>
                </Card>

                <LeaderboardTable
                  scores={transformedEntries}
                  mode="global"
                  currentUserId={user?.id}
                />
              </>
            )}
          </TabsContent>

           {/* Pool Leaderboard */}
           <TabsContent value="pool" className="space-y-6">
             <Card className="p-6 text-center">
                <p className="text-muted-foreground">
                  Selecciona una polla para ver su clasificación
                </p>
                <Link href="/bet/pools" className="block mt-4">
                  <Button className="mt-4">Ver Pollas</Button>
                </Link>
              </Card>
            </TabsContent>
        </Tabs>

        {/* Top 3 Podium */}
        {!loading && transformedEntries.length >= 3 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-foreground mb-6">🥇 Podio</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 2nd Place */}
              {transformedEntries[1] && (
                <Card className="p-6 text-center border-accent/30 bg-accent/5 order-2 md:order-1">
                  <div className="text-4xl mb-2">🥈</div>
                  <p className="text-card-foreground font-semibold mb-2">
                    {transformedEntries[1].name}
                  </p>
                  <p className="text-2xl font-bold text-accent">
                    {transformedEntries[1].points_total}pts
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {transformedEntries[1].completion_percent}% precis.
                  </p>
                </Card>
              )}

              {/* 1st Place */}
              {transformedEntries[0] && (
                <Card className="p-6 text-center border-primary/30 bg-primary/5 order-1 md:order-2 md:scale-105">
                  <div className="text-5xl mb-2">🥇</div>
                  <p className="text-foreground font-bold mb-2 text-lg">
                    {transformedEntries[0].name}
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {transformedEntries[0].points_total}pts
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {transformedEntries[0].completion_percent}% precis.
                  </p>
                </Card>
              )}

              {/* 3rd Place */}
              {transformedEntries[2] && (
                <Card className="p-6 text-center border-yellow-500/30 bg-yellow-500/5 order-3 md:order-3">
                  <div className="text-4xl mb-2">🥉</div>
                  <p className="text-card-foreground font-semibold mb-2">
                    {transformedEntries[2].name}
                  </p>
                  <p className="text-2xl font-bold text-yellow-400">
                    {transformedEntries[2].points_total}pts
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {transformedEntries[2].completion_percent}% precis.
                  </p>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* Info Footer */}
        <div className="mt-12 p-6 bg-muted/30 rounded-lg border border-border">
          <h3 className="font-semibold text-card-foreground mb-2">
            ℹ️ Cómo funcionan los puntos
          </h3>
          <p className="text-muted-foreground text-sm mb-3">
            Los puntos se calculan basándose en qué tan precisas son tus predicciones:
          </p>
          <ul className="space-y-1 text-muted-foreground text-sm">
            <li>
              • <strong>Resultado exacto:</strong> 10 puntos (ej: 2-1)
            </li>
            <li>
              • <strong>Ganador correcto:</strong> 5 puntos (acertaste quién gana pero el marcador fue diferente)
            </li>
            <li>
              • <strong>Goles correctos:</strong> 2 puntos por cada equipo (acertaste los goles de un equipo)
            </li>
            <li>
              • <strong>Fase eliminatoria:</strong> Los puntos se duplican en playoffs
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
