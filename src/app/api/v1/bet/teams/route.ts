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
import { createClient } from '@supabase/supabase-js'
import { Team } from '@/types/bet'

// Initialize Supabase client with service role (server-side)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(request: NextRequest) {
  try {
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
