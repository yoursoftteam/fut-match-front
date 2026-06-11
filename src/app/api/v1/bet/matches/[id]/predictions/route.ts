export const runtime = "edge";

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-admin'
import { calculateMatchPredictionPoints, MatchScoringConfig } from '@/lib/bet-scoring'
import { PREDICTION_COMPETITION_CONFIG } from '@/types/bet'

export interface MatchPredictionEntry {
  user_id: string
  name: string
  home_score_predicted: number
  away_score_predicted: number
  points_earned: number
}

export interface MatchPredictionsResponse {
  match: {
    home_team: { name: string; fifa_code: string; flag_svg_url: string } | null
    away_team: { name: string; fifa_code: string; flag_svg_url: string } | null
    home_score_official: number | null
    away_score_official: number | null
    status: string
  }
  predictions: MatchPredictionEntry[]
  total_predictions: number
}

export async function GET(
  _request: NextRequest,
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

    const { id: matchId } = await params
    const { searchParams } = new URL(_request.url)
    const poolId = searchParams.get('pool_id')

    if (!poolId) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'MISSING_PARAMETER', message: 'pool_id is required' } },
        { status: 400 }
      )
    }

    const { data: match, error: matchError } = await supabase
      .from('bet_matches')
      .select(`
        home_score_official,
        away_score_official,
        status,
        home_team:bet_teams!home_team_id(id, name, fifa_code, flag_svg_url),
        away_team:bet_teams!away_team_id(id, name, fifa_code, flag_svg_url)
      `)
      .eq('id', matchId)
      .single()

    if (matchError || !match) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'MATCH_NOT_FOUND', message: 'Match not found' } },
        { status: 404 }
      )
    }

    const { data: predictions, error: predError } = await supabase
      .from('bet_match_predictions')
      .select('user_id, home_score_predicted, away_score_predicted')
      .eq('match_id', matchId)
      .eq('pool_id', poolId)
      .eq('mode', 'pool')

    if (predError) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'DATABASE_ERROR', message: 'Failed to fetch predictions' } },
        { status: 500 }
      )
    }

    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const userMetaMap = new Map<string, { name: string }>()
    if (authUsers?.users) {
      for (const u of authUsers.users) {
        const meta = u.user_metadata as Record<string, unknown> | undefined
        const fullName = (typeof meta?.full_name === 'string' && meta.full_name.trim())
          ? meta.full_name.trim()
          : null
        const name = fullName ?? (u.email?.split('@')[0].replace(/[._-]/g, ' ') ?? 'Unknown')
        userMetaMap.set(u.id, { name })
      }
    }

    let config: MatchScoringConfig = PREDICTION_COMPETITION_CONFIG
    const { data: poolConfig } = await supabase
      .from('bet_pool_config_versions')
      .select('pts_winner_selection, pts_exact_score, pts_team_goals, pts_goal_difference')
      .eq('pool_id', poolId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (poolConfig) {
      config = poolConfig
    }

    const homeScore = match.home_score_official
    const awayScore = match.away_score_official
    const hasResult = homeScore !== null && awayScore !== null && match.status === 'finished'

    const entries: MatchPredictionEntry[] = (predictions ?? []).map((p) => {
      const meta = userMetaMap.get(p.user_id) ?? { name: 'Unknown' }
      return {
        user_id: p.user_id,
        name: meta.name,
        home_score_predicted: p.home_score_predicted,
        away_score_predicted: p.away_score_predicted,
        points_earned: hasResult
          ? calculateMatchPredictionPoints(config, homeScore!, awayScore!, p.home_score_predicted, p.away_score_predicted)
          : 0,
      }
    })

    entries.sort((a, b) => b.points_earned - a.points_earned)

    const response: MatchPredictionsResponse = {
      match: {
        home_team: (match.home_team as unknown as { name: string; fifa_code: string; flag_svg_url: string } | null) ?? null,
        away_team: (match.away_team as unknown as { name: string; fifa_code: string; flag_svg_url: string } | null) ?? null,
        home_score_official: homeScore,
        away_score_official: awayScore,
        status: match.status,
      },
      predictions: entries,
      total_predictions: entries.length,
    }

    return NextResponse.json({ success: true, data: response, error: null })
  } catch (err) {
    console.error('Unexpected error in GET /api/v1/bet/matches/[id]/predictions:', err)
    return NextResponse.json(
      { success: false, data: null, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } },
      { status: 500 }
    )
  }
}
