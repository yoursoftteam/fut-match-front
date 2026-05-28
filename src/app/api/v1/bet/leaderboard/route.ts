/**
 * GET /api/v1/bet/leaderboard
 * 
 * Fetch leaderboard standings for global or pool predictions
 * 
 * Query Parameters:
 *   - mode (optional): 'global' or 'pool' (default: 'global')
 *   - pool_id (required if mode='pool'): Pool UUID
 *   - tournament_id (optional): Filter by tournament
 *   - limit (optional): Max results (default: 100)
 *   - offset (optional): Pagination offset (default: 0)
 * 
 * Response: 200 OK
 *   {
 *     success: true,
 *     data: {
 *       entries: LeaderboardEntry[],
 *       total_count: number,
 *       mode: 'global' | 'pool',
 *       pool_id?: string
 *     },
 *     error: null
 *   }
 * 
 * Error Responses:
 *   - 400: Invalid parameters
 *   - 404: Pool not found
 *   - 500: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { PredictionMode, ErrorCode } from '@/types/bet'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface LeaderboardEntry {
  rank: number
  user_id: string
  user_email?: string
  points_total: number
  accuracy_percentage: number
  predictions_count: number
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const mode = (searchParams.get('mode') || 'global') as 'global' | 'pool'
    const poolId = searchParams.get('pool_id')
    const tournamentId = searchParams.get('tournament_id')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500)
    const offset = parseInt(searchParams.get('offset') || '0')

    // Validate mode
    if (mode !== 'global' && mode !== 'pool') {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'INVALID_MODE',
            message: "Mode must be 'global' or 'pool'",
          },
        },
        { status: 400 }
      )
    }

    // If pool mode, pool_id is required
    if (mode === 'pool' && !poolId) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'MISSING_PARAMETER',
            message: 'pool_id is required when mode=pool',
          },
        },
        { status: 400 }
      )
    }

    // Verify pool exists if in pool mode
    if (mode === 'pool') {
      const { data: pool, error: poolError } = await supabase
        .from('bet_pools')
        .select('id')
        .eq('id', poolId)
        .single()

      if (poolError || !pool) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: ErrorCode.POOL_NOT_FOUND,
              message: `Pool with ID ${poolId} not found`,
            },
          },
          { status: 404 }
        )
      }
    }

    // Fetch from denormalized leaderboard table (pre-calculated)
    let query = supabase
      .from('bet_scores_aggregate')
      .select('user_id, points_total, accuracy_percentage, predictions_count, user:auth.users(email)', {
        count: 'exact',
      })
      .eq('mode', mode)

    // Filter by pool if pool mode
    if (mode === 'pool') {
      query = query.eq('pool_id', poolId)
    } else {
      query = query.is('pool_id', null)
    }

    // Optional: filter by tournament
    if (tournamentId) {
      query = query.eq('tournament_id', tournamentId)
    }

    // Order by points descending, then by accuracy descending
    query = query.order('points_total', { ascending: false }).order('accuracy_percentage', { ascending: false })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Leaderboard fetch error:', error)
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'DATABASE_ERROR',
            message: 'Failed to fetch leaderboard',
          },
        },
        { status: 500 }
      )
    }

    // Transform to LeaderboardEntry with rank
    const entries: LeaderboardEntry[] = (data || []).map((item: any, index: number) => ({
      rank: offset + index + 1,
      user_id: item.user_id,
      user_email: item.user?.email,
      points_total: item.points_total,
      accuracy_percentage: item.accuracy_percentage,
      predictions_count: item.predictions_count,
    }))

    return NextResponse.json(
      {
        success: true,
        data: {
          entries,
          total_count: count || 0,
          mode,
          ...(mode === 'pool' && { pool_id: poolId }),
        },
        error: null,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Unexpected error in GET /api/v1/bet/leaderboard:', err)
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
