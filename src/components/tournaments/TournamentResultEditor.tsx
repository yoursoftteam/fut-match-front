"use client"

import { useState } from "react"
import { CheckCircle2, Loader2, Trophy } from "lucide-react"
import type { TournamentMatch, TournamentTeam } from "@/lib/tournament-schema"

interface TournamentResultEditorProps {
  matches: TournamentMatch[]
  teams: TournamentTeam[]
  isOwner: boolean
  saving: boolean
  onUpdateScore: (matchId: string, homeGoals: number, awayGoals: number) => Promise<boolean>
  onUpdateStatus: (matchId: string, status: "pending" | "played" | "live") => Promise<boolean>
}

interface ScoreEditState {
  [matchId: string]: {
    home_goals: number
    away_goals: number
  }
}

export function TournamentResultEditor({
  matches,
  teams,
  isOwner,
  saving,
  onUpdateScore,
  onUpdateStatus,
}: TournamentResultEditorProps) {
  const [scores, setScores] = useState<ScoreEditState>(() => {
    const initial: ScoreEditState = {}
    for (const match of matches) {
      initial[match.id] = {
        home_goals: match.home_goals ?? 0,
        away_goals: match.away_goals ?? 0,
      }
    }
    return initial
  })
  const [localSaving, setLocalSaving] = useState<string | null>(null)

  const getTeamName = (teamId: string | null): string => {
    if (!teamId) return "TBD"
    return teams.find((t) => t.id === teamId)?.name ?? "TBD"
  }

  const handleScoreChange = (matchId: string, field: "home_goals" | "away_goals", value: number) => {
    setScores((prev) => ({
      ...prev,
      [matchId]: { ...prev[matchId], [field]: Math.max(0, Math.min(99, value)) },
    }))
  }

  const handleSave = async (matchId: string) => {
    setLocalSaving(matchId)
    const score = scores[matchId]
    if (!score) return
    await onUpdateScore(matchId, score.home_goals, score.away_goals)
    setLocalSaving(null)
  }

  const handleStatusToggle = async (match: TournamentMatch) => {
    const nextStatus = match.match_status === "pending" ? "live" : match.match_status === "live" ? "played" : "pending"
    await onUpdateStatus(match.id, nextStatus)
  }

  if (matches.length === 0) {
    return (
      <div className="card p-6 text-center">
        <Trophy className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">No hay partidos en esta jornada.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {matches.map((match) => {
        const score = scores[match.id]
        if (!score) return null
        const homeName = getTeamName(match.home_team_id)
        const awayName = getTeamName(match.away_team_id)
        const isPlayed = match.match_status === "played"
        const isLive = match.match_status === "live"
        const isSaving = localSaving === match.id || saving

        return (
          <div
            key={match.id}
            className={`card p-4 transition ${isLive ? "border-primary/50 ring-1 ring-primary/20" : ""}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm font-semibold text-foreground truncate flex-1 text-right">
                  {homeName}
                </span>

                {isOwner ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={score.home_goals}
                      onChange={(e) => handleScoreChange(match.id, "home_goals", Number(e.target.value))}
                      disabled={isSaving}
                      className="w-12 rounded-lg border border-border bg-background px-2 py-1.5 text-center text-sm font-bold text-foreground disabled:opacity-50"
                    />
                    <span className="text-xs font-bold text-muted-foreground">:</span>
                    <input
                      type="number"
                      min={0}
                      max={99}
                      value={score.away_goals}
                      onChange={(e) => handleScoreChange(match.id, "away_goals", Number(e.target.value))}
                      disabled={isSaving}
                      className="w-12 rounded-lg border border-border bg-background px-2 py-1.5 text-center text-sm font-bold text-foreground disabled:opacity-50"
                    />
                  </div>
                ) : (
                  <span className="shrink-0 text-sm font-bold text-foreground">
                    {match.home_goals ?? "?"}:{match.away_goals ?? "?"}
                  </span>
                )}

                <span className="text-sm font-semibold text-foreground truncate flex-1">{awayName}</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isLive && <span className="rounded-full bg-red-600/15 px-2 py-0.5 text-xs font-semibold text-red-400 animate-pulse">EN VIVO</span>}
                {isPlayed && <CheckCircle2 className="size-4 text-primary" />}

                {isOwner && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSave(match.id)}
                      disabled={isSaving}
                      className="btn-primary-fm inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-60"
                    >
                      {isSaving ? <Loader2 className="size-3 animate-spin" /> : null}
                      {isPlayed ? "Actualizar" : "Guardar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusToggle(match)}
                      disabled={isSaving}
                      className="inline-flex items-center rounded-lg border border-border px-2.5 py-1.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
                    >
                      {isLive ? "Finalizar" : isPlayed ? "Reabrir" : "En vivo"}
                    </button>
                  </>
                )}
              </div>
            </div>

            <p className="mt-1 text-xs text-muted-foreground">{match.phase_label}</p>
          </div>
        )
      })}
    </div>
  )
}
