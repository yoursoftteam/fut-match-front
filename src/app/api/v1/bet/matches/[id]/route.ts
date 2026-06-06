/**
 * GET /api/v1/bet/matches/[id]
 * 
 * Fetch a specific match by ID with all related data
 * 
 * Path Parameters:
 *   - id: Match UUID
 * 
 * Response: 200 OK
 *   {
 *     success: true,
 *     data: Match (with home_team and away_team denormalized),
 *     error: null
 *   }
 * 
 * Error Responses:
 *   - 404: Match not found
 *   - 500: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-admin'
import { Match, ErrorCode } from '@/types/bet'

interface RouteParams {
  id: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<RouteParams> }
) {
  try {
    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'MISSING_ENV', message: 'Server configuration error' } },
        { status: 500 }
      )
    }
    // Await params as per Next.js 16 convention
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: ErrorCode.MATCH_NOT_FOUND,
            message: 'Match ID is required',
          },
        },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('bet_matches')
      .select(
        `
        id,
        tournament_id,
        stage,
        group_name,
        kickoff_at,
        home_team_id,
        away_team_id,
        home_placeholder,
        away_placeholder,
        venue,
        fifa_match_number,
        home_score_official,
        away_score_official,
        status,
        created_at,
        updated_at,
        home_team:bet_teams!home_team_id(id, name, fifa_code, flag_svg_url),
        away_team:bet_teams!away_team_id(id, name, fifa_code, flag_svg_url)
        `
      )
      .eq('id', id)
      .single()

    if (error || !data) {
      console.error('Match fetch error:', error)
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: ErrorCode.MATCH_NOT_FOUND,
            message: `Match with ID ${id} not found`,
          },
        },
        { status: 404 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: data as unknown as Match,
        error: null,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Unexpected error in GET /api/v1/bet/matches/[id]:', err)
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    )
  }
}
