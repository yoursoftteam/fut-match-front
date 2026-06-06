/**
 * GET /api/v1/bet/teams
 * 
 * Fetch all FIFA 2026 teams
 * 
 * Query Parameters:
 *   - tournament_id (optional): Filter by tournament
 * 
 * Response: 200 OK
 *   {
 *     success: true,
 *     data: Team[],
 *     count: number,
 *     error: null
 *   }
 * 
 * Error Responses:
 *   - 500: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAnonClient } from '@/lib/supabase-admin'
import { Team } from '@/types/bet'

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

    let query = supabase.from('bet_teams').select('*')

    // Optional filter by tournament
    if (tournamentId) {
      query = supabase.from('bet_teams').select('*').eq('tournament_id', tournamentId)
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
            message: 'Failed to fetch teams',
          },
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: true,
        data: (data || []) as Team[],
        count: count || 0,
        error: null,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Unexpected error in GET /api/v1/bet/teams:', err)
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
