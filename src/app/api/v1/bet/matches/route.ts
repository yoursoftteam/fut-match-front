/**
 * GET /api/v1/bet/matches
 * 
 * Fetch all matches for a tournament (with optional filters)
 * 
 * Query Parameters:
 *   - tournament_id: Required. Tournament UUID
 *   - stage (optional): Filter by stage (group_stage, knockout, etc.)
 *   - group_name (optional): Filter by group (A, B, C, etc.)
 *   - status (optional): Filter by status (scheduled, live, finished)
 * 
 * Response: 200 OK
 *   {
 *     success: true,
 *     data: Match[] (with denormalized home_team and away_team),
 *     count: number,
 *     error: null
 *   }
 * 
 * Error Responses:
 *   - 400: Missing required parameters
 *   - 500: Internal server error
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from 'next/server'
import { getAnonClient } from '@/lib/supabase-admin'
import { Match } from '@/types/bet'

export async function GET(request: NextRequest) {
  try {
    const supabase = getAnonClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'MISSING_ENV', message: 'Server configuration error' } },
        { status: 500 }
      )
    }
    const { searchParams } = new URL(request.url)
    const tournamentId = searchParams.get('tournament_id')
    const stage = searchParams.get('stage')
    const groupName = searchParams.get('group_name')
    const status = searchParams.get('status')

    // Tournament ID is required
    if (!tournamentId) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          count: 0,
          error: {
            code: 'MISSING_PARAMETER',
            message: 'tournament_id is required',
          },
        },
        { status: 400 }
      )
    }

    // Build base query with JOINs for team data
    let query = supabase
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
      .eq('tournament_id', tournamentId)
      .order('kickoff_at', { ascending: true })

    // Apply optional filters
    if (stage) {
      query = query.eq('stage', stage)
    }
    if (groupName) {
      query = query.eq('group_name', groupName)
    }
    if (status) {
      query = query.eq('status', status)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        {
          success: false,
          data: null,
          count: 0,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch matches',
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: (data || []) as unknown as Match[],
        count: count || 0,
        error: null,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Unexpected error in GET /api/v1/bet/matches:', err)
    return NextResponse.json(
      {
        success: false,
        data: null,
        count: 0,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred',
        },
      },
      { status: 500 }
    )
  }
}
