/**
 * Página Principal de Apuestas - FIFA 2026
 */

'use client'

import { useAuth } from '@/hooks/useAuth'
import { useTournamentStats } from '@/hooks/useTournamentStats'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default function BetPage() {
  const { user, loading } = useAuth()
  const {
    stats,
    loading: statsLoading,
    error: statsError,
  } = useTournamentStats()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 py-12 px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="mb-6 flex flex-col items-center gap-4">
            <img
              src="/mundial_2026.png"
              alt="FIFA World Cup 2026"
              className="w-40 h-40 md:w-52 md:h-52 object-contain drop-shadow-lg"
            />
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">
              FIFA World Cup 2026
            </h1>
          </div>
          <p className="text-xl text-slate-300 mb-2">Predicciones de Fútbol</p>
          <p className="text-slate-400">
            Compite con amigos y demuestra tu expertise en fútbol
          </p>
        </div>

        {/* CTA Buttons (if not authenticated) */}
        {!user && (
          <div className="text-center mb-12">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth?mode=signin">
                <Button size="lg">Iniciar Sesión</Button>
              </Link>
              <Link href="/auth?mode=signup">
                <Button size="lg" variant="outline">Crear Cuenta</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Matches Card */}
          <Card className="group cursor-pointer hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10">
            <Link href="/bet/predictions" className="block p-8 h-full">
              <div className="text-5xl mb-4">🎯</div>
              <h2 className="text-xl font-bold text-slate-50 mb-2 group-hover:text-emerald-400 transition-colors">
                Predicciones
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                Crea competencias solo de marcadores y reta a tu squad
              </p>
              <div className="text-emerald-400 text-sm font-semibold">
                Ver Partidos →
              </div>
            </Link>
          </Card>

          {/* Pools Card */}
          <Card className="group cursor-pointer hover:border-purple-500/50 transition-all hover:shadow-lg hover:shadow-purple-500/10">
            <Link href="/bet/pools" className="block p-8 h-full">
              <div className="text-5xl mb-4">👥</div>
              <h2 className="text-xl font-bold text-slate-50 mb-2 group-hover:text-purple-400 transition-colors">
                Pollas
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                Crea y únete a pollas privadas con amigos
              </p>
              <div className="text-purple-400 text-sm font-semibold">
                Ver Pollas →
              </div>
            </Link>
          </Card>
        </div>

        {/* Tournament Info */}
        <Card className="mb-12 p-8 bg-slate-800/30 border-slate-700/50">
          <h2 className="text-2xl font-bold text-slate-50 mb-4">📊 Copa Mundial FIFA 2026</h2>
          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i}>
                  <div className="h-4 w-20 bg-slate-700/50 rounded animate-pulse mb-2" />
                  <div className="h-8 w-16 bg-slate-700/50 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <p className="text-slate-400 text-sm mb-1">Equipos</p>
                  <p className="text-3xl font-bold text-emerald-400">{stats.total_teams}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Partidos de Grupos</p>
                  <p className="text-3xl font-bold text-blue-400">{stats.group_stage_matches}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Grupos</p>
                  <p className="text-3xl font-bold text-purple-400">{stats.total_groups}</p>
                </div>
                <div>
                  <p className="text-slate-400 text-sm mb-1">Fase Eliminatoria</p>
                  <p className="text-3xl font-bold text-yellow-400">{stats.knockout_stage_matches}</p>
                </div>
              </div>
              <div className="mt-6">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-slate-400">Progreso del torneo</span>
                  <span className="text-slate-300 font-medium">{stats.completion_percentage}%</span>
                </div>
                <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(stats.completion_percentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.matches_completed} de {stats.group_stage_matches + stats.knockout_stage_matches} partidos disputados
                </p>
              </div>
            </>
          )}
          {statsError && (
            <p className="text-xs text-red-400 mt-2">
              No se pudieron cargar las estadísticas en tiempo real
            </p>
          )}
        </Card>

        {/* How it Works */}
        <div className="bg-slate-800/20 rounded-lg border border-slate-700/30 p-8">
          <h2 className="text-2xl font-bold text-slate-50 mb-8">
            🎮 ¿Cómo funciona?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 font-bold mb-4">
                1
              </div>
              <h3 className="font-semibold text-slate-50 mb-2">Haz Predicciones</h3>
              <p className="text-slate-400 text-sm">
                Predice el resultado de cada partido antes de que comience
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 font-bold mb-4">
                2
              </div>
              <h3 className="font-semibold text-slate-50 mb-2">Gana Puntos</h3>
              <p className="text-slate-400 text-sm">
                Obtén puntos basados en qué tan precisa es tu predicción
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-purple-500/20 text-purple-400 font-bold mb-4">
                3
              </div>
              <h3 className="font-semibold text-slate-50 mb-2">Compite</h3>
              <p className="text-slate-400 text-sm">
                Sube en el ranking global o desafía a tus amigos en pollas privadas
              </p>
            </div>
          </div>
        </div>

        {/* Scoring Info */}
        <div className="mt-12 text-center">
          <p className="text-slate-400 text-sm">
            💡 <strong>Consejo:</strong> Las predicciones se cierran 10 minutos antes de cada partido.
            Asegúrate de hacer tus predicciones a tiempo.
          </p>
        </div>
      </div>
    </div>
  )
}
