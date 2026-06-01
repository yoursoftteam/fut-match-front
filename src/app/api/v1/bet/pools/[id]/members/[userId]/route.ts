/**
 * DELETE /api/v1/bet/pools/[id]/members/[userId]
 *
 * Remove a member from a pool (pool owner only)
 *
 * Response: 200 OK
 *   { success: true, data: { removed: true } }
 *
 * Error Responses:
 *   - 400: Missing pool/user IDs
 *   - 401: Unauthorized
 *   - 403: Not the pool owner
 *   - 404: Member not found
 *   - 500: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
  }
}

interface SuccessResponse {
  success: true
  data: {
    removed: boolean
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
): Promise<NextResponse<SuccessResponse | ErrorResponse>> {
  try {
    const { id: poolId, userId: memberUserId } = await params

    if (!poolId || !memberUserId) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Missing pool or user ID' },
        } as ErrorResponse,
        { status: 400 }
      )
    }

    // Auth check
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' },
        } as ErrorResponse,
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        } as ErrorResponse,
        { status: 401 }
      )
    }

    // Verify the requester is the pool owner
    const { data: pool, error: poolError } = await supabase
      .from('bet_pools')
      .select('owner_id')
      .eq('id', poolId)
      .maybeSingle()

    if (poolError) throw poolError

    if (!pool) {
      return NextResponse.json(
        { success: false, error: { code: 'POOL_NOT_FOUND', message: 'Pool not found' } } as ErrorResponse,
        { status: 404 }
      )
    }

    if (pool.owner_id !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Only the pool owner can remove members' } } as ErrorResponse,
        { status: 403 }
      )
    }

    // Prevent removing the owner themselves
    if (memberUserId === user.id) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: 'Cannot remove yourself from the pool' } } as ErrorResponse,
        { status: 403 }
      )
    }

    // Check if the member exists
    const { data: member } = await supabase
      .from('bet_pool_members')
      .select('id')
      .eq('pool_id', poolId)
      .eq('user_id', memberUserId)
      .maybeSingle()

    if (!member) {
      return NextResponse.json(
        { success: false, error: { code: 'MEMBER_NOT_FOUND', message: 'Member not found in this pool' } } as ErrorResponse,
        { status: 404 }
      )
    }

    // Delete member predictions
    await supabase
      .from('bet_match_predictions')
      .delete()
      .eq('pool_id', poolId)
      .eq('user_id', memberUserId)

    // Delete tournament predictions
    await supabase
      .from('bet_tournament_predictions')
      .delete()
      .eq('pool_id', poolId)
      .eq('user_id', memberUserId)

    // Delete scores aggregate
    await supabase
      .from('bet_scores_aggregate')
      .delete()
      .eq('pool_id', poolId)
      .eq('user_id', memberUserId)

    // Delete the membership
    await supabase
      .from('bet_pool_members')
      .delete()
      .eq('pool_id', poolId)
      .eq('user_id', memberUserId)

    return NextResponse.json(
      { success: true, data: { removed: true } } as SuccessResponse,
      { status: 200 }
    )
  } catch (error) {
    console.error('Remove member error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to remove member' } } as ErrorResponse,
      { status: 500 }
    )
  }
}
