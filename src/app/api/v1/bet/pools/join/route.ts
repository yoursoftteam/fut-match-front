/**
 * POST /api/v1/bet/pools/join
 *
 * Join a pool using an invite code
 * Called both:
 * - After pool creation (owner joining their own pool)
 * - When invited user joins via /join/[invite_code] route
 *
 * Request Body:
 *   {
 *     invite_code: string (10-char alphanumeric)
 *   }
 *
 * Response: 200 OK
 *   {
 *     success: true,
 *     data: {
 *       pool_id: string (UUID),
 *       tournament_id: string (UUID),
 *       competition_type: "pool" | "predictions",
 *       next: string (redirect path, e.g. "/bet/pools/[poolId]")
 *     }
 *   }
 *
 * Error Responses:
 *   - 400: Invalid request
 *   - 401: Unauthorized
 *   - 404: Pool not found
 *   - 409: User already member
 *   - 500: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server'
export const runtime = "edge";

import { getServiceClient } from '@/lib/supabase-admin'

interface JoinPoolRequestBody {
  invite_code: string
}

interface JoinPoolResponse {
  success: true
  data: {
    pool_id: string
    tournament_id: string
    competition_type: string
    next: string
  }
}

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<JoinPoolResponse | ErrorResponse>> {
  try {
    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'MISSING_ENV', message: 'Server configuration error' } },
        { status: 500 }
      )
    }

    // Parse request body
    const body: JoinPoolRequestBody = await request.json()

    // Validate required fields
    if (!body.invite_code) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required field: invite_code',
          },
        } as ErrorResponse,
        { status: 400 }
      )
    }

    // Get user from Authorization header
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid Authorization header',
          },
        } as ErrorResponse,
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
          },
        } as ErrorResponse,
        { status: 401 }
      )
    }

    // Normalize invite code to uppercase
    const normalizedCode = body.invite_code.toUpperCase()

    // Get pool by invite code
    const { data: pool, error: poolError } = await supabase
      .from('bet_pools')
      .select('id, tournament_id, name, visibility, competition_type')
      .eq('invite_code', normalizedCode)
      .maybeSingle()

    if (poolError) {
      throw poolError
    }

    if (!pool) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'POOL_NOT_FOUND',
            message: `No pool found with invite code: ${normalizedCode}`,
          },
        } as ErrorResponse,
        { status: 404 }
      )
    }

    // Check if user is already a member
    const { data: existingMember, error: memberCheckError } = await supabase
      .from('bet_pool_members')
      .select('id')
      .eq('pool_id', pool.id)
      .eq('user_id', user.id)
      .maybeSingle()

    if (memberCheckError) {
      throw memberCheckError
    }

    if (existingMember) {
      // User is already a member - return 409 but with data so they can proceed
      return NextResponse.json(
        {
          success: true,
          data: {
            pool_id: pool.id,
            tournament_id: pool.tournament_id,
            competition_type: pool.competition_type,
            next:
              pool.competition_type === 'predictions'
                ? `/bet/predictions/${pool.id}`
                : `/bet/pools/${pool.id}`,
          },
        } as JoinPoolResponse,
        { status: 200 }
      )
    }

    // Add user as member (idempotent upsert)
    const { error: insertError } = await supabase
      .from('bet_pool_members')
      .upsert(
        {
          pool_id: pool.id,
          user_id: user.id,
        },
        {
          onConflict: 'pool_id,user_id',
        }
      )

    if (insertError) {
      throw insertError
    }

    // Return success with next redirect path
    return NextResponse.json(
      {
        success: true,
        data: {
          pool_id: pool.id,
          tournament_id: pool.tournament_id,
          competition_type: pool.competition_type,
          next:
            pool.competition_type === 'predictions'
              ? `/bet/predictions/${pool.id}`
              : `/bet/pools/${pool.id}`,
        },
      } as JoinPoolResponse,
      { status: 200 }
    )
  } catch (error) {
    console.error('Pool join error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to join pool',
        },
      } as ErrorResponse,
      { status: 500 }
    )
  }
}
