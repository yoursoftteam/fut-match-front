'use client'

import { useAuth } from '@/hooks/useAuth'
import { useMatches } from '@/hooks/useMatches'
import { useTournaments } from '@/hooks/useTournaments'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Trash2, Plus, Trophy, MapPin, Users, Calendar, Zap, ChevronRight, BarChart2 } from 'lucide-react'
import FrecuentesSection from '@/components/FrecuentesSection'
import SaveFrecuenteButton from '@/components/SaveFrecuenteButton'
import ShareLink from '@/components/ShareLink'
import MatchGroupedList from '@/components/MatchGroupedList'
import { ConfirmDialog } from '@/components/ConfirmDialog'

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
  const {
    tournaments,
    loading: tournamentsLoading,
    error: tournamentsError,
    listMyTournaments,
    deleteTournament,
  } = useTournaments()
  const router = useRouter()
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingTournamentId, setDeletingTournamentId] = useState<string | null>(null)
  const [confirmDeleteTournamentId, setConfirmDeleteTournamentId] = useState<string | null>(null)
  const [deleteTournamentError, setDeleteTournamentError] = useState<string | null>(null)
  const [deleteTournamentNameInput, setDeleteTournamentNameInput] = useState('')

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (user) {
      void listMyTournaments()
    }
  }, [user, listMyTournaments])

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-r-transparent mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Cargando…</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  const handleDeleteMatch = async (matchId: string) => {
    setDeletingMatchId(matchId)
    setDeleteError(null)
    try {
      const result = await deleteMatch(matchId)
      if (result.error) throw result.error
    } catch {
      setDeleteError('No se pudo eliminar el partido. Intenta nuevamente.')
    } finally {
      setDeletingMatchId(null)
      setConfirmDeleteId(null)
    }
  }

  const handleDeleteTournament = async (tournamentId: string) => {
    setDeletingTournamentId(tournamentId)
    setDeleteTournamentError(null)

    try {
      const ok = await deleteTournament(tournamentId)
      if (!ok) throw new Error("delete_failed")
    } catch {
      setDeleteTournamentError('No se pudo eliminar el torneo. Intenta nuevamente.')
    } finally {
      setDeletingTournamentId(null)
      setConfirmDeleteTournamentId(null)
    }
  }

  const tournamentToDelete = confirmDeleteTournamentId
    ? tournaments.find((item) => item.id === confirmDeleteTournamentId) ?? null
    : null
  const canConfirmTournamentDelete =
    Boolean(tournamentToDelete) && deleteTournamentNameInput.trim() === tournamentToDelete?.name

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const recentMatches = matches.filter((match) => {
    if (!match.created_at) return false
    const createdAt = new Date(match.created_at)
    if (Number.isNaN(createdAt.getTime())) return false
    return createdAt >= sevenDaysAgo
  })

  const isInitialMatchesLoading = matchesLoading && recentMatches.length === 0
  const isRefreshingMatches = matchesLoading && recentMatches.length > 0

  const userName = user.email?.split('@')[0] ?? 'crack'

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-10">

        {/* Welcome */}
        <section className="mb-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
                Dashboard
              </p>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground leading-tight">
                Hola, <span className="text-primary">{userName}</span>
              </h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Gestiona tus partidos y demuestra tu nivel.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Link
                href="/create"
                className="inline-flex items-center justify-center gap-2 btn-primary-fm neon-glow px-5 py-3 rounded-xl font-bold text-sm shrink-0 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                Armar partido
              </Link>
              <Link
                href="/tournaments/new"
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/40 px-5 py-3 text-sm font-bold text-foreground transition hover:border-primary hover:text-primary cursor-pointer"
              >
                <Trophy className="w-4 h-4" />
                Crear torneo
              </Link>
            </div>
          </div>
        </section>

        {/* Quick Actions — desktop only */}
        <section className="hidden md:block mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Acciones rápidas
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <Link
              href="/create"
              className="card match-card p-6 text-center group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                <Plus className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-card-foreground mb-1 group-hover:text-primary transition-colors">
                Armar partido
              </h3>
              <p className="text-xs text-muted-foreground">Nuevo en 2 minutos</p>
            </Link>

            <Link
              href="/tournaments/new"
              className="card match-card p-6 text-center group cursor-pointer"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/20 transition-colors">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-card-foreground mb-1 group-hover:text-primary transition-colors">Crear Torneo</h3>
              <p className="text-xs text-muted-foreground">Activa inscripción en minutos</p>
            </Link>

            <div className="card p-6 text-center opacity-40 cursor-not-allowed select-none">
              <div className="w-12 h-12 rounded-xl bg-muted border border-border flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-sm font-semibold text-card-foreground mb-1">Buscar Canchas</h3>
              <p className="text-xs text-muted-foreground">Próximamente</p>
            </div>
          </div>
        </section>

        {/* Partidos Frecuentes */}
        <FrecuentesSection />

        {/* Tournaments */}
        <section className="mt-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-heading font-bold text-foreground">Mis Torneos</h2>
              <p className="text-xs text-muted-foreground mt-0.5">Liga o grupos, todo bajo control</p>
            </div>
            <Link
              href="/tournaments/new"
              className="inline-flex items-center gap-2 rounded-xl border border-primary/40 px-4 py-2 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
            >
              <Trophy className="w-4 h-4" />
              Nuevo torneo
            </Link>
          </div>

          {tournamentsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <div className="h-36 rounded-2xl bg-muted animate-pulse" />
              <div className="h-36 rounded-2xl bg-muted animate-pulse" />
              <div className="h-36 rounded-2xl bg-muted animate-pulse" />
            </div>
          ) : tournaments.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center mx-auto mb-3">
                <Trophy className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-heading font-semibold text-foreground mb-1">Todavía no tienes torneos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Crea tu primer torneo y empieza a gestionar fixture, grupos y tabla.
              </p>
              <Link
                href="/tournaments/new"
                className="btn-primary-fm inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm"
              >
                <Trophy className="w-4 h-4" />
                Crear primer torneo
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {tournaments.map((tournament) => (
                <div key={tournament.id} className="card match-card p-5 flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-heading font-bold text-card-foreground leading-tight">
                      {tournament.name}
                    </h3>
                    <span className="level-badge bg-muted text-muted-foreground">
                      {tournament.status === 'draft'
                        ? 'Borrador'
                        : tournament.status === 'open'
                          ? 'Abierto'
                          : tournament.status === 'in_progress'
                            ? 'En juego'
                            : 'Finalizado'}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {tournament.tournament_type === 'league' ? 'Formato liga' : 'Formato grupos'}
                    {' · '}
                    {tournament.max_teams} equipos máx.
                  </p>

                  <div className="mt-1 grid grid-cols-2 gap-2">
                    <Link
                      href={`/tournaments/${tournament.id}/manage`}
                      className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
                    >
                      Gestionar
                    </Link>
                    <Link
                      href={`/tournaments/${tournament.id}/fixture`}
                      className="inline-flex items-center justify-center rounded-lg border border-border px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted transition"
                    >
                      Fixture
                    </Link>
                    <Link
                      href={`/tournaments/${tournament.id}/register`}
                      className="col-span-2 inline-flex items-center justify-center rounded-lg border border-primary/40 px-3 py-2 text-xs font-semibold text-foreground hover:border-primary hover:text-primary transition"
                    >
                      Ver portal público
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDeleteTournamentId(tournament.id)
                        setDeleteTournamentNameInput('')
                      }}
                      disabled={deletingTournamentId === tournament.id}
                      className="col-span-2 inline-flex items-center justify-center gap-2 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Trash2 className="size-3.5" />
                      {deletingTournamentId === tournament.id ? 'Eliminando...' : 'Eliminar torneo'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tournamentsError && <p className="mt-3 text-sm text-red-400">{tournamentsError}</p>}
          {deleteTournamentError && <p className="mt-3 text-sm text-red-400">{deleteTournamentError}</p>}
        </section>

        {/* Recent Matches */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-heading font-bold text-foreground">
                Mis Partidos
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Últimos 7 días</p>
            </div>
            <div className="flex items-center gap-3">
              {isRefreshingMatches && (
                <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse" aria-hidden />
                  Actualizando
                </span>
              )}
              <Link
                href="/matches"
                className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors text-sm font-semibold cursor-pointer"
              >
                Ver todos
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {isInitialMatchesLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-r-transparent mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">Cargando partidos…</p>
            </div>
          ) : recentMatches.length === 0 ? (
            <div className="card p-10 text-center">
              <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
                Sin partidos recientes
              </h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs mx-auto">
                No creaste partidos en los últimos 7 días. ¡Arma uno ahora!
              </p>
              <Link
                href="/create"
                className="inline-flex items-center gap-2 btn-primary-fm px-6 py-2.5 rounded-xl font-bold text-sm cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                Armar ahora
              </Link>
            </div>
          ) : (
            <MatchGroupedList
              matches={recentMatches.slice(0, 6)}
              registrationCounts={registrationCounts}
              renderCard={(match, registeredCount, isFull) => {
                const level = getLevelInfo(match.max_players)
                const spotsLeft = match.max_players - registeredCount
                return (
                  <div className="card match-card p-5 relative flex flex-col gap-4">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className={`level-badge ${level.cls}`}>{level.label}</span>
                          {isFull && (
                            <span className="level-badge bg-red-600/15 text-red-400">Completo</span>
                          )}
                        </div>
                        <h3 className="text-base font-heading font-bold text-card-foreground leading-tight truncate">
                          {match.title}
                        </h3>
                      </div>
                      <SaveFrecuenteButton
                        location={match.location}
                        playersPerTeam={match.players_per_team}
                        matchId={match.id}
                        matchDate={match.date}
                        fieldCost={match.field_cost}
                        rentalCost={match.rental_cost}
                        hasRentedGoalkeepers={match.has_rented_goalkeepers}
                        rentedGoalkeepersCount={match.rented_goalkeepers_count}
                        time={match.date.split("T")[1]?.substring(0, 5) || ""}
                      />
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{match.location}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {registeredCount}/{match.max_players}
                            {' · '}
                            {!isFull ? (
                              <span className="text-primary font-semibold">
                                {spotsLeft} cupo{spotsLeft !== 1 ? 's' : ''} libre{spotsLeft !== 1 ? 's' : ''}
                              </span>
                            ) : (
                              <span className="text-red-400 font-semibold">Sin cupos</span>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            {new Date(match.date).toLocaleDateString('es-CO', {
                              weekday: 'short',
                              day: '2-digit',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, (registeredCount / match.max_players) * 100)}%` }}
                      />
                    </div>

                    {/* Share */}
                    <div className="w-full min-w-0">
                      <ShareLink matchId={match.id} showTitle={false} />
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/match/${match.id}`}
                        className="btn-primary-fm px-4 py-2.5 text-sm text-center w-full rounded-xl font-bold cursor-pointer inline-block"
                      >
                        {isFull ? 'Ver detalles' : 'Ver partido'}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(match.id)}
                        disabled={deletingMatchId === match.id}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                        {deletingMatchId === match.id ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  </div>
                )
              }}
            />
          )}

          {deleteError && (
            <p className="mt-4 text-sm text-red-400">{deleteError}</p>
          )}
        </section>

        {/* Mobile quick access */}
        <section className="md:hidden mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Acciones rápidas</h2>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/tournaments/new" className="card match-card p-5 flex flex-col items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs font-semibold text-foreground">Crear Torneo</span>
            </Link>
            <div className="card p-5 flex flex-col items-center gap-3 opacity-40 cursor-not-allowed select-none">
                <div className="w-10 h-10 rounded-xl bg-muted border border-border flex items-center justify-center">
                  <BarChart2 className="w-5 h-5 text-muted-foreground" />
                </div>
                <span className="text-xs font-semibold text-muted-foreground">Estadísticas</span>
              </div>
          </div>
        </section>
      </main>

      <ConfirmDialog
        open={confirmDeleteId !== null}
        title="Eliminar partido"
        description={
          <>
            Esta acción{' '}
            <strong className="text-foreground">no se puede deshacer</strong>.
            Se eliminará el partido y todos los registros asociados.
          </>
        }
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        destructive
        loading={deletingMatchId === confirmDeleteId}
        onConfirm={() => confirmDeleteId && handleDeleteMatch(confirmDeleteId)}
        onCancel={() => setConfirmDeleteId(null)}
      />

      {confirmDeleteTournamentId && tournamentToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setConfirmDeleteTournamentId(null)
              setDeleteTournamentNameInput('')
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-tournament-title"
            className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl"
          >
            <h3 id="delete-tournament-title" className="text-lg font-bold text-foreground">
              Confirmar eliminación de torneo
            </h3>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
              Esta acción elimina el torneo y también sus equipos, partidos y pagos asociados.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Escribe exactamente el nombre para confirmar:
            </p>
            <p className="mt-1 rounded-md border border-border bg-muted/40 px-2 py-1 text-sm font-semibold text-foreground">
              {tournamentToDelete.name}
            </p>

            <label htmlFor="delete-tournament-name" className="mt-4 mb-1.5 block text-sm font-medium text-foreground">
              Nombre del torneo
            </label>
            <input
              id="delete-tournament-name"
              type="text"
              value={deleteTournamentNameInput}
              onChange={(e) => setDeleteTournamentNameInput(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
              autoFocus
            />

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteTournamentId(null)
                  setDeleteTournamentNameInput('')
                }}
                disabled={deletingTournamentId === confirmDeleteTournamentId}
                className="flex-1 rounded border border-border bg-muted py-2 px-4 text-sm font-medium text-foreground transition hover:bg-secondary disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => confirmDeleteTournamentId && handleDeleteTournament(confirmDeleteTournamentId)}
                disabled={!canConfirmTournamentDelete || deletingTournamentId === confirmDeleteTournamentId}
                className="flex flex-1 items-center justify-center gap-2 rounded bg-red-600 py-2 px-4 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deletingTournamentId === confirmDeleteTournamentId ? 'Eliminando…' : 'Sí, eliminar torneo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
