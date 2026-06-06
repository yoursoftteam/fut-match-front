'use client'

import { useMemo } from 'react'
import { Trophy, X } from 'lucide-react'
import { Match, MatchPrediction, MatchStage } from '@/types/bet'
import { calculateGroupStandings } from '@/lib/bet-utils'
import { cn } from '@/lib/utils'

interface GroupStandingsModalProps {
  groupName: string
  matches: Array<
    Match & {
      home_team?: { id: string; name: string; fifa_code: string; flag_svg_url?: string } | null
      away_team?: { id: string; name: string; fifa_code: string; flag_svg_url?: string } | null
    }
  >
  getPrediction: (matchId: string) => MatchPrediction | undefined
  onClose: () => void
}

export function GroupStandingsModal({ groupName, matches, getPrediction, onClose }: GroupStandingsModalProps) {
  const standings = useMemo(() => {
    const groupMatches = matches.filter(
      (m) => m.stage === MatchStage.GROUP_STAGE && m.group_name === groupName
    )

    const teamMap = new Map<string, { id: string; name: string; fifa_code: string; flag_svg_url?: string }>()

    for (const match of groupMatches) {
      if (match.home_team) teamMap.set(match.home_team.id, match.home_team)
      if (match.away_team) teamMap.set(match.away_team.id, match.away_team)
    }

    const matchInputs = groupMatches
      .map((match) => {
        const pred = getPrediction(match.id)
        if (!pred || !match.home_team || !match.away_team) return null
        return {
          homeTeamId: match.home_team.id,
          homeTeamName: match.home_team.name,
          awayTeamId: match.away_team.id,
          awayTeamName: match.away_team.name,
          homeScore: pred.home_score_predicted,
          awayScore: pred.away_score_predicted,
        }
      })
      .filter((m): m is NonNullable<typeof m> => m !== null)

    const allTeams = Array.from(teamMap.values())

    if (matchInputs.length === 0) {
      return {
        groupName,
        teams: allTeams.map((t) => ({
          team_id: t.id,
          team_name: t.name,
          fifa_code: t.fifa_code,
          flag_svg_url: t.flag_svg_url,
          played: 0,
          wins: 0,
          draws: 0,
          losses: 0,
          goals_for: 0,
          goals_against: 0,
          goal_difference: 0,
          points: 0,
        })),
      }
    }

    const calc = calculateGroupStandings(matchInputs, allTeams)
    return {
      groupName,
      teams: calc.teams.map((t) => ({
        ...t,
        flag_svg_url: allTeams.find((x) => x.id === t.team_id)?.flag_svg_url,
      })),
    }
  }, [groupName, matches, getPrediction])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Tabla de grupo ${groupName}`}
    >
      <div
        className="mx-4 w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-emerald-400" aria-hidden="true" />
            <h2 className="text-sm font-semibold text-slate-100">
              Grupo {groupName}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="p-4">
          <p className="mb-3 text-[0.6875rem] text-slate-500">
            Clasificación según tus picks · 3 pts victoria, 1 pt empate
          </p>
          <table className="w-full text-xs">
            <caption className="sr-only">Posiciones del grupo {groupName}</caption>
            <colgroup>
              <col className="w-6" />
              <col />
              <col className="w-6" />
              <col className="w-6" />
              <col className="w-6" />
              <col className="w-6" />
              <col className="w-6" />
              <col className="w-6" />
              <col className="w-7" />
            </colgroup>
            <thead>
              <tr className="text-[0.625rem] uppercase text-slate-500">
                <th scope="col" className="px-1 py-1.5 text-center font-semibold">#</th>
                <th scope="col" className="px-1 py-1.5 text-left font-semibold">Equipo</th>
                <th scope="col" className="px-1 py-1.5 text-center font-semibold">PJ</th>
                <th scope="col" className="px-1 py-1.5 text-center font-semibold">G</th>
                <th scope="col" className="px-1 py-1.5 text-center font-semibold">E</th>
                <th scope="col" className="px-1 py-1.5 text-center font-semibold">P</th>
                <th scope="col" className="px-1 py-1.5 text-center font-semibold">GF</th>
                <th scope="col" className="px-1 py-1.5 text-center font-semibold">GC</th>
                <th scope="col" className="px-1 py-1.5 text-center font-semibold">Pts</th>
              </tr>
            </thead>
            <tbody>
              {standings.teams.map((team, idx) => (
                <tr
                  key={team.team_id}
                  className={cn(
                    'border-t border-slate-800/60 transition-colors',
                    idx < 2 && 'bg-emerald-500/[0.03]'
                  )}
                >
                  <td className="px-1 py-1.5 text-center font-mono tabular-nums text-slate-500">
                    {idx + 1}
                  </td>
                  <td className="flex items-center gap-1.5 px-1 py-1.5">
                    {team.flag_svg_url ? (
                      <img
                        src={team.flag_svg_url}
                        alt=""
                        className="size-4 shrink-0 rounded-sm object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="size-4 shrink-0 rounded-sm border border-slate-700 bg-slate-800" />
                    )}
                    <span className="truncate font-medium text-slate-200">
                      {team.team_name}
                    </span>
                    <span className="hidden shrink-0 font-mono text-[0.625rem] text-slate-500 sm:inline" translate="no">
                      {team.fifa_code}
                    </span>
                  </td>
                  <td className="px-1 py-1.5 text-center font-mono tabular-nums text-slate-300">
                    {team.played}
                  </td>
                  <td className="px-1 py-1.5 text-center font-mono tabular-nums text-slate-300">
                    {team.wins}
                  </td>
                  <td className="px-1 py-1.5 text-center font-mono tabular-nums text-slate-300">
                    {team.draws}
                  </td>
                  <td className="px-1 py-1.5 text-center font-mono tabular-nums text-slate-300">
                    {team.losses}
                  </td>
                  <td className="px-1 py-1.5 text-center font-mono tabular-nums text-slate-300">
                    {team.goals_for}
                  </td>
                  <td className="px-1 py-1.5 text-center font-mono tabular-nums text-slate-300">
                    {team.goals_against}
                  </td>
                  <td className="px-1 py-1.5 text-center font-mono text-sm font-bold tabular-nums text-emerald-400">
                    {team.points}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
