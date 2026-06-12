'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '@/hooks/useAuth'
import { useTournamentStats } from '@/hooks/useTournamentStats'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

const GLOW =
  '0 0 20px color-mix(in oklch, var(--primary) 30%, transparent), 0 0 40px color-mix(in oklch, var(--primary) 10%, transparent)'

export default function BetPage() {
  const { user, loading } = useAuth()
  const [ready, setReady] = useState(false)
  const {
    stats,
    loading: statsLoading,
    error: statsError,
  } = useTournamentStats()

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 100)
    return () => clearTimeout(t)
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-emerald-500 border-r-transparent" />
          <p className="text-muted-foreground text-sm">Cargando…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="mb-6 flex flex-col items-center gap-4">
            <motion.img
              src="/mundial_2026.png"
              alt="FIFA World Cup 2026"
              className="w-40 h-40 md:w-52 md:h-52 object-contain drop-shadow-lg"
              initial={{ scale: 1.6, filter: 'brightness(2.5) blur(10px)' }}
              animate={
                ready
                  ? { scale: 1, filter: 'brightness(1) blur(0px)' }
                  : { scale: 1.6, filter: 'brightness(2.5) blur(10px)' }
              }
              transition={{ duration: 0.8, ease: 'easeInOut' }}
            />
            <motion.h1
              className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 16 }}
              animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              FIFA World Cup 2026
            </motion.h1>
          </div>
          <motion.p
            className="text-xl text-emerald-700 dark:text-emerald-300 font-semibold mb-2"
            initial={{ opacity: 0, y: 12 }}
            animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            Predicciones de Fútbol
          </motion.p>
          <motion.p
            className="text-muted-foreground"
            initial={{ opacity: 0, y: 12 }}
            animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            Compite con amigos y demuestra tu expertise en fútbol
          </motion.p>
        </div>

        {/* CTA Buttons */}
        {!user && (
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth?mode=signin">
                <Button
                  size="lg"
                  className="bg-emerald-500 hover:bg-emerald-400 text-white shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transition-all"
                >
                  Iniciar Sesión
                </Button>
              </Link>
              <Link href="/auth?mode=signup">
                <Button size="lg" variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/60">
                  Crear Cuenta
                </Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Main Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10"
          initial={{ opacity: 0, y: 30 }}
          animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="group cursor-pointer border-border/60 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1">
            <Link href="/bet/predictions" className="block p-8 h-full">
              <div className="text-5xl mb-4">🎯</div>
              <h2 className="text-xl font-bold text-card-foreground mb-2 group-hover:text-emerald-500 transition-colors">
                Predicciones
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Crea competencias solo de marcadores y reta a tu squad
              </p>
              <div className="text-emerald-500 text-sm font-semibold group-hover:translate-x-1 transition-transform">
                Ver Partidos →
              </div>
            </Link>
          </Card>

          <Card className="group cursor-pointer border-border/60 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1">
            <Link href="/bet/pools" className="block p-8 h-full">
              <div className="text-5xl mb-4">🏟️</div>
              <h2 className="text-xl font-bold text-card-foreground mb-2 group-hover:text-emerald-500 transition-colors">
                Pollas
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Crea y únete a pollas privadas con amigos
              </p>
              <div className="text-emerald-500 text-sm font-semibold group-hover:translate-x-1 transition-transform">
                Ver Pollas →
              </div>
            </Link>
          </Card>
        </motion.div>

        {/* Tournament Info */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Card className="mb-10 p-8 border-border/60 shadow-md">
            <h2 className="text-2xl font-bold text-card-foreground mb-6 flex items-center gap-2">
              <span>📊</span>
              <span>Copa Mundial FIFA 2026</span>
              <span className="ml-auto text-xs font-normal text-muted-foreground bg-muted px-2.5 py-1 rounded-full">En vivo</span>
            </h2>
            {statsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i}>
                    <div className="h-4 w-20 bg-muted rounded animate-pulse mb-2" />
                    <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10">
                    <p className="text-muted-foreground text-xs mb-1 font-medium uppercase tracking-wider">Equipos</p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.total_teams}</p>
                  </div>
                  <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10">
                    <p className="text-muted-foreground text-xs mb-1 font-medium uppercase tracking-wider">Grupos</p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.total_groups}</p>
                  </div>
                  <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10">
                    <p className="text-muted-foreground text-xs mb-1 font-medium uppercase tracking-wider">Fase Grupos</p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.group_stage_matches}</p>
                  </div>
                  <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/10">
                    <p className="text-muted-foreground text-xs mb-1 font-medium uppercase tracking-wider">Eliminatorias</p>
                    <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.knockout_stage_matches}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground font-medium">Progreso del torneo</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">{stats.completion_percentage}%</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500 shadow-sm"
                      style={{ width: `${Math.min(stats.completion_percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    {stats.matches_completed} de {stats.group_stage_matches + stats.knockout_stage_matches} partidos disputados
                  </p>
                </div>
              </>
            )}
            {statsError && (
              <p className="text-xs text-destructive mt-3 flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-destructive inline-block" />
                No se pudieron cargar las estadísticas en tiempo real
              </p>
            )}
          </Card>
        </motion.div>

        {/* How it Works */}
        <motion.div
          className="bg-gradient-to-br from-emerald-500/5 to-emerald-500/[0.02] rounded-2xl border border-emerald-500/10 p-8 md:p-10 shadow-sm"
          initial={{ opacity: 0, y: 30 }}
          animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">
            🎮 ¿Cómo funciona?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xl mb-4 border border-emerald-500/20 shadow-sm">
                1
              </div>
              <h3 className="font-bold text-foreground mb-2">Haz Predicciones</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Predice el resultado de cada partido antes de que comience
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xl mb-4 border border-emerald-500/20 shadow-sm">
                2
              </div>
              <h3 className="font-bold text-foreground mb-2">Gana Puntos</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Obtén puntos basados en qué tan precisa es tu predicción
              </p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center w-14 h-14 mx-auto rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold text-xl mb-4 border border-emerald-500/20 shadow-sm">
                3
              </div>
              <h3 className="font-bold text-foreground mb-2">Compite</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Sube en el ranking global o desafía a tus amigos en pollas privadas
              </p>
            </div>
          </div>
        </motion.div>

        {/* Scoring Info */}
        <motion.div
          className="mt-10 text-center"
          initial={{ opacity: 0 }}
          animate={ready ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-5 py-2.5 text-sm text-muted-foreground">
            <span>💡</span>
            <strong className="text-emerald-600 dark:text-emerald-400">Consejo:</strong>
            <span>Las predicciones se cierran 10 minutos antes de cada partido. Asegúrate de hacer tus picks a tiempo.</span>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
