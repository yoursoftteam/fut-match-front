'use client'

import { useAuth } from '@/hooks/useAuth'
import { useMatches, type Match } from '@/hooks/useMatches'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Trash2, Plus, Trophy, MapPin, Users, Calendar, Zap, ChevronRight, Target, Share2, Check } from 'lucide-react'
import FrecuentesSection from '@/components/FrecuentesSection'
import MisPrediccionesSection from '@/components/MisPrediccionesSection'
import SaveFrecuenteButton from '@/components/SaveFrecuenteButton'
import MatchGroupedList from '@/components/MatchGroupedList'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { POSITIONS, type PositionOption } from '@/lib/positions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getLocalTimeInputValue, formatLocalTime } from '@/lib/date-utils'
import { supabase } from '@/lib/supabase'

type UserMetadata = { alias?: string; full_name?: string; name?: string; position?: string };

interface RegisteredMatchCardItem {
  registrationId: string
  match: Match
  position?: string | null
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function getLevelInfo(maxPlayers: number): { label: string; cls: string } {
  if (maxPlayers <= 6)  return { label: 'Casual',  cls: 'level-casual'  }
  if (maxPlayers <= 10) return { label: 'Semi-Pro', cls: 'level-semipro' }
  return                       { label: 'Pro',      cls: 'level-pro'     }
}

function getMatchStatus(dateStr: string): { label: string; cls: string } | null {
  const now = new Date();
  const matchDate = new Date(dateStr);
  const diffDays = Math.floor((matchDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < -1) return null;
  if (diffDays < 0) return { label: "Hoy", cls: "bg-green-600/15 text-green-400" };
  if (diffDays === 0) return { label: "Hoy", cls: "bg-green-600/15 text-green-400" };
  if (diffDays <= 3) return { label: "Próximo", cls: "bg-blue-600/15 text-blue-400" };
  return null;
}

function InlineShareButton({ matchId }: { matchId: string }) {
  const [copied, setCopied] = useState(false);
  const shareableLink = typeof window !== "undefined" ? `${window.location.origin}/match/${matchId}` : "";

  const handleShare = async () => {
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: "Partido de fútbol", url: shareableLink });
        return;
      } catch { /* ignore */ }
    }
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <button
      type="button"
      onClick={handleShare}
      className="flex size-8 items-center justify-center rounded-lg border border-border bg-muted/30 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      aria-label="Compartir partido"
    >
      {copied ? <Check className="size-3.5 text-green-500" /> : <Share2 className="size-3.5" />}
    </button>
  );
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  const { matches, loading: matchesLoading, registrationCounts, deleteMatch } = useMatches({
    autoFetch: true,
    onlyOwnedByCurrentUser: true,
  })
  const { unregisterFromMatch } = useMatches()
  const router = useRouter()
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [registeredMatches, setRegisteredMatches] = useState<RegisteredMatchCardItem[]>([])
  const [registeredMatchesLoading, setRegisteredMatchesLoading] = useState(true)
  const [unregisteringRegistrationId, setUnregisteringRegistrationId] = useState<string | null>(null)
  const [registeredMatchesMessage, setRegisteredMatchesMessage] = useState<string | null>(null)
  const [aliasDraft, setAliasDraft] = useState('')
  const [savedAlias, setSavedAlias] = useState<string | null>(null)
  const [aliasSaving, setAliasSaving] = useState(false)
  const [aliasMessage, setAliasMessage] = useState<string | null>(null)
  const [aliasDismissed, setAliasDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dashboard-alias-dismissed") === "true";
    }
    return false;
  });
  const SHARED_POSITIONS = POSITIONS as readonly PositionOption[];
  const [selectedPosition, setSelectedPosition] = useState("");
  const [savedPosition, setSavedPosition] = useState("");
  const [positionSaving, setPositionSaving] = useState(false);
  const [positionMessage, setPositionMessage] = useState<string | null>(null);
  const [positionDismissed, setPositionDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("dashboard-position-dismissed") === "true";
    }
    return false;
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth')
    }
  }, [user, authLoading, router])

  useEffect(() => {
    if (!user) {
      setRegisteredMatches([])
      setRegisteredMatchesLoading(false)
      return
    }

    let cancelled = false

    const loadRegisteredMatches = async () => {
      try {
        setRegisteredMatchesLoading(true)

        const metadata = user.user_metadata as UserMetadata | null
        const preferredName = (
          metadata?.alias ||
          metadata?.name ||
          metadata?.full_name ||
          user.email?.split('@')[0] ||
          ''
        ).trim()

        const { data: byUserIdData, error: byUserIdError } = await supabase
          .from('match_registrations')
          .select('id, match_id, registered_at, position')
          .eq('user_id', user.id)
          .order('registered_at', { ascending: false })

        if (byUserIdError) throw byUserIdError

        let legacyByNameData: Array<{
          id: string
          match_id: string
          registered_at: string
          position: string | null
        }> = []

        if (preferredName.length >= 2) {
          const { data: byNameData, error: byNameError } = await supabase
            .from('match_registrations')
            .select('id, match_id, registered_at, position')
            .is('user_id', null)
            .ilike('name', preferredName)
            .order('registered_at', { ascending: false })

          if (byNameError) throw byNameError
          legacyByNameData = (byNameData || []) as typeof legacyByNameData
        }

        const combinedRows: Array<{ id: string; match_id: string; registered_at: string; position: string | null }> = [
          ...((byUserIdData || []) as Array<{ id: string; match_id: string; registered_at: string; position: string | null }>),
          ...legacyByNameData,
        ]

        const uniqueMatchIds = Array.from(new Set(combinedRows.map((row) => row.match_id)))
        const byMatchId = new Map<string, Match>()

        await Promise.all(
          uniqueMatchIds.map(async (matchId) => {
            const { data: publicMatch, error: publicMatchError } = await supabase
              .rpc('get_public_match_by_id', { p_match_id: matchId })
              .maybeSingle()

            if (publicMatchError || !publicMatch) return
            byMatchId.set(matchId, publicMatch as Match)
          })
        )

        const orderedMatches: RegisteredMatchCardItem[] = []
        const seen = new Set<string>()
        for (const row of combinedRows) {
          if (seen.has(row.match_id)) continue
          const match = byMatchId.get(row.match_id)
          if (!match) continue
          seen.add(row.match_id)
          orderedMatches.push({ registrationId: row.id, match, position: row.position })
        }

        if (!cancelled) {
          setRegisteredMatches(orderedMatches)
        }
      } catch {
        if (!cancelled) {
          setRegisteredMatches([])
        }
      } finally {
        if (!cancelled) {
          setRegisteredMatchesLoading(false)
        }
      }
    }

    loadRegisteredMatches()

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!registeredMatchesMessage) return

    const timeoutId = window.setTimeout(() => {
      setRegisteredMatchesMessage(null)
    }, 3000)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [registeredMatchesMessage])

  useEffect(() => {
    if (!user) {
      setAliasDraft('')
      setSavedAlias(null)
      setAliasMessage(null)
      return
    }

    const metadata = user.user_metadata as UserMetadata | null
    const baseAlias = (metadata?.alias || metadata?.name || metadata?.full_name || '').trim()

    setSavedAlias(metadata?.alias?.trim() || null)
    setAliasDraft(baseAlias)
    setAliasMessage(null)
  }, [user])

  useEffect(() => {
    if (!user) {
      setSelectedPosition("");
      setPositionMessage(null);
      return;
    }
    const metadata = user.user_metadata as UserMetadata | null;
    setSelectedPosition(metadata?.position?.trim() || "");
    setSavedPosition(metadata?.position?.trim() || "");
    setPositionMessage(null);
  }, [user]);

  const handleSavePosition = async () => {
    if (!user || !selectedPosition) return;
    setPositionSaving(true);
    setPositionMessage(null);
    try {
      const currentMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;
      const { error } = await supabase.auth.updateUser({
        data: { ...currentMetadata, position: selectedPosition },
      });
      if (error) throw error;
      setPositionDismissed(true);
      setSavedPosition(selectedPosition);
      if (typeof window !== "undefined") {
        localStorage.setItem("dashboard-position-dismissed", "true");
      }
      setPositionMessage("Posición guardada correctamente.");
    } catch {
      setPositionMessage("No pudimos guardar tu posición. Intenta nuevamente.");
    } finally {
      setPositionSaving(false);
    }
  };

  const handleQuickUnregister = async (registrationId: string, matchId: string) => {
    if (!user) {
      setRegisteredMatchesMessage('Debes iniciar sesión para cancelar la inscripción.')
      return
    }

    setUnregisteringRegistrationId(registrationId)
    setRegisteredMatchesMessage(null)

    try {
      let effectiveRegistrationId = registrationId

      if (!isUuid(effectiveRegistrationId)) {
        const metadata = user.user_metadata as UserMetadata | null
        const preferredName = (
          metadata?.alias ||
          metadata?.name ||
          metadata?.full_name ||
          user.email?.split('@')[0] ||
          ''
        ).trim()

        const { data: fallbackRows, error: fallbackError } = await supabase
          .from('match_registrations')
          .select('id, user_id, name, registered_at')
          .eq('match_id', matchId)
          .or(`user_id.eq.${user.id},and(user_id.is.null,name.ilike.${preferredName})`)
          .order('registered_at', { ascending: false })

        if (!fallbackError && fallbackRows && fallbackRows.length > 0) {
          const fallbackId = fallbackRows[0]?.id
          if (typeof fallbackId === 'string' && isUuid(fallbackId)) {
            effectiveRegistrationId = fallbackId
          }
        }
      }

      const { error } = await unregisterFromMatch(effectiveRegistrationId)
      if (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : 'No se pudo completar la baja. Intenta nuevamente.'
        setRegisteredMatchesMessage(errorMessage)
        return
      }

      setRegisteredMatches((prev) => prev.filter((item) => item.match.id !== matchId))
      setRegisteredMatchesMessage('Te diste de baja del partido correctamente.')
    } finally {
      setUnregisteringRegistrationId(null)
    }
  }

  const handleSaveAlias = async () => {
    if (!user) return

    const nextAlias = aliasDraft.trim()
    if (nextAlias.length < 2) {
      setAliasMessage('El alias debe tener al menos 2 caracteres.')
      return
    }

    setAliasSaving(true)
    setAliasMessage(null)

    try {
      const currentMetadata = (user.user_metadata ?? {}) as Record<string, unknown>
      const { error } = await supabase.auth.updateUser({
        data: {
          ...currentMetadata,
          alias: nextAlias,
          name: nextAlias,
          full_name: (currentMetadata.full_name as string) || nextAlias,
        },
      })

      if (error) throw error

      setSavedAlias(nextAlias)
      setAliasDismissed(true)
      if (typeof window !== "undefined") {
        localStorage.setItem("dashboard-alias-dismissed", "true");
      }
      setAliasMessage('Alias actualizado correctamente.')
    } catch {
      setAliasMessage('No pudimos guardar tu alias. Intenta nuevamente.')
    } finally {
      setAliasSaving(false)
    }
  }

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

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const uniqueOwnedMatches = Array.from(new Map(matches.map((match) => [match.id, match])).values())

  const recentMatches = uniqueOwnedMatches.filter((match) => {
    if (!match.created_at) return false
    const createdAt = new Date(match.created_at)
    if (Number.isNaN(createdAt.getTime())) return false
    return createdAt >= sevenDaysAgo
  })

  const isInitialMatchesLoading = matchesLoading && recentMatches.length === 0
  const isRefreshingMatches = matchesLoading && recentMatches.length > 0

  const metadata = user.user_metadata as UserMetadata | null
  const resolvedAlias = (savedAlias || metadata?.alias || '').trim()
  const fullName = (metadata?.full_name || '').trim()
  const needsAlias = !resolvedAlias || (!!fullName && resolvedAlias === fullName)
  const userNameFull = (
    fullName ||
    resolvedAlias ||
    metadata?.name ||
    user.email?.split('@')[0] ||
    'crack'
  ).trim()
  // Solo el primer nombre y primera letra mayúscula
  let userName = userNameFull.split(' ')[0]
  if (userName.length > 0) {
    userName = userName.charAt(0).toUpperCase() + userName.slice(1)
  }

  const savedPositionValue = savedPosition || metadata?.position || '';
  const currentPosition = SHARED_POSITIONS.find((p) => p.value === savedPositionValue);
  const PositionIcon = currentPosition?.icon ?? null;

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-10">

        {needsAlias && !aliasDismissed && (
          <section className="mb-6 rounded-2xl border border-primary/35 bg-primary/10 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">Completa tu alias</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Este nombre es el que verán en tu dashboard y en el juego.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                value={aliasDraft}
                onChange={(e) => setAliasDraft(e.target.value)}
                placeholder="Ejemplo: El 10"
                autoComplete="nickname"
                className="sm:max-w-sm"
                maxLength={30}
              />
              <Button type="button" onClick={handleSaveAlias} disabled={aliasSaving}>
                {aliasSaving ? 'Guardando...' : 'Guardar alias'}
              </Button>
            </div>
            {aliasMessage && (
              <p className="mt-2 text-xs text-foreground">{aliasMessage}</p>
            )}
          </section>
        )}

        {!savedPosition && !positionDismissed && (
          <section className="mb-6 rounded-2xl border border-primary/35 bg-primary/10 p-4 sm:p-5">
            <p className="text-sm font-semibold text-foreground">¿Cuál es tu posición?</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Selecciona dónde juegas para que los capitanes te reconozcan al inscribirte.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={selectedPosition} onValueChange={(v) => { if (v) setSelectedPosition(v); }}>
                <SelectTrigger className="sm:max-w-sm w-full" aria-label="Seleccionar posición">
                  <SelectValue placeholder="Elige tu posición…" />
                </SelectTrigger>
                <SelectContent>
                  {SHARED_POSITIONS.map((pos) => {
                    const Icon = pos.icon;
                    return (
                      <SelectItem key={pos.value} value={pos.value}>
                        <Icon className="size-4" aria-hidden="true" />
                        {pos.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button type="button" onClick={handleSavePosition} disabled={positionSaving || !selectedPosition}>
                {positionSaving ? 'Guardando...' : 'Guardar posición'}
              </Button>
            </div>
            {positionMessage && (
              <p className="mt-2 text-xs text-foreground">{positionMessage}</p>
            )}
          </section>
        )}

        {/* Welcome */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-1">
                Dashboard
              </p>
              <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground leading-tight">
                Hola, <span className="text-primary">{userName}</span>
              </h1>
              {currentPosition && PositionIcon && (
                <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                  <PositionIcon className="size-4" aria-hidden="true" />
                  <span>{currentPosition.label}</span>
                </div>
              )}
              <p className="text-muted-foreground mt-1 text-sm">
                Gestiona tus partidos, predicciones y demuestra tu nivel.
              </p>
            </div>
          </div>
        </section>

        {/* Quick Actions */}
        <section className="mb-12">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            Acciones rápidas
          </h2>
          <div className="flex flex-col gap-2">
            <Link
              href="/create"
              className="flex items-center gap-3 rounded-xl border border-border bg-card h-12 px-4 transition-colors hover:border-primary/40 group cursor-pointer"
            >
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Plus className="size-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-card-foreground flex-1 min-w-0 group-hover:text-primary transition-colors leading-none">
                Armar partido
              </span>
              <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">Nuevo en 2 min</span>
              <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 -ml-1" />
            </Link>

            <Link
              href="/bet/predictions/new"
              className="flex items-center gap-3 rounded-xl border border-border bg-card h-12 px-4 transition-colors hover:border-primary/40 group cursor-pointer"
            >
              <div className="size-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                <Target className="size-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-card-foreground flex-1 min-w-0 group-hover:text-primary transition-colors leading-none">
                Crear Predicciones
              </span>
              <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">Solo marcadores</span>
              <ChevronRight className="size-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0 -ml-1" />
            </Link>

            <Link
              href="/bet/pools/new"
              className="flex items-center gap-3 rounded-xl border border-border bg-card h-12 px-4 transition-colors hover:border-accent/40 group cursor-pointer"
            >
              <div className="size-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                <Trophy className="size-4 text-accent" />
              </div>
              <span className="text-sm font-semibold text-card-foreground flex-1 min-w-0 group-hover:text-accent transition-colors leading-none">
                Crear Polla
              </span>
              <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">Apuesta con amigos</span>
              <ChevronRight className="size-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0 -ml-1" />
            </Link>
          </div>
        </section>

        {/* Mis Predicciones */}
        <MisPrediccionesSection />

        {/* Partidos Frecuentes */}
        <FrecuentesSection />

        {/* Recent Matches */}
        <section>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-heading font-bold text-foreground">
                Partidos Creados
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
                          {(() => { const s = getMatchStatus(match.date); return s ? <span className={`level-badge ${s.cls}`}>{s.label}</span> : null })()}
                          {isFull && (
                            <span className="level-badge bg-red-600/15 text-red-400">Completo</span>
                          )}
                        </div>
                        <h3 className="text-base font-heading font-bold text-card-foreground leading-tight truncate">
                          {match.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <SaveFrecuenteButton
                          location={match.location}
                          playersPerTeam={match.players_per_team}
                          matchId={match.id}
                          matchDate={match.date}
                          fieldCost={match.field_cost}
                          rentalCost={match.rental_cost}
                          hasRentedGoalkeepers={match.has_rented_goalkeepers}
                          rentedGoalkeepersCount={match.rented_goalkeepers_count}
                          time={getLocalTimeInputValue(match.date)}
                        />
                        <InlineShareButton matchId={match.id} />
                      </div>
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

                    {/* Missing rules alert */}
                    {!match.rules && (
                      <Link
                        href={`/match/${match.id}?edit=rules`}
                        className="flex items-center gap-2 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2 text-xs text-amber-400 transition hover:bg-amber-500/15 cursor-pointer"
                      >
                        <span className="size-1.5 rounded-full bg-amber-400 shrink-0" aria-hidden />
                        <span className="flex-1">Sin reglas — agrégalas</span>
                        <ChevronRight className="size-3 shrink-0" />
                      </Link>
                    )}

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

        {/* Registered Matches */}
        <section className="mt-12">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-heading font-bold text-foreground">
                Partidos en los que estoy inscrito
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Acceso rapido a tus inscripciones</p>
            </div>
            {registeredMatches.length > 0 && (
              <Link
                href="/matches"
                className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors text-sm font-semibold cursor-pointer"
              >
                Ver todos
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {registeredMatchesLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-r-transparent mx-auto mb-4" />
              <p className="text-muted-foreground text-sm">Cargando inscripciones…</p>
            </div>
          ) : registeredMatches.length === 0 ? (
            <div className="card p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-heading font-semibold text-foreground mb-2">
                No tienes inscripciones activas
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Cuando te inscribas en un partido con tu cuenta, aparecera aqui para entrar rapido.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 card-grid">
              {registeredMatches.map(({ registrationId, match, position }) => {
                const regCount = registrationCounts[match.id] || 0;
                const isFull = regCount >= match.max_players;
                return (
                <div key={`${match.id}-${registrationId}`} className="card match-card p-5 relative flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {(() => { const s = getMatchStatus(match.date); return s ? <span className={`level-badge ${s.cls}`}>{s.label}</span> : null })()}
                        </div>
                        <h3 className="text-base font-heading font-bold text-card-foreground leading-tight truncate">
                        {match.title}
                      </h3>
                      {position && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                          {(() => {
                            const p = (POSITIONS as readonly PositionOption[]).find((pos) => pos.value === position);
                            if (p) {
                              const Icon = p.icon;
                              return <><Icon className="size-3" aria-hidden="true" />{p.label}</>;
                            }
                            return position;
                          })()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <InlineShareButton matchId={match.id} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{match.location}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {regCount}/{match.max_players}
                          {' · '}
                          {!isFull ? (
                            <span className="text-primary font-semibold">
                              {match.max_players - regCount} cupo{(match.max_players - regCount) !== 1 ? 's' : ''} libre{(match.max_players - regCount) !== 1 ? 's' : ''}
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

                  <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, (regCount / match.max_players) * 100)}%` }}
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/match/${match.id}`}
                      className="btn-primary-fm px-4 py-2.5 text-sm text-center w-full rounded-xl font-bold cursor-pointer inline-block"
                    >
                      Ver partido
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleQuickUnregister(registrationId, match.id)}
                      disabled={unregisteringRegistrationId === registrationId}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                    >
                      {unregisteringRegistrationId === registrationId ? 'Procesando...' : 'Cancelar inscripción'}
                    </button>
                  </div>
                </div>
              )})}
            </div>
          )}

          {registeredMatchesMessage && (
            <p className={`mt-4 text-sm ${registeredMatchesMessage.includes('correctamente') ? 'text-green-400' : 'text-red-400'}`}>
              {registeredMatchesMessage}
            </p>
          )}
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
    </div>
  )
}
