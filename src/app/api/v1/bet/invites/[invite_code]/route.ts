/**
 * GET /api/v1/bet/invites/[invite_code]
 *
 * Get safe preview information about a pool via invite code
 * Used on /join/[invite_code] page to validate and show pool details
 *
 * Response: 200 OK
 *   {
 *     success: true,
 *     data: {
 *       pool_id: string,
 *       tournament_id: string,
 *       pool_name: string,
 *       owner_name: string (email or "Pool Creator"),
 *       competition_type: "pool" | "predictions",
 *       visibility: "public" | "private",
 *       total_members: number,
 *       created_at: string
 *     }
 *   }
 *
 * Error Responses:
 *   - 400: Invalid request
 *   - 404: Pool not found
 *   - 500: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-admin'

interface PoolPreviewResponse {
  success: true
  data: {
    pool_id: string
    tournament_id: string
    pool_name: string
    owner_name: string
    competition_type: string
    visibility: string
    total_members: number
    created_at: string
  }
}

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ invite_code: string }> }
): Promise<NextResponse<PoolPreviewResponse | ErrorResponse>> {
  try {
    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'MISSING_ENV', message: 'Server configuration error' } },
        { status: 500 }
      )
    }

    const { invite_code: rawCode } = await params

    if (!rawCode) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing invite code',
          },
        } as ErrorResponse,
        { status: 400 }
      )
    }

    // Normalize to uppercase
    const normalizedCode = rawCode.toUpperCase()

    // Get pool by invite code
    const { data: pool, error: poolError } = await supabase
      .from('bet_pools')
      .select(
        `
        id,
        tournament_id,
        name,
        owner_id,
        competition_type,
        visibility,
        created_at
      `
      )
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

    // Get owner email
    const { data: ownerData, error: ownerError } = await supabase.auth.admin.getUserById(
      pool.owner_id
    )

    const ownerEmail = ownerData?.user?.email || 'Pool Creator'

    // Get member count
    const { count: totalMembers } = await supabase
      .from('bet_pool_members')
      .select('id', { count: 'exact', head: true })
      .eq('pool_id', pool.id)

    return NextResponse.json(
      {
        success: true,
        data: {
          pool_id: pool.id,
          tournament_id: pool.tournament_id,
          pool_name: pool.name,
          owner_name: ownerEmail,
          competition_type: pool.competition_type,
          visibility: pool.visibility,
          total_members: totalMembers || 0,
          created_at: pool.created_at,
        },
      } as PoolPreviewResponse,
      { status: 200 }
    )
  } catch (error) {
    console.error('Pool preview error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch pool preview',
        },
      } as ErrorResponse,
      { status: 500 }
    )
  }
}
