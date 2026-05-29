/**
 * Página Principal de Apuestas - FIFA 2026
 */

'use client'

import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

export default function BetPage() {
  const { user, loading } = useAuth()

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
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent mb-4">
            ⚽ FIFA 2026
          </h1>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* Matches Card */}
          <Card className="group cursor-pointer hover:border-emerald-500/50 transition-all hover:shadow-lg hover:shadow-emerald-500/10">
            <Link href="/bet/matches" className="block p-8 h-full">
              <div className="text-5xl mb-4">🎯</div>
              <h2 className="text-xl font-bold text-slate-50 mb-2 group-hover:text-emerald-400 transition-colors">
                Predicciones
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                Haz tus predicciones para todos los partidos de la Copa Mundial
              </p>
              <div className="text-emerald-400 text-sm font-semibold">
                Ver Partidos →
              </div>
            </Link>
          </Card>

          {/* Leaderboard Card */}
          <Card className="group cursor-pointer hover:border-blue-500/50 transition-all hover:shadow-lg hover:shadow-blue-500/10">
            <Link href="/bet/leaderboard" className="block p-8 h-full">
              <div className="text-5xl mb-4">🏆</div>
              <h2 className="text-xl font-bold text-slate-50 mb-2 group-hover:text-blue-400 transition-colors">
                Clasificaciones
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                Compite globalmente y sube en el ranking mundial
              </p>
              <div className="text-blue-400 text-sm font-semibold">
                Ver Rankings →
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <p className="text-slate-400 text-sm mb-1">Equipos</p>
              <p className="text-3xl font-bold text-emerald-400">32</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">Partidos de Grupos</p>
              <p className="text-3xl font-bold text-blue-400">48</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">Grupos</p>
              <p className="text-3xl font-bold text-purple-400">8</p>
            </div>
            <div>
              <p className="text-slate-400 text-sm mb-1">Fase Eliminatoria</p>
              <p className="text-3xl font-bold text-yellow-400">16</p>
            </div>
          </div>
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
