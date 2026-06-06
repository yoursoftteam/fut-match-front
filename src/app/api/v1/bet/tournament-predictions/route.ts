import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-admin'
import { TournamentCategory } from '@/types/bet'

const VALID_CATEGORIES: TournamentCategory[] = ['champion', 'subchampion', 'third_place']

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'MISSING_ENV', message: 'Server configuration error' } },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const poolId = searchParams.get('pool_id')
    if (!poolId) {
      return NextResponse.json({ success: false, data: null, error: { code: 'INVALID_REQUEST', message: 'pool_id is required' } }, { status: 400 })
    }

    const { data: pool } = await supabase
      .from('bet_pools')
      .select('competition_type')
      .eq('id', poolId)
      .maybeSingle()

    if (pool?.competition_type === 'predictions') {
      return NextResponse.json({ success: true, data: [], message: 'Tournament predictions are disabled for prediction competitions', error: null }, { status: 200 })
    }

    const { data: predictions, error } = await supabase
      .from('bet_tournament_predictions')
      .select('*, team:team_id(id, name, fifa_code, flag_svg_url)')
      .eq('user_id', user.id)
      .eq('pool_id', poolId)

    if (error) {
      throw new Error(`Failed to fetch tournament predictions: ${error.message}`)
    }

    return NextResponse.json({ success: true, data: predictions ?? [], message: 'Tournament predictions fetched', error: null }, { status: 200 })
  } catch (err) {
    console.error('Error in GET /api/v1/bet/tournament-predictions:', err)
    return NextResponse.json({ success: false, data: null, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'MISSING_ENV', message: 'Server configuration error' } },
        { status: 500 }
      )
    }

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, { status: 401 })
    }

    const body = await request.json()
    const { pool_id, category, team_id } = body

    if (!pool_id || !category || !team_id) {
      return NextResponse.json({ success: false, data: null, error: { code: 'INVALID_REQUEST', message: 'pool_id, category, and team_id are required' } }, { status: 400 })
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return NextResponse.json({ success: false, data: null, error: { code: 'INVALID_REQUEST', message: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` } }, { status: 400 })
    }

    const { data: pool } = await supabase
      .from('bet_pools')
      .select('competition_type')
      .eq('id', pool_id)
      .maybeSingle()

    if (pool?.competition_type === 'predictions') {
      return NextResponse.json({ success: false, data: null, error: { code: 'INVALID_POOL_MODE', message: 'Tournament predictions are disabled for prediction competitions' } }, { status: 400 })
    }

    const { data: membership } = await supabase
      .from('bet_pool_members')
      .select('id')
      .eq('pool_id', pool_id)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ success: false, data: null, error: { code: 'UNAUTHORIZED_POOL_ACCESS', message: 'You are not a member of this pool' } }, { status: 403 })
    }

    const { data: existing } = await supabase
      .from('bet_tournament_predictions')
      .select('id')
      .eq('user_id', user.id)
      .eq('pool_id', pool_id)
      .eq('category', category)
      .single()

    let response
    let statusCode = 201

    if (existing) {
      const { data: updated, error: updateError } = await supabase
        .from('bet_tournament_predictions')
        .update({ team_id, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select('*, team:team_id(id, name, fifa_code, flag_svg_url)')
        .single()

      if (updateError) throw new Error(`Failed to update: ${updateError.message}`)
      response = updated
      statusCode = 200
    } else {
      const { data: created, error: createError } = await supabase
        .from('bet_tournament_predictions')
        .insert({
          mode: 'pool',
          user_id: user.id,
          pool_id,
          category,
          team_id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select('*, team:team_id(id, name, fifa_code, flag_svg_url)')
        .single()

      if (createError) throw new Error(`Failed to create: ${createError.message}`)
      response = created
    }

    return NextResponse.json({ success: true, data: response, message: statusCode === 201 ? 'Tournament prediction created' : 'Tournament prediction updated', error: null }, { status: statusCode })
  } catch (err) {
    console.error('Error in POST /api/v1/bet/tournament-predictions:', err)
    return NextResponse.json({ success: false, data: null, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } }, { status: 500 })
  }
}
