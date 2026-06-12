'use client'

import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { useAuth } from '@/hooks/useAuth'
import { useTournamentStats } from '@/hooks/useTournamentStats'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

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
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-2 border-primary border-r-transparent" />
          <p className="text-muted-foreground text-sm">Cargando…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 md:px-6">
      <div className="max-w-5xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12">
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
              className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 16 }}
              animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.5, delay: 0.15 }}
            >
              FIFA World Cup 2026
            </motion.h1>
          </div>
          <motion.p
            className="text-xl text-foreground/80 mb-2"
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
            className="text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.45 }}
          >
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth?mode=signin">
                <Button size="lg">Iniciar Sesión</Button>
              </Link>
              <Link href="/auth?mode=signup">
                <Button size="lg" variant="outline">Crear Cuenta</Button>
              </Link>
            </div>
          </motion.div>
        )}

        {/* Main Grid */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12"
          initial={{ opacity: 0, y: 30 }}
          animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Card className="group cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/10">
            <Link href="/bet/predictions" className="block p-8 h-full">
              <div className="text-5xl mb-4">🎯</div>
              <h2 className="text-xl font-bold text-card-foreground mb-2 group-hover:text-primary transition-colors">
                Predicciones
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Crea competencias solo de marcadores y reta a tu squad
              </p>
              <div className="text-primary text-sm font-semibold">
                Ver Partidos →
              </div>
            </Link>
          </Card>

          <Card className="group cursor-pointer hover:border-accent/50 transition-all hover:shadow-lg hover:shadow-accent/10">
            <Link href="/bet/pools" className="block p-8 h-full">
              <div className="text-5xl mb-4">👥</div>
              <h2 className="text-xl font-bold text-card-foreground mb-2 group-hover:text-accent transition-colors">
                Pollas
              </h2>
              <p className="text-muted-foreground text-sm mb-4">
                Crea y únete a pollas privadas con amigos
              </p>
              <div className="text-accent text-sm font-semibold">
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
          <Card className="mb-12 p-8">
            <h2 className="text-2xl font-bold text-card-foreground mb-4">📊 Copa Mundial FIFA 2026</h2>
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Equipos</p>
                    <p className="text-3xl font-bold text-primary">{stats.total_teams}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Partidos de Grupos</p>
                    <p className="text-3xl font-bold text-accent">{stats.group_stage_matches}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Grupos</p>
                    <p className="text-3xl font-bold text-accent">{stats.total_groups}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">Fase Eliminatoria</p>
                    <p className="text-3xl font-bold text-primary">{stats.knockout_stage_matches}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progreso del torneo</span>
                    <span className="text-foreground font-medium">{stats.completion_percentage}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(stats.completion_percentage, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.matches_completed} de {stats.group_stage_matches + stats.knockout_stage_matches} partidos disputados
                  </p>
                </div>
              </>
            )}
            {statsError && (
              <p className="text-xs text-destructive mt-2">
                No se pudieron cargar las estadísticas en tiempo real
              </p>
            )}
          </Card>
        </motion.div>

        {/* How it Works */}
        <motion.div
          className="bg-muted/30 rounded-lg border border-border p-8"
          initial={{ opacity: 0, y: 30 }}
          animate={ready ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.5, delay: 0.7 }}
        >
          <h2 className="text-2xl font-bold text-foreground mb-8">
            🎮 ¿Cómo funciona?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 text-primary font-bold mb-4">
                1
              </div>
              <h3 className="font-semibold text-foreground mb-2">Haz Predicciones</h3>
              <p className="text-muted-foreground text-sm">
                Predice el resultado de cada partido antes de que comience
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-accent/20 text-accent font-bold mb-4">
                2
              </div>
              <h3 className="font-semibold text-foreground mb-2">Gana Puntos</h3>
              <p className="text-muted-foreground text-sm">
                Obtén puntos basados en qué tan precisa es tu predicción
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 text-primary font-bold mb-4">
                3
              </div>
              <h3 className="font-semibold text-foreground mb-2">Compite</h3>
              <p className="text-muted-foreground text-sm">
                Sube en el ranking global o desafía a tus amigos en pollas privadas
              </p>
            </div>
          </div>
        </motion.div>

        {/* Scoring Info */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0 }}
          animate={ready ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <p className="text-muted-foreground text-sm">
            💡 <strong className="text-foreground">Consejo:</strong> Las predicciones se cierran 10 minutos antes de cada partido.
            Asegúrate de hacer tus predicciones a tiempo.
          </p>
        </motion.div>
      </div>
    </div>
  )
}
