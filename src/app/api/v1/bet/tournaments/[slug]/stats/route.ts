import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    if (!slug) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: 'MISSING_PARAMETER', message: 'slug is required' },
        },
        { status: 400 }
      )
    }

    const { data: tournament, error: tournError } = await supabase
      .from('bet_tournaments')
      .select('id, name')
      .eq('slug', slug)
      .maybeSingle()

    if (tournError) {
      console.error('Supabase tournament lookup error:', tournError)
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: 'DATABASE_ERROR', message: 'Failed to fetch tournament' },
        },
        { status: 500 }
      )
    }

    if (!tournament) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: 'NOT_FOUND', message: 'Tournament not found' },
        },
        { status: 404 }
      )
    }

    const { data: matches, error: matchesError } = await supabase
      .from('bet_matches')
      .select('stage, group_name, home_team_id, away_team_id, status')
      .eq('tournament_id', tournament.id)

    if (matchesError) {
      console.error('Supabase matches query error:', matchesError)
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: { code: 'DATABASE_ERROR', message: 'Failed to fetch matches' },
        },
        { status: 500 }
      )
    }

    const teamIds = new Set<string>()
    let groupStageMatches = 0
    let knockoutStageMatches = 0
    const groups = new Set<string | null>()
    let matchesCompleted = 0

    if (matches) {
      for (const match of matches) {
        if (match.home_team_id) teamIds.add(match.home_team_id)
        if (match.away_team_id) teamIds.add(match.away_team_id)

        if (match.stage === 'group_stage') {
          groupStageMatches++
          if (match.group_name) groups.add(match.group_name)
        } else {
          knockoutStageMatches++
        }

        if (match.status === 'finished') matchesCompleted++
      }
    }

    const totalMatches = groupStageMatches + knockoutStageMatches
    const completionPercentage =
      totalMatches > 0
        ? Math.round((matchesCompleted / totalMatches) * 10000) / 100
        : 0

    const response = NextResponse.json(
      {
        success: true,
        data: {
          stats: {
            total_teams: teamIds.size,
            total_groups: groups.size,
            group_stage_matches: groupStageMatches,
            knockout_stage_matches: knockoutStageMatches,
            matches_completed: matchesCompleted,
            completion_percentage: completionPercentage,
          },
        },
        error: null,
      },
      { status: 200 }
    )

    response.headers.set(
      'Cache-Control',
      'public, max-age=3600, s-maxage=3600'
    )

    return response
  } catch (error) {
    console.error('Unexpected error in GET /api/v1/bet/tournaments/[slug]/stats:', error)
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' },
      },
      { status: 500 }
    )
  }
}
