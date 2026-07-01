"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, Trophy } from "lucide-react"
import type { KnockoutBracketMatch } from "@/lib/tournament-fixture"
import type { TournamentTeam } from "@/lib/tournament-schema"

interface TournamentBracketViewProps {
  matches: KnockoutBracketMatch[]
  teams: TournamentTeam[]
  isOwner: boolean
  saving: boolean
  onUpdateScore: (match: KnockoutBracketMatch, homeGoals: number, awayGoals: number) => Promise<boolean>
}

export function TournamentBracketView({
  matches,
  teams,
  isOwner,
  saving,
  onUpdateScore,
}: TournamentBracketViewProps) {
  const [editMatchId, setEditMatchId] = useState<string | null>(null)
  const [editHome, setEditHome] = useState(0)
  const [editAway, setEditAway] = useState(0)

  const getTeamName = (teamId: string | null): string => {
    if (!teamId) return "TBD"
    return teams.find((t) => t.id === teamId)?.name ?? "TBD"
  }

  const phases = Array.from(new Set(matches.map((m) => m.phase_label)))

  const handleStartEdit = (match: KnockoutBracketMatch) => {
    setEditMatchId(match.id)
    setEditHome(match.home_goals ?? 0)
    setEditAway(match.away_goals ?? 0)
  }

  const handleSave = async (match: KnockoutBracketMatch) => {
    await onUpdateScore(match, editHome, editAway)
    setEditMatchId(null)
  }

  if (matches.length === 0) {
    return (
      <div className="card p-6 text-center">
        <Trophy className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Aún no se ha generado el bracket de knockout.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {phases.map((phase) => {
        const phaseMatches = matches.filter((m) => m.phase_label === phase)
        return (
          <section key={phase} className="card p-4 sm:p-5">
            <h3 className="mb-4 text-sm font-bold uppercase tracking-widest text-primary">{phase}</h3>
            <div className="space-y-3">
              {phaseMatches.map((match) => {
                const isEditing = editMatchId === match.id
                const isPlayed = match.match_status === "played"
                const homeName = getTeamName(match.home_team_id)
                const awayName = getTeamName(match.away_team_id)

                let winnerLabel: string | null = null
                if (isPlayed && match.home_goals !== null && match.away_goals !== null) {
                  if (match.home_goals > match.away_goals) winnerLabel = homeName
                  else if (match.away_goals > match.home_goals) winnerLabel = awayName
                  else winnerLabel = homeName
                }

                return (
                  <div
                    key={match.id}
                    className="rounded-lg border border-border bg-background/70 p-3 transition hover:border-primary/30"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className={`text-sm font-semibold truncate ${winnerLabel === homeName ? "text-primary" : "text-foreground"}`}>
                          {homeName}
                        </span>

                        {isEditing ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <input
                              type="number"
                              min={0}
                              max={99}
                              value={editHome}
                              onChange={(e) => setEditHome(Math.max(0, Math.min(99, Number(e.target.value))))}
                              className="w-12 rounded border border-border bg-background px-2 py-1 text-center text-sm font-bold text-foreground"
                            />
                            <span className="text-xs font-bold text-muted-foreground">:</span>
                            <input
                              type="number"
                              min={0}
                              max={99}
                              value={editAway}
                              onChange={(e) => setEditAway(Math.max(0, Math.min(99, Number(e.target.value))))}
                              className="w-12 rounded border border-border bg-background px-2 py-1 text-center text-sm font-bold text-foreground"
                            />
                          </div>
                        ) : (
                          <span className="shrink-0 text-sm font-bold tabular-nums text-foreground">
                            {match.home_goals ?? "?"}:{match.away_goals ?? "?"}
                          </span>
                        )}

                        <span className={`text-sm font-semibold truncate ${winnerLabel === awayName ? "text-primary" : "text-foreground"}`}>
                          {awayName}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isPlayed && !isEditing && (
                          <>
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                              {winnerLabel} avanza
                            </span>
                            <CheckCircle2 className="size-4 text-primary" />
                          </>
                        )}

                        {match.match_status === "live" && (
                          <span className="rounded-full bg-red-600/15 px-2 py-0.5 text-xs font-semibold text-red-400 animate-pulse">EN VIVO</span>
                        )}

                        {isOwner && (
                          <>
                            {isEditing ? (
                              <button
                                type="button"
                                onClick={() => handleSave(match)}
                                disabled={saving}
                                className="btn-primary-fm inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-60"
                              >
                                {saving ? <Loader2 className="size-3 animate-spin" /> : null}
                                Guardar
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(match)}
                                className="inline-flex items-center rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted"
                              >
                                {isPlayed ? "Editar" : "Marcador"}
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )
      })}

      {matches.every((m) => m.match_status === "played") && (
        <div className="card border-primary/30 bg-primary/5 p-4 text-center">
          <Trophy className="mx-auto size-8 text-primary" />
          <p className="mt-2 text-lg font-heading font-bold text-foreground">¡Torneo completado!</p>
          <p className="text-sm text-muted-foreground">
            Campeón: {getTeamName(matches.find((m) => m.phase_label === "Final")?.home_team_id ?? null)}
          </p>
        </div>
      )}
    </div>
  )
}
