'use client'

import { useAuth } from '@/hooks/useAuth'
import { useMatches } from '@/hooks/useMatches'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

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
        <section className="mb-12">
          <div className="text-center">
            <h1 className="text-4xl font-heading font-bold text-foreground mb-4">
              ¡Bienvenido a tu Dashboard!
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Gestiona tus partidos, crea nuevos cotejos y conecta con otros futbolistas.
            </p>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-12">
          <h2 className="text-2xl font-heading font-bold text-foreground mb-6">
            Acciones Rápidas
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/create"
              className="card p-6 text-center hover:shadow-lg transition-shadow group"
            >
              <span className="text-4xl mb-4 block">⚽</span>
              <h3 className="text-xl font-semibold text-card-foreground mb-2 group-hover:text-primary transition-colors">
                Crear Partido
              </h3>
              <p className="text-muted-foreground">
                Organiza un nuevo cotejo con tus amigos
              </p>
            </Link>

            <div className="card p-6 text-center opacity-50 cursor-not-allowed">
              <span className="text-4xl mb-4 block">🏆</span>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">
                Crear Torneo
              </h3>
              <p className="text-muted-foreground">
                Próximamente disponible
              </p>
            </div>

            <div className="card p-6 text-center opacity-50 cursor-not-allowed">
              <span className="text-4xl mb-4 block">📍</span>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">
                Buscar Canchas
              </h3>
              <p className="text-muted-foreground">
                Próximamente disponible
              </p>
            </div>
          </div>
        </section>

        {/* Recent Matches */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-heading font-bold text-foreground">
              Partidos Recientes
            </h2>
            <Link
              href="/matches"
              className="text-primary hover:text-primary/80 transition-colors font-medium"
            >
              Ver todos →
            </Link>
          </div>

          {matchesLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Cargando partidos…</p>
            </div>
          ) : matches.length === 0 ? (
            <div className="card p-8 text-center">
              <span className="text-4xl mb-4 block">📅</span>
              <h3 className="text-xl font-semibold text-card-foreground mb-2">
                No hay partidos aún
              </h3>
              <p className="text-muted-foreground mb-4">
                ¡Crea tu primer partido para empezar!
              </p>
              <Link
                href="/create"
                className="btn-primary-fm px-6 py-2 inline-block"
              >
                Crear Primer Partido
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matches.slice(0, 6).map((match) => {
                const registeredCount = registrationCounts[match.id] || 0
                const isFull = registeredCount >= match.max_players
                return (
                  <div key={match.id} className="card p-6 relative">
                    {isFull && (
                      <div className="absolute top-3 right-3 bg-red-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                        ¡Completo!
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-card-foreground mb-2 pr-16">
                      {match.title}
                    </h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <p>📍 {match.location}</p>
                      <p>👥 {registeredCount}/{match.max_players} jugadores</p>
                      <p>📅 {new Date(match.date).toLocaleDateString('es-ES')}</p>
                    </div>
                    {isFull && (
                      <p className="mt-3 text-xs text-red-400 font-medium">
                        Todos los jugadores ya están registrados
                      </p>
                    )}
                    <Link
                      href={`/match/${match.id}`}
                      className="mt-4 btn-primary-fm px-4 py-2 text-sm inline-block text-center w-full"
                    >
                      Ver Detalles
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