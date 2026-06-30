import { NextRequest, NextResponse } from 'next/server'
export const runtime = "edge";

import { getServiceClient } from '@/lib/supabase-admin'

interface MatchScoreEntry {
  source_id: string
  points: number
  home_team_name: string | null
  away_team_name: string | null
  home_score_official: number | null
  away_score_official: number | null
  kickoff_at: string | null
}

interface TournamentScoreEntry {
  category: string
  points: number
  team_name: string | null
}

interface GroupPredictionEntry {
  group_name: string
  points: number
}

export interface PointsSummaryResponse {
  total_points: number
  sections: {
    matches: {
      points: number
      entries: MatchScoreEntry[]
    }
    tournament: {
      points: number
      entries: TournamentScoreEntry[]
    }
    group_prediction: {
      points: number
      entries: GroupPredictionEntry[]
    }
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'MISSING_ENV', message: 'Server configuration error' } },
        { status: 500 }
      )
    }

    const { id: poolId } = await params

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from('bet_pool_members')
      .select('id')
      .eq('pool_id', poolId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Not a pool member' } }, { status: 403 })
    }

    const { data: details } = await supabase
      .from('bet_scores_details')
      .select('source_type, source_id, points')
      .eq('mode', 'pool')
      .eq('pool_id', poolId)
      .eq('user_id', user.id)

    const safeDetails = details ?? []

    const matchEntryIds = safeDetails
      .filter(d => d.source_type === 'match')
      .map(d => d.source_id)

    const tournamentCategories = safeDetails
      .filter(d => d.source_type === 'tournament')
      .map(d => d.source_id)

    const matchEntriesMap = new Map<string, MatchScoreEntry>()
    if (matchEntryIds.length > 0) {
      const { data: matches } = await supabase
        .from('bet_matches')
        .select('id, home_score_official, away_score_official, home_team_id, away_team_id, kickoff_at')
        .in('id', matchEntryIds)

      const allTeamIds = [...new Set((matches ?? []).flatMap(m => [m.home_team_id, m.away_team_id]))]
      const { data: teams } = await supabase
        .from('bet_teams')
        .select('id, name')
        .in('id', allTeamIds)

      const teamMap = new Map((teams ?? []).map(t => [t.id, t.name]))

      for (const m of matches ?? []) {
        const detail = safeDetails.find(d => d.source_type === 'match' && d.source_id === m.id)
        matchEntriesMap.set(m.id, {
          source_id: m.id,
          points: detail?.points ?? 0,
          home_team_name: teamMap.get(m.home_team_id) ?? null,
          away_team_name: teamMap.get(m.away_team_id) ?? null,
          home_score_official: m.home_score_official ?? null,
          away_score_official: m.away_score_official ?? null,
          kickoff_at: m.kickoff_at ?? null,
        })
      }

      for (const detail of safeDetails.filter(d => d.source_type === 'match')) {
        if (!matchEntriesMap.has(detail.source_id)) {
          matchEntriesMap.set(detail.source_id, {
            source_id: detail.source_id,
            points: detail.points,
            home_team_name: null,
            away_team_name: null,
            home_score_official: null,
            away_score_official: null,
            kickoff_at: null,
          })
        }
      }
    }

    const tournamentDetailsMap = new Map<string, { team_name: string | null; points: number }>()
    const VALID_CATEGORIES = ['champion', 'subchampion', 'third_place'] as const
    if (tournamentCategories.length > 0) {
      const { data: predictions } = await supabase
        .from('bet_tournament_predictions')
        .select('category, team:team_id(id, name)')
        .eq('pool_id', poolId)
        .eq('user_id', user.id)
        .in('category', tournamentCategories.filter(c => VALID_CATEGORIES.includes(c as typeof VALID_CATEGORIES[number])))

      for (const pred of predictions ?? []) {
        const detail = safeDetails.find(d => d.source_type === 'tournament' && d.source_id === pred.category)
        const team = pred.team as unknown as { id: string; name: string } | null
        tournamentDetailsMap.set(pred.category, {
          team_name: team?.name ?? null,
          points: detail?.points ?? 0,
        })
      }

      for (const detail of safeDetails.filter(d => d.source_type === 'tournament')) {
        if (!tournamentDetailsMap.has(detail.source_id)) {
          tournamentDetailsMap.set(detail.source_id, {
            team_name: null,
            points: detail.points,
          })
        }
      }
    }

    const groupPredictionMap = new Map<string, number>()
    for (const detail of safeDetails.filter(d => d.source_type === 'group_prediction')) {
      groupPredictionMap.set(detail.source_id, detail.points)
    }

    const matchEntries = Array.from(matchEntriesMap.values()).sort((a, b) => {
      if (!a.kickoff_at && !b.kickoff_at) return 0
      if (!a.kickoff_at) return 1
      if (!b.kickoff_at) return -1
      return a.kickoff_at.localeCompare(b.kickoff_at)
    })
    const tournamentEntries = Array.from(tournamentDetailsMap.entries()).map(([category, val]) => ({
      category,
      points: val.points,
      team_name: val.team_name,
    }))
    const groupPredictionEntries = Array.from(groupPredictionMap.entries()).map(([group_name, points]) => ({
      group_name,
      points,
    }))

    const result: PointsSummaryResponse = {
      total_points: safeDetails.reduce((sum, d) => sum + d.points, 0),
      sections: {
        matches: {
          points: matchEntries.reduce((sum, e) => sum + e.points, 0),
          entries: matchEntries,
        },
        tournament: {
          points: tournamentEntries.reduce((sum, e) => sum + e.points, 0),
          entries: tournamentEntries,
        },
        group_prediction: {
          points: groupPredictionEntries.reduce((sum, e) => sum + e.points, 0),
          entries: groupPredictionEntries,
        },
      },
    }

    return NextResponse.json({ success: true, data: result, error: null })
  } catch (err) {
    console.error('Error in GET /api/v1/bet/pools/[id]/my-points-summary:', err)
    return NextResponse.json(
      { success: false, data: null, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
