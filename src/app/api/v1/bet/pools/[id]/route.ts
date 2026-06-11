/**
 * GET /api/v1/bet/pools/[id]
 *
 * Get detailed information about a pool
 *
 * Query Params:
 *   - include_members?: boolean (default false)
 *   - include_config?: boolean (default true)
 *
 * Response: 200 OK
 *   {
 *     success: true,
 *     data: {
 *       id: string,
 *       tournament_id: string,
 *       owner_id: string,
 *       name: string,
 *       visibility: "public" | "private",
 *       invite_code: string,
 *       created_at: string,
 *       config_active: { ... },
 *       members?: [ { id, email, joined_at } ],
 *       total_participants: number
 *     }
 *   }
 *
 * Error Responses:
 *   - 400: Invalid request
 *   - 401: Unauthorized (if private pool)
 *   - 404: Pool not found
 *   - 403: Access denied
 *   - 500: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server'
export const runtime = "edge";

import { getServiceClient } from '@/lib/supabase-admin'

interface PoolDetailResponse {
  success: true
  data: {
    id: string
    tournament_id: string
    owner_id: string
    name: string
    competition_type: string
    visibility: string
    invite_code: string
    created_at: string
    config_active: Record<string, unknown>
    members?: Array<{
      id: string
      email: string
      joined_at: string
    }>
    total_participants: number
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
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<PoolDetailResponse | ErrorResponse>> {
  try {
    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'MISSING_ENV', message: 'Server configuration error' } },
        { status: 500 }
      )
    }

    const { id: poolId } = await params

    if (!poolId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing pool ID',
          },
        } as ErrorResponse,
        { status: 400 }
      )
    }

    // Get user from Authorization header (optional for public pools)
    let currentUserId: string | null = null
    const authHeader = request.headers.get('authorization')

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7)
      const {
        data: { user },
      } = await supabase.auth.getUser(token)

      if (user) {
        currentUserId = user.id
      }
    }

    // Get query params
    const searchParams = new URL(request.url).searchParams
    const includeMembers = searchParams.get('include_members') === 'true'
    const includeConfig = searchParams.get('include_config') !== 'false'

    // Fetch pool
    const { data: pool, error: poolError } = await supabase
      .from('bet_pools')
      .select(
        `
        id,
        tournament_id,
        owner_id,
        name,
        competition_type,
        visibility,
        invite_code,
        created_at
      `
      )
      .eq('id', poolId)
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
            message: `Pool with ID ${poolId} not found`,
          },
        } as ErrorResponse,
        { status: 404 }
      )
    }

    // Check access permissions
    const isPublic = pool.visibility === 'public'
    const isOwner = currentUserId === pool.owner_id
    let isMember = false

    if (!isOwner && !isPublic) {
      // Check if user is a member of private pool
      if (currentUserId) {
        const { data: memberCheck } = await supabase
          .from('bet_pool_members')
          .select('id')
          .eq('pool_id', poolId)
          .eq('user_id', currentUserId)
          .maybeSingle()

        isMember = !!memberCheck
      }

      if (!isMember) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'You do not have access to this pool',
            },
          } as ErrorResponse,
          { status: 403 }
        )
      }
    } else if (!isOwner && isPublic) {
      // Check if user is a member (they might be)
      if (currentUserId) {
        const { data: memberCheck } = await supabase
          .from('bet_pool_members')
          .select('id')
          .eq('pool_id', poolId)
          .eq('user_id', currentUserId)
          .maybeSingle()

        isMember = !!memberCheck
      }
    }

    // Fetch active config
    let configActive: Record<string, unknown> = {}
    if (includeConfig) {
      const { data: config } = await supabase
        .from('bet_pool_config_versions')
        .select('*')
        .eq('pool_id', poolId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (config) {
        configActive = config
      }
    }

    // Fetch members if requested
    let members: Array<{ id: string; email: string; joined_at: string }> = []
    if (includeMembers && (isOwner || isMember)) {
      const { data: membersList } = await supabase
        .from('bet_pool_members')
        .select(
          `
          id,
          joined_at,
          user_id
        `
        )
        .eq('pool_id', poolId)

      if (membersList) {
        const memberUserIds = membersList.map((m) => m.user_id)
        const emailMap = new Map<string, string>()
        await Promise.all(
          memberUserIds.map((uid) =>
            supabase.auth.admin.getUserById(uid)
              .then(({ data: { user: u } }) => {
                if (u) emailMap.set(u.id, u.email ?? 'Unknown')
              })
          )
        )

        members = membersList.map((m) => ({
          id: m.user_id,
          email: emailMap.get(m.user_id) ?? 'Unknown',
          joined_at: m.joined_at,
        }))
      }
    }

    // Get total participants count
    const { count: totalParticipants } = await supabase
      .from('bet_pool_members')
      .select('id', { count: 'exact', head: true })
      .eq('pool_id', poolId)

    return NextResponse.json(
      {
        success: true,
        data: {
          ...pool,
          config_active: configActive,
          ...(includeMembers && { members }),
          total_participants: totalParticipants || 0,
        },
      } as PoolDetailResponse,
      { status: 200 }
    )
  } catch (error) {
    console.error('Pool detail error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to fetch pool details',
        },
      } as ErrorResponse,
      { status: 500 }
    )
  }
}
