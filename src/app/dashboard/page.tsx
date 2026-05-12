'use client'


import { useAuth } from '@/hooks/useAuth'
import { useMatches } from '@/hooks/useMatches'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

function getLevelInfo(maxPlayers: number): { label: string; cls: string } {
  if (maxPlayers <= 6)  return { label: 'Casual',  cls: 'level-casual'  }
  if (maxPlayers <= 10) return { label: 'Semi-Pro', cls: 'level-semipro' }
  return                       { label: 'Pro',      cls: 'level-pro'     }
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const { matches, loading: matchesLoading, registrationCounts } = useMatches()
  const router = useRouter()

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
                Arma tu encuentro, gestiona tus encuentros y demuestra tu nivel.
              </p>
            </div>
            <Link
              href="/create"
              className="btn-primary-fm neon-glow px-6 py-3 rounded-lg font-semibold text-sm inline-block text-center shrink-0"
            >
              ⚽ Armar encuentro
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
                ¡Armar encuentro!
              </h3>
              <p className="text-sm text-muted-foreground">
                Nuevo encuentro en 2 minutos
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

        {/* Recent Matches */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-heading font-bold text-foreground">
              Mis Encuentros
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
              <p className="text-muted-foreground">Cargando encuentros…</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="card p-10 text-center">
              <span className="text-4xl mb-4 block" aria-hidden>📅</span>
              <h3 className="text-lg font-semibold text-card-foreground mb-2">
                Ningún encuentro todavía
              </h3>
              <p className="text-muted-foreground mb-5 text-sm">
                La cancha no se llena sola. ¡Arma el primero!
              </p>
              <Link href="/create" className="btn-primary-fm px-6 py-2.5 inline-block rounded-lg font-semibold text-sm">
                ¡Armar ahora!
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 card-grid">
              {matches.slice(0, 6).map((match) => {
                const registeredCount = registrationCounts[match.id] || 0
                const isFull = registeredCount >= match.max_players
                const level = getLevelInfo(match.max_players)
                const spotsLeft = match.max_players - registeredCount
                return (
                  <div key={match.id} className="card match-card p-5 relative">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-2xl" aria-hidden>⚽</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`level-badge ${level.cls}`}>{level.label}</span>
                        {isFull && (
                          <span className="level-badge bg-red-600/15 text-red-400">Completo</span>
                        )}
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
                      {isFull ? 'Ver detalles' : '¡Ver encuentro!'}
                    </Link>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}