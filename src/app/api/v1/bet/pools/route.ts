/**
 * POST /api/v1/bet/pools
 *
 * Create a new betting pool with initial configuration
 *
 * Request Body:
 *   {
 *     tournament_id: string (UUID),
 *     name: string (3-60 chars),
 *     visibility: "public" | "private",
 *     config: {
 *       lock_minutes?: number (default 10),
 *       pts_winner_selection?: number (default 3),
 *       pts_exact_score?: number (default 2),
 *       pts_team_goals?: number (default 1),
 *       pts_goal_difference?: number (default 1),
 *       pts_qualified_round_2?: number (default 5),
 *       pts_champion?: number (default 18),
 *       pts_subchampion?: number (default 15),
 *       pts_third_place?: number (default 12),
 *     }
 *     client_request_id?: string (for idempotency)
 *   }
 *
 * Response: 201 Created
 *   {
 *     success: true,
 *     data: {
 *       pool: { id, tournament_id, owner_id, name, visibility, invite_code, created_at },
 *       config: { id, pool_id, is_frozen, ...pts_* fields },
 *       invite_url: "https://parti2.app/join/ABC123DEF0"
 *     }
 *   }
 *
 * Error Responses:
 *   - 400: Invalid request
 *   - 401: Unauthorized
 *   - 404: Tournament not found
 *   - 500: Internal server error
 */

export const runtime = "edge";

import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedClient } from '@/lib/supabase-admin'
import {
  Pool,
  PoolCompetitionType,
  PoolConfigVersion,
  PREDICTION_COMPETITION_CONFIG,
} from '@/types/bet'
import { sanitizeText } from '@/lib/sanitize'

// Default pool configuration values
const DEFAULT_POOL_CREATE_CONFIG = {
  lock_minutes: 10,
  pts_winner_selection: 3,
  pts_exact_score: 2,
  pts_team_goals: 1,
  pts_goal_difference: 1,
  pts_qualified_round_2: 5,
  pts_champion: 18,
  pts_subchampion: 15,
  pts_third_place: 12,
}

const COMPETITION_TYPES: PoolCompetitionType[] = ['pool', 'predictions']

interface CreatePoolRequestBody {
  tournament_id: string
  name: string
  description?: string
  competition_type?: PoolCompetitionType
  visibility: 'public' | 'private'
  config?: Partial<typeof DEFAULT_POOL_CREATE_CONFIG>
  client_request_id?: string
}

interface CreatePoolResponse {
  success: true
  data: {
    pool: Pool
    config: PoolConfigVersion
    invite_url: string
  }
}

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
}

function validatePoolName(name: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!name || name.trim().length === 0) {
    errors.push('Pool name is required')
  }

  if (name.length < 3) {
    errors.push('Pool name must be at least 3 characters')
  }

  if (name.length > 60) {
    errors.push('Pool name must be at most 60 characters')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

function validateConfigValues(config: Record<string, number>): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  Object.entries(config).forEach(([key, value]) => {
    if (key === 'lock_minutes') {
      if (value < 1 || value > 60) {
        errors.push(`${key} must be between 1 and 60`)
      }
    } else if (typeof value === 'number') {
      if (value < 0 || value > 100) {
        errors.push(`${key} must be between 0 and 100`)
      }
    }
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse<{ success: true; data: { pools: Pool[] } } | ErrorResponse>> {
  try {
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
    const supabase = getAuthenticatedClient(token)
    if (!supabase) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'MISSING_ENV', message: 'Server configuration error' } },
        { status: 500 }
      )
    }

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

    const requestedCompetitionType =
      new URL(request.url).searchParams.get('competition_type') ?? 'pool'

    if (!COMPETITION_TYPES.includes(requestedCompetitionType as PoolCompetitionType)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_COMPETITION_TYPE',
            message: 'competition_type must be either "pool" or "predictions"',
          },
        } as ErrorResponse,
        { status: 400 }
      )
    }

    const page = Math.max(1, parseInt(new URL(request.url).searchParams.get('page') ?? '1', 10))
    const limit = Math.min(50, Math.max(1, parseInt(new URL(request.url).searchParams.get('limit') ?? '20', 10)))
    const from = (page - 1) * limit
    const to = from + limit - 1

    const scope = new URL(request.url).searchParams.get('scope') ?? 'mine'

    if (scope === 'public') {
      const { data: memberRows, error: memberError } = await supabase
        .from('bet_pool_members')
        .select('pool_id')
        .eq('user_id', user.id)

      if (memberError) throw memberError

      const excludeIds = new Set(memberRows?.map((r) => r.pool_id) ?? [])

      const {
        data: publicPools,
        error: poolsError,
        count: rawTotal,
      } = await supabase
        .from('bet_pools')
        .select('*', { count: 'exact', head: false })
        .eq('visibility', 'public')
        .eq('competition_type', requestedCompetitionType)
        .neq('owner_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to)

      if (poolsError) throw poolsError

      const available = (publicPools ?? []).filter(
        (p) => !excludeIds.has(p.id)
      )

      const poolsWithCounts = await Promise.all(
        available.map(async (pool) => {
          const { count } = await supabase
            .from('bet_pool_members')
            .select('id', { count: 'exact', head: true })
            .eq('pool_id', pool.id)

          return { ...pool, member_count: count || 0 }
        })
      )

      return NextResponse.json({
        success: true,
        data: { pools: poolsWithCounts, total_count: rawTotal ?? 0, page, limit },
      })
    }

    // Get all pool IDs where user is a member (includes owned pools)
    const { data: memberRows, error: memberError } = await supabase
      .from('bet_pool_members')
      .select('pool_id')
      .eq('user_id', user.id)

    if (memberError) throw memberError

    const poolIds = [...new Set(memberRows?.map((r) => r.pool_id) ?? [])]

    if (poolIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: { pools: [], total_count: 0, page, limit },
      })
    }

    const {
      data: pools,
      error: poolsError,
      count: totalCount,
    } = await supabase
      .from('bet_pools')
      .select('*', { count: 'exact', head: false })
      .in('id', poolIds)
      .eq('competition_type', requestedCompetitionType)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (poolsError) throw poolsError

    const poolsWithCounts = await Promise.all(
      (pools ?? []).map(async (pool) => {
        const { count } = await supabase
          .from('bet_pool_members')
          .select('id', { count: 'exact', head: true })
          .eq('pool_id', pool.id)

        return { ...pool, member_count: count || 0 }
      })
    )

    return NextResponse.json({
      success: true,
      data: { pools: poolsWithCounts, total_count: totalCount ?? 0, page, limit },
    })
  } catch (error) {
    console.error('List pools error:', error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Failed to list pools',
        },
      } as ErrorResponse,
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreatePoolResponse | ErrorResponse>> {
  try {
    // Parse request body
    const body: CreatePoolRequestBody = await request.json()

    // Validate required fields
    if (!body.tournament_id || !body.name || !body.visibility) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: tournament_id, name, visibility',
          },
        } as ErrorResponse,
        { status: 400 }
      )
    }

    // Validate visibility
    if (body.visibility !== 'public' && body.visibility !== 'private') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_VISIBILITY',
            message: 'Visibility must be either "public" or "private"',
          },
        } as ErrorResponse,
        { status: 400 }
      )
    }

    const competitionType = body.competition_type ?? 'pool'

    if (!COMPETITION_TYPES.includes(competitionType)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_COMPETITION_TYPE',
            message: 'competition_type must be either "pool" or "predictions"',
          },
        } as ErrorResponse,
        { status: 400 }
      )
    }

    // Sanitize pool name
    body.name = sanitizeText(body.name, 60)

    // Validate pool name
    const nameValidation = validatePoolName(body.name)
    if (!nameValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_POOL_NAME',
            message: nameValidation.errors.join('; '),
          },
        } as ErrorResponse,
        { status: 400 }
      )
    }

    // Sanitize description if provided
    if (body.description) {
      body.description = sanitizeText(body.description, 1000)
      if (body.description.length > 1000) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_DESCRIPTION',
              message: 'Description must be at most 1000 characters',
            },
          } as ErrorResponse,
          { status: 400 }
        )
      }
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
    const supabase = getAuthenticatedClient(token)
    if (!supabase) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'MISSING_ENV', message: 'Server configuration error' } },
        { status: 500 }
      )
    }

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

    // Verify tournament exists
    const { data: tournament, error: tournamentError } = await supabase
      .from('bet_tournaments')
      .select('id')
      .eq('id', body.tournament_id)
      .single()

    if (tournamentError || !tournament) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOURNAMENT_NOT_FOUND',
            message: `Tournament with ID ${body.tournament_id} not found`,
          },
        } as ErrorResponse,
        { status: 404 }
      )
    }

    const mergedConfig =
      competitionType === 'predictions'
        ? {
            ...PREDICTION_COMPETITION_CONFIG,
            lock_minutes:
              body.config?.lock_minutes ??
              PREDICTION_COMPETITION_CONFIG.lock_minutes,
          }
        : {
            ...DEFAULT_POOL_CREATE_CONFIG,
            ...(body.config || {}),
          }

    // Validate config values
    const configValidation = validateConfigValues(mergedConfig)
    if (!configValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CONFIG',
            message: configValidation.errors.join('; '),
          },
        } as ErrorResponse,
        { status: 400 }
      )
    }

    // Generate a random 10-character invite code
    // Using alphanumeric characters (uppercase + digits for better readability)
    const generateInviteCode = (): string => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let code = ''
      for (let i = 0; i < 10; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return code
    }

    // Try to insert pool (retry if invite_code collision, though unlikely)
    let pool: Pool | null = null
    let attempts = 0
    const maxAttempts = 3

    while (!pool && attempts < maxAttempts) {
      const inviteCode = generateInviteCode()

      const { data: insertedPool, error: poolError } = await supabase
        .from('bet_pools')
        .insert({
          tournament_id: body.tournament_id,
          owner_id: user.id,
          name: body.name,
          description: body.description || null,
          competition_type: competitionType,
          visibility: body.visibility,
          invite_code: inviteCode,
        })
        .select()
        .single()

      if (poolError) {
        if (poolError.code === '23505') {
          // Unique constraint violation - retry with new code
          attempts++
          continue
        }
        throw poolError
      }

      pool = insertedPool
    }

    if (!pool) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'POOL_CREATION_FAILED',
            message: 'Failed to create pool after multiple attempts',
          },
        } as ErrorResponse,
        { status: 500 }
      )
    }

    // Add owner as first member
    const { error: memberError } = await supabase
      .from('bet_pool_members')
      .insert({
        pool_id: pool.id,
        user_id: user.id,
      })

    if (memberError) {
      throw memberError
    }

    // Insert pool configuration
    const { data: config, error: configError } = await supabase
      .from('bet_pool_config_versions')
      .insert({
        pool_id: pool.id,
        lock_minutes: mergedConfig.lock_minutes,
        pts_winner_selection: mergedConfig.pts_winner_selection,
        pts_exact_score: mergedConfig.pts_exact_score,
        pts_team_goals: mergedConfig.pts_team_goals,
        pts_goal_difference: mergedConfig.pts_goal_difference,
        pts_qualified_round_2: mergedConfig.pts_qualified_round_2,
        pts_champion: mergedConfig.pts_champion,
        pts_subchampion: mergedConfig.pts_subchampion,
        pts_third_place: mergedConfig.pts_third_place,
        is_frozen: false,
      })
      .select()
      .single()

    if (configError) {
      throw configError
    }
    if (!config) {
      throw new Error('Pool config insert returned null without error — possible RLS violation or missing return')
    }

    // Build the invite URL (absolute canonical URL)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://parti2.app'
    const baseUrl = siteUrl.startsWith('http')
      ? siteUrl
      : `https://${siteUrl}`
    const inviteUrl = `${baseUrl}/join/${pool.invite_code}`

    return NextResponse.json(
      {
        success: true,
        data: {
          pool,
          config,
          invite_url: inviteUrl,
        },
      } as CreatePoolResponse,
      { status: 201 }
    )
  } catch (error) {
    const errorDetails = {
      type: typeof error,
      isNull: error === null,
      isArray: Array.isArray(error),
      message:
        error instanceof Error
          ? error.message
          : error && typeof error === 'object'
            ? JSON.stringify(error)
            : String(error),
      ...(error && typeof error === 'object' && !Array.isArray(error)
        ? {
            code: (error as Record<string, unknown>).code,
            details: (error as Record<string, unknown>).details,
            hint: (error as Record<string, unknown>).hint,
          }
        : {}),
    }
    console.error('Pool creation error:', JSON.stringify(errorDetails, null, 2))
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: `Failed to create pool: ${errorDetails.message}`,
          ...(errorDetails.code ? { details: errorDetails.code } : {}),
        },
      } as ErrorResponse,
      { status: 500 }
    )
  }
}
