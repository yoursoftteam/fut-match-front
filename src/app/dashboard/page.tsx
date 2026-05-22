'use client'


import { useAuth } from '@/hooks/useAuth'
import { useMatches } from '@/hooks/useMatches'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import FrecuentesSection from '@/components/FrecuentesSection'
import SaveFrecuenteButton from '@/components/SaveFrecuenteButton'

function getLevelInfo(maxPlayers: number): { label: string; cls: string } {
  if (maxPlayers <= 6)  return { label: 'Casual',  cls: 'level-casual'  }
  if (maxPlayers <= 10) return { label: 'Semi-Pro', cls: 'level-semipro' }
  return                       { label: 'Pro',      cls: 'level-pro'     }
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const { matches, loading: matchesLoading, registrationCounts, deleteMatch } = useMatches({
    autoFetch: true,
    onlyOwnedByCurrentUser: true,
  })
  const router = useRouter()
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando…</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const handleDeleteMatch = async (matchId: string) => {
    if (!confirm('¿Eliminar este partido? Esta acción no se puede deshacer.')) return

    setDeletingMatchId(matchId)
    setDeleteError(null)

    try {
      const result = await deleteMatch(matchId)
      if (result.error) throw result.error
    } catch {
      setDeleteError('No se pudo eliminar el partido. Intenta nuevamente.')
    } finally {
      setDeletingMatchId(null)
    }
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentMatches = matches.filter((match) => {
    if (!match.created_at) return false
    const createdAt = new Date(match.created_at)
    if (Number.isNaN(createdAt.getTime())) return false
    return createdAt >= sevenDaysAgo
  })

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <section className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-heading font-bold text-foreground mb-1">
                ¿Listo para jugar? ⚡
              </h1>
              <p className="text-muted-foreground">
                Arma tu partido, gestiona tus partidos y demuestra tu nivel.
              </p>
            </div>
            <Link
              href="/create"
              className="btn-primary-fm neon-glow px-6 py-3 rounded-lg font-semibold text-sm inline-block text-center shrink-0"
            >
              ⚽ Armar partido
            </Link>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-12">
          <h2 className="text-lg font-heading font-semibold text-muted-foreground uppercase tracking-wider mb-4">
            Acciones rápidas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 card-grid">
            <Link
              href="/create"
              className="card match-card p-6 text-center group"
            >
              <span className="text-4xl mb-4 block" aria-hidden>⚽</span>
              <h3 className="text-base font-semibold text-card-foreground mb-1 group-hover:text-primary transition-colors">
                ¡Armar partido!
              </h3>
              <p className="text-sm text-muted-foreground">
                Nuevo partido en 2 minutos
              </p>
            </Link>

            <div className="card p-6 text-center opacity-40 cursor-not-allowed select-none">
              <span className="text-4xl mb-4 block" aria-hidden>🏆</span>
              <h3 className="text-base font-semibold text-card-foreground mb-1">Crear Torneo</h3>
              <p className="text-sm text-muted-foreground">Próximamente</p>
            </div>

            <div className="card p-6 text-center opacity-40 cursor-not-allowed select-none">
              <span className="text-4xl mb-4 block" aria-hidden>📍</span>
              <h3 className="text-base font-semibold text-card-foreground mb-1">Buscar Canchas</h3>
              <p className="text-sm text-muted-foreground">Próximamente</p>
            </div>
          </div>
        </section>

        {/* Partidos Frecuentes */}
        <FrecuentesSection />

        {/* Recent Matches */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-heading font-bold text-foreground">
              Mis Partidos
            </h2>
            <Link
              href="/matches"
              className="text-primary hover:text-primary/80 transition-colors text-sm font-semibold"
            >
              Ver todos →
            </Link>
          </div>

          {matchesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando partidos…</p>
            </div>
          ) : recentMatches.length === 0 ? (
            <div className="card p-10 text-center">
              <span className="text-4xl mb-4 block" aria-hidden>📅</span>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                Ningún partido todavía
              </h3>
              <p className="text-muted-foreground mb-5 text-sm">
                No has creado partidos en los últimos 7 días. ¡Arma uno nuevo!
              </p>
              <Link href="/create" className="btn-primary-fm px-6 py-2.5 inline-block rounded-lg font-semibold text-sm">
                ¡Armar ahora!
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 card-grid">
              {recentMatches.slice(0, 6).map((match) => {
                const registeredCount = registrationCounts[match.id] || 0
                const isFull = registeredCount >= match.max_players
                const level = getLevelInfo(match.max_players)
                const spotsLeft = match.max_players - registeredCount
                return (
                  <div key={match.id} className="card match-card p-5 relative">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-2xl shrink-0" aria-hidden>⚽</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`level-badge ${level.cls}`}>{level.label}</span>
                        {isFull && (
                          <span className="level-badge bg-red-600/15 text-red-400">Completo</span>
                        )}
                        <SaveFrecuenteButton
                          location={match.location}
                          playersPerTeam={Math.round(match.max_players / 2)}
                          matchId={match.id}
                        />
                      </div>
                    </div>
                    <h3 className="text-base font-semibold text-card-foreground mb-1 leading-tight">
                      {match.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-3">📍 {match.location}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
                      <span>👥 {registeredCount}/{match.max_players}</span>
                      {!isFull ? (
                        <span className="text-primary font-semibold">{spotsLeft} cupo{spotsLeft !== 1 ? 's' : ''} libre{spotsLeft !== 1 ? 's' : ''}</span>
                      ) : (
                        <span className="text-red-400 font-semibold">Sin cupos</span>
                      )}
                      <span>📅 {new Date(match.date).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}</span>
                    </div>
                    <Link
                      href={`/match/${match.id}`}
                      className="btn-primary-fm px-4 py-2 text-sm inline-block text-center w-full rounded-lg font-semibold"
                    >
                      {isFull ? 'Ver detalles' : '¡Ver partido!'}
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDeleteMatch(match.id)}
                      disabled={deletingMatchId === match.id}
                      className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="size-4" />
                      {deletingMatchId === match.id ? 'Eliminando...' : 'Eliminar partido'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {deleteError && (
            <p className="mt-4 text-sm text-red-400">{deleteError}</p>
          )}
        </section>
      </main>
    </div>
  )
}