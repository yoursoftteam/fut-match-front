"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/lib/supabase"
import { type Tournament, type TournamentTeam, type TournamentTeamPlayer } from "@/lib/tournament-schema"
import { CalendarDays, ChevronLeft, ShieldCheck, Swords, Trophy, Users, Phone, Mail, FileText, Droplets, Heart, Shirt, Trash2, Check, X, Loader2 } from "lucide-react"
import RichTextRenderer from "@/components/rich-editor/RichTextRenderer"
import { ShareActions } from "@/components/ShareLink"

interface TournamentDetailClientProps {
  tournamentId: string
}

export default function TournamentDetailClient({ tournamentId }: TournamentDetailClientProps) {
  const { user, loading: authLoading } = useAuth()
  const [tournament, setTournament] = useState<Tournament | null>(null)
  const [teams, setTeams] = useState<TournamentTeam[]>([])
  const [players, setPlayers] = useState<TournamentTeamPlayer[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [playerTeamId, setPlayerTeamId] = useState<string | null>(null)
  useEffect(() => { setMounted(true) }, [])

  const [editingShirtId, setEditingShirtId] = useState<string | null>(null)
  const [editShirtValue, setEditShirtValue] = useState("")
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null)
  const [savingShirt, setSavingShirt] = useState(false)

  const captainTeam = user?.email ? teams.find((t) => t.captain_email === user.email) ?? null : null
  const playerTeam = playerTeamId ? teams.find((t) => t.id === playerTeamId) ?? null : null
  const userTeam = captainTeam || playerTeam
  const isCaptain = !!captainTeam

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      const [tResult, teamsResult, userEmail] = await Promise.all([
        supabase.from("tournaments").select("*").eq("id", tournamentId).maybeSingle(),
        supabase.from("tournament_teams").select("*").eq("tournament_id", tournamentId).order("name"),
        supabase.auth.getUser(),
      ])
      if (tResult.data) setTournament(tResult.data as Tournament)
      if (teamsResult.data) setTeams(teamsResult.data as TournamentTeam[])

      const userId = userEmail.data.user?.id
      const userEmailStr = userEmail.data.user?.email

      // Find team where user is captain
      const myTeam = userEmailStr
        ? (teamsResult.data as TournamentTeam[]).find((t) => t.captain_email === userEmailStr)
        : null

      // If not captain, find team where user is a player
      let targetTeamId = myTeam?.id ?? null
      if (!targetTeamId && userId) {
        const { data: playerRows } = await supabase
          .from("tournament_team_players")
          .select("team_id")
          .eq("user_id", userId)
        if (playerRows && playerRows.length > 0) {
          // Find which of those teams belong to this tournament
          const teamIds = new Set((teamsResult.data as TournamentTeam[]).map((t) => t.id))
          const match = playerRows.find((r) => teamIds.has(r.team_id))
          if (match) targetTeamId = match.team_id
        }
      }

      setPlayerTeamId(targetTeamId)

      if (targetTeamId) {
        const { data: pData } = await supabase
          .from("tournament_team_players")
          .select("*")
          .eq("team_id", targetTeamId)
          .order("name")
        if (pData) setPlayers(pData as TournamentTeamPlayer[])
      }
      setLoading(false)
    }
    void fetch()
  }, [tournamentId])

  const handleUpdateShirt = async (playerId: string) => {
    if (!isCaptain) return
    const num = Number(editShirtValue)
    if (!editShirtValue || isNaN(num) || num < 1) {
      setEditingShirtId(null)
      return
    }
    setSavingShirt(true)
    const { error } = await supabase
      .from("tournament_team_players")
      .update({ shirt_number: num })
      .eq("id", playerId)
    if (!error) {
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...p, shirt_number: num } : p))
      )
    }
    setSavingShirt(false)
    setEditingShirtId(null)
    setEditShirtValue("")
  }

  const handleDeletePlayer = async (playerId: string) => {
    if (!isCaptain) return
    const { error } = await supabase
      .from("tournament_team_players")
      .delete()
      .eq("id", playerId)
    if (!error) {
      setPlayers((prev) => prev.filter((p) => p.id !== playerId))
    }
    setDeletingPlayerId(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-6">
        <div className="mx-auto w-full max-w-5xl space-y-4">
          <div className="h-3 w-20 animate-pulse rounded-full bg-muted" />
          <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
          <div className="lg:grid lg:grid-cols-3 lg:gap-6">
            <div className="lg:col-span-2 space-y-4">
              <div className="card p-5 space-y-3">
                <div className="h-4 w-32 animate-pulse rounded-lg bg-muted" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
                <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
              </div>
              <div className="card p-5 space-y-3">
                <div className="h-4 w-40 animate-pulse rounded-lg bg-muted" />
                <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
                <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
                <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
              </div>
            </div>
            <div className="lg:col-span-1 space-y-4">
              <div className="card p-5 space-y-3">
                <div className="h-3 w-20 animate-pulse rounded-full bg-muted" />
                <div className="h-5 w-3/4 animate-pulse rounded-lg bg-muted" />
                <div className="h-3 w-full animate-pulse rounded-lg bg-muted" />
                <div className="space-y-2">
                  <div className="h-3 w-32 animate-pulse rounded-lg bg-muted" />
                  <div className="h-3 w-28 animate-pulse rounded-lg bg-muted" />
                  <div className="h-3 w-36 animate-pulse rounded-lg bg-muted" />
                </div>
              </div>
              <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!tournament) {
    return (
      <div className="min-h-screen bg-background px-4 py-8">
        <div className="mx-auto w-full max-w-md card p-6 text-center">
          <p className="text-lg font-heading font-bold text-foreground">Torneo no encontrado</p>
          <p className="mt-1 text-sm text-muted-foreground">El torneo no existe o fue eliminado.</p>
          <Link href="/tournaments" className="mt-4 inline-block text-sm text-primary hover:text-primary/80">
            Ver torneos disponibles
          </Link>
        </div>
      </div>
    )
  }

  const isOwner = !authLoading && user && tournament.owner_id === user.id
  const spotsLeft = tournament.max_teams - teams.length

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-5xl space-y-4 px-4 py-6">
        <Link
          href="/tournaments"
          className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground transition-colors duration-200 hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
          Torneos
        </Link>

        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest">
              <span className={`size-2 rounded-full ${
                tournament.status === "open" ? "bg-green-500" :
                tournament.status === "in_progress" ? "bg-blue-500" :
                tournament.status === "finished" ? "bg-muted-foreground" :
                "bg-yellow-500"
              }`} />
              <span className={
                tournament.status === "open" ? "text-green-500" :
                tournament.status === "in_progress" ? "text-blue-500" :
                tournament.status === "finished" ? "text-muted-foreground" :
                "text-yellow-500"
              }>
                {tournament.status === "open" && "Abierto"}
                {tournament.status === "draft" && "Borrador"}
                {tournament.status === "in_progress" && "En curso"}
                {tournament.status === "finished" && "Finalizado"}
              </span>
            </span>
            <h1 className="text-lg font-heading font-bold text-foreground">{tournament.name}</h1>
            {tournament.starts_at && (
              <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                <CalendarDays className="size-4 shrink-0" />
                {new Date(tournament.starts_at).toLocaleDateString("es-CO", { dateStyle: "long" })}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Users className="size-4 shrink-0" />
              {teams.length}/{tournament.max_teams} equipos
              {spotsLeft > 0 && <span className="text-primary"> ({spotsLeft} cupos)</span>}
            </span>
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Swords className="size-4 shrink-0" />
              <span className="capitalize">
                {tournament.tournament_type === "league" ? "Liga" : "Grupos + fase final"}
              </span>
            </span>
          </div>
        </div>

        <div className="lg:grid lg:grid-cols-3 lg:gap-6">

          {/* LEFT: Teams + Players */}
          <div className="lg:col-span-2 space-y-4">

            {userTeam && (
              <section className="card p-5">
                <h2 className="text-sm font-semibold text-foreground">Jugadores de {userTeam.name}</h2>

                {players.length === 0 && (
                  <div className="mt-3 text-center py-4">
                    <p className="text-sm text-muted-foreground">Aún no hay jugadores registrados.</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Comparte el link para que se unan al equipo.</p>
                  </div>
                )}

                {players.length > 0 && (
                  <ul className="mt-3 space-y-1.5">
                    {players.map((player) => (
                      <li key={player.id} className="flex items-center gap-3 rounded-lg border border-border bg-background/30 px-3 py-2">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                          {player.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">
                            {player.name}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            {player.phone && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Phone className="size-3 shrink-0" />
                                {player.phone}
                              </span>
                            )}
                            {player.email && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Mail className="size-3 shrink-0" />
                                {player.email}
                              </span>
                            )}
                            {player.document_type && player.document_number && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <FileText className="size-3 shrink-0" />
                                {player.document_type} {player.document_number}
                              </span>
                            )}
                            {player.blood_type && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Droplets className="size-3 shrink-0" />
                                {player.blood_type}
                              </span>
                            )}
                            {player.emergency_contact_name && (
                              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                <Heart className="size-3 shrink-0" />
                                {player.emergency_contact_name}
                                {player.emergency_contact_phone && <> — {player.emergency_contact_phone}</>}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Captain actions: shirt number edit + delete */}
                        {isCaptain && (
                        <div className="flex shrink-0 items-center gap-1">
                          {editingShirtId === player.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                value={editShirtValue}
                                onChange={(e) => setEditShirtValue(e.target.value.replace(/\D/g, "").slice(0, 3))}
                                className="w-12 rounded border border-primary/50 bg-background px-1.5 py-1 text-center text-xs font-medium outline-none focus:border-primary"
                                placeholder="#"
                                inputMode="numeric"
                                autoFocus
                              />
                              <button
                                type="button"
                                onClick={() => void handleUpdateShirt(player.id)}
                                disabled={savingShirt}
                                className="flex cursor-pointer items-center justify-center rounded p-1 text-green-500 transition-colors hover:bg-green-500/10 disabled:opacity-50"
                              >
                                {savingShirt ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditingShirtId(null); setEditShirtValue("") }}
                                className="flex cursor-pointer items-center justify-center rounded p-1 text-muted-foreground transition-colors hover:bg-muted"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => { setEditingShirtId(player.id); setEditShirtValue(player.shirt_number ? String(player.shirt_number) : "") }}
                                className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold transition-colors ${
                                  player.shirt_number
                                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                                    : "border border-dashed border-muted-foreground/30 text-muted-foreground/50 hover:border-primary/50 hover:text-primary"
                                }`}
                                title={player.shirt_number ? "Editar número" : "Asignar número"}
                              >
                                <Shirt className="size-3" />
                                {player.shirt_number ?? "—"}
                              </button>
                          </>
                          )}
                          {deletingPlayerId === player.id ? (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-red-400 font-medium whitespace-nowrap">¿Eliminar?</span>
                              <button
                                type="button"
                                onClick={() => void handleDeletePlayer(player.id)}
                                className="flex cursor-pointer items-center justify-center rounded p-1 text-red-500 transition-colors hover:bg-red-500/10"
                              >
                                <Check className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingPlayerId(null)}
                                className="flex cursor-pointer items-center justify-center rounded p-1 text-muted-foreground transition-colors hover:bg-muted"
                              >
                                <X className="size-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeletingPlayerId(player.id)}
                              className="flex cursor-pointer items-center justify-center rounded p-1 text-muted-foreground/50 transition-colors hover:text-red-500 hover:bg-red-500/10"
                              title="Eliminar jugador"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                        )}
                      </li>
                      ))}
                  </ul>
                )}

                {players.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-semibold text-muted-foreground">Números de camiseta</p>
                    <div className="grid grid-cols-10 gap-1">
                      {Array.from({ length: 99 }, (_, i) => i + 1).map((num) => {
                        const taken = players.some((p) => p.shirt_number === num)
                        return taken ? (
                          <span
                            key={num}
                            className="flex size-6 items-center justify-center rounded bg-primary/15 text-[10px] font-semibold text-primary"
                          >
                            {num}
                          </span>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
              </section>
            )}

            <section className="card p-5">
              <h2 className="text-sm font-semibold text-foreground">Equipos inscritos</h2>
              {teams.length === 0 ? (
                <div className="mt-3 text-center py-6">
                  <Users className="mx-auto size-8 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">Aún no hay equipos inscritos.</p>
                  {tournament.status === "open" && !isOwner && !userTeam && (
                    <Link
                      href={`/tournaments/${tournamentId}/register`}
                      className="mt-3 inline-block text-sm font-semibold text-primary hover:text-primary/80"
                    >
                      Sé el primero en inscribirte
                    </Link>
                  )}
                </div>
              ) : (
                <ul className="mt-3 space-y-2">
                  {teams.map((team) => {
                    const isUsersTeam = userTeam?.id === team.id
                    return (
                      <li
                        key={team.id}
                        className={`flex items-center justify-between rounded-lg border px-3 py-2 ${
                          isUsersTeam
                            ? "border-primary/30 bg-primary/5"
                            : "border-border bg-background/50"
                        }`}
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {team.name}
                            {isUsersTeam && <span className="ml-1.5 text-xs text-primary">(tu equipo)</span>}
                          </p>
                          {team.kit_colors && (
                            <p className="text-xs text-muted-foreground">{team.kit_colors}</p>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1 text-xs ${isUsersTeam ? "text-primary" : "text-muted-foreground"}`}>
                          <ShieldCheck className="size-3" />
                          Inscrito
                        </span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

          </div>

{/* RIGHT: Rules + Actions */}
          <div className="lg:col-span-1 space-y-4">

            {tournament.description && (
              <div className="card p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Descripción</p>
                <p className="mt-1 text-sm text-muted-foreground">{tournament.description}</p>
              </div>
            )}

            {tournament.rules_text && (
              <div className="card p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Reglas</p>
                <div className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  <RichTextRenderer html={tournament.rules_text} />
                </div>
              </div>
            )}

            {isCaptain && mounted && captainTeam && (
              <div className="card p-4 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Invitar jugadores</p>
                <ShareActions
                  copyText={`${window.location.origin}/tournaments/${tournamentId}/teams/${captainTeam.id}/join`}
                  copiedStatusText="Link copiado al portapapeles"
                  whatsappText={`¡Únete al equipo ${captainTeam.name} en este torneo de fútbol! ${window.location.origin}/tournaments/${tournamentId}/teams/${captainTeam.id}/join`}
                  emailSubject={`Invitación al equipo ${captainTeam.name}`}
                  emailBody={`Has sido invitado al equipo ${captainTeam.name}. Únete aquí: ${window.location.origin}/tournaments/${tournamentId}/teams/${captainTeam.id}/join`}
                  nativeShare={{ title: `Equipo ${captainTeam.name}`, text: `Únete al equipo ${captainTeam.name} en este torneo de fútbol`, url: `${window.location.origin}/tournaments/${tournamentId}/teams/${captainTeam.id}/join` }}
                  copyTooltip="Copiar enlace"
                />
              </div>
            )}

            <div className="flex flex-col gap-2">
              {tournament.status === "open" && !isOwner && !userTeam && (
                <Link
                  href={`/tournaments/${tournamentId}/register`}
                  className="btn-primary-fm inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
                >
                  <ShieldCheck className="size-4" />
                  Inscribir equipo
                </Link>
              )}

              {userTeam && (
                <Link
                  href={`/tournaments/${tournamentId}/register`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/10"
                >
                  <ShieldCheck className="size-4" />
                  {userTeam.name} — inscrito
                </Link>
              )}

              {isOwner && (
                <Link
                  href={`/tournaments/${tournamentId}/manage`}
                  className="btn-primary-fm inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold"
                >
                  <Trophy className="size-4" />
                  Administrar torneo
                </Link>
              )}

              <Link
                href="/tournaments"
                className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-semibold text-foreground transition-colors duration-200 hover:bg-muted"
              >
                Ver torneos disponibles
              </Link>
            </div>

          </div>

        </div>
      </main>
    </div>
  )
}
