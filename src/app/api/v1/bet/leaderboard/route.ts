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

export const runtime = "edge";

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-admin'
import { ErrorCode } from '@/types/bet'

interface LeaderboardEntry {
  rank: number
  user_id: string
  user_email?: string
  name: string
  points_total: number
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'MISSING_ENV', message: 'Server configuration error' } },
        { status: 500 }
      )
    }

    const { searchParams } = new URL(request.url)
    const mode = (searchParams.get('mode') || 'global') as 'global' | 'pool'
    const poolId = searchParams.get('pool_id')
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
      .select('user_id, points_total', {
        count: 'exact',
      })
      .eq('mode', mode)

    // Filter by pool if pool mode
    if (mode === 'pool') {
      query = query.eq('pool_id', poolId)
    } else {
      query = query.is('pool_id', null)
    }

    // tournament_id is part of the public contract, but the aggregate table
    // currently stores global/pool totals only, so it is intentionally ignored.

    // Order by points descending
    query = query.order('points_total', { ascending: false })

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

    // Resolve user names from auth metadata
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const userMetaMap = new Map<string, { email: string; fullName: string | null }>()
    if (authUsers?.users) {
      for (const u of authUsers.users) {
        const meta = u.user_metadata as Record<string, unknown> | undefined
        const fullName = (typeof meta?.full_name === 'string' && meta.full_name.trim()) ? meta.full_name.trim() : null
        userMetaMap.set(u.id, { email: u.email ?? 'Unknown', fullName })
      }
    }

    // Transform to LeaderboardEntry with rank
    const entries: LeaderboardEntry[] = (data || []).map((item: any, index: number) => {
      const meta = userMetaMap.get(item.user_id) ?? { email: 'Unknown', fullName: null }
      let name: string
      if (meta.fullName) {
        name = meta.fullName
      } else {
        name = meta.email.split('@')[0].replace(/[._-]/g, ' ')
        name = name.replace(/\b\w/g, (c) => c.toUpperCase())
      }
      return {
        rank: offset + index + 1,
        user_id: item.user_id,
        user_email: meta.email,
        name,
        points_total: item.points_total,
      }
    })

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
