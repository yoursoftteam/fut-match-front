/**
 * POST /api/v1/bet/predictions
 * 
 * Create or update a prediction for a specific match
 * 
 * Request Body:
 *   {
 *     match_id: string (UUID),
 *     home_score_predicted: number (0-20),
 *     away_score_predicted: number (0-20),
 *     pool_id?: string (UUID) - if provided, prediction is for pool mode; else global
 *   }
 * 
 * Response: 201 Created / 200 Updated
 *   {
 *     success: true,
 *     data: MatchPrediction,
 *     message: "Prediction created/updated successfully",
 *     error: null
 *   }
 * 
 * Error Responses:
 *   - 400: Invalid request (missing fields, invalid scores, prediction locked)
 *   - 401: Unauthorized (no user session)
 *   - 404: Match/Pool not found
 *   - 500: Internal server error
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { validatePredictionScores, isPredictionLocked } from '@/lib/bet-utils'
import { MatchPrediction, ErrorCode, PredictionMode, DEFAULT_POOL_CONFIG } from '@/types/bet'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface PredictionRequestBody {
  match_id: string
  home_score_predicted: number
  away_score_predicted: number
  pool_id?: string
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid Authorization header',
          },
        },
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
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
          },
        },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const poolId = searchParams.get('pool_id')

    let poolConfig: { pts_winner_selection: number; pts_exact_score: number; pts_team_goals: number; pts_goal_difference: number } | null = null

    if (poolId) {
      const { data: config } = await supabase
        .from('bet_pool_config_versions')
        .select('pts_winner_selection, pts_exact_score, pts_team_goals, pts_goal_difference')
        .eq('pool_id', poolId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (config) {
        poolConfig = config
      }
    }

    let query = supabase
      .from('bet_match_predictions')
      .select('id, mode, user_id, pool_id, match_id, home_score_predicted, away_score_predicted, created_at, updated_at')
      .eq('user_id', user.id)

    if (poolId) {
      query = query.eq('pool_id', poolId).eq('mode', PredictionMode.POOL)
    } else {
      query = query.is('pool_id', null).eq('mode', PredictionMode.GLOBAL)
    }

    const { data: predictions, error } = await query

    if (error) {
      throw new Error(`Failed to fetch predictions: ${error.message}`)
    }

    const predictionsList = predictions ?? []

    if (predictionsList.length === 0) {
      return NextResponse.json(
        {
          success: true,
          data: [],
          message: 'Predictions fetched successfully',
          error: null,
        },
        { status: 200 }
      )
    }

    const matchIds = predictionsList.map((p) => (p as { match_id: string }).match_id)

    const { data: matches, error: matchError } = await supabase
      .from('bet_matches')
      .select('id, home_score_official, away_score_official, stage, status')
      .in('id', matchIds)

    if (matchError) {
      console.error('Failed to fetch match scores:', matchError)
    }

    const matchScoresMap = new Map<string, { home: number | null; away: number | null; stage: string; status: string }>()
    if (matches) {
      for (const m of matches) {
        matchScoresMap.set(m.id, {
          home: m.home_score_official,
          away: m.away_score_official,
          stage: m.stage,
          status: m.status,
        })
      }
    }

    const enriched = predictionsList.map((p) => {
      const pred = p as {
        id: string; mode: string; user_id: string; pool_id: string | null
        match_id: string; home_score_predicted: number; away_score_predicted: number
        created_at: string; updated_at: string
      }
      const ms = matchScoresMap.get(pred.match_id)
      let pointsEarned: number | null = null

      if (ms && ms.home !== null && ms.away !== null && ms.status === 'finished') {
        const home = ms.home
        const away = ms.away
        const predHome = pred.home_score_predicted
        const predAway = pred.away_score_predicted

        if (poolConfig) {
          const isExact = home === predHome && away === predAway
          if (isExact) {
            pointsEarned =
              poolConfig.pts_winner_selection +
              poolConfig.pts_exact_score +
              poolConfig.pts_team_goals +
              poolConfig.pts_goal_difference
          } else {
            let pts = 0
            const actualDiff = Math.sign(home - away)
            const predDiff = Math.sign(predHome - predAway)
            if (actualDiff === predDiff && actualDiff !== 0) {
              pts += poolConfig.pts_winner_selection
            } else if (actualDiff === 0 && predDiff === 0) {
              pts += poolConfig.pts_winner_selection
            }
            if (home === predHome) pts += poolConfig.pts_team_goals
            if (away === predAway) pts += poolConfig.pts_team_goals
            if ((home - away) === (predHome - predAway)) pts += poolConfig.pts_goal_difference
            pointsEarned = pts
          }
        } else {
          const isExact = home === predHome && away === predAway
          if (isExact) {
            pointsEarned =
              DEFAULT_POOL_CONFIG.pts_winner_selection +
              DEFAULT_POOL_CONFIG.pts_exact_score +
              DEFAULT_POOL_CONFIG.pts_team_goals +
              DEFAULT_POOL_CONFIG.pts_goal_difference
          } else {
            let pts = 0
            const actualDiff = Math.sign(home - away)
            const predDiff = Math.sign(predHome - predAway)
            if (actualDiff === predDiff && actualDiff !== 0) {
              pts += DEFAULT_POOL_CONFIG.pts_winner_selection
            } else if (actualDiff === 0 && predDiff === 0) {
              pts += DEFAULT_POOL_CONFIG.pts_winner_selection
            }
            if (home === predHome) pts += DEFAULT_POOL_CONFIG.pts_team_goals
            if (away === predAway) pts += DEFAULT_POOL_CONFIG.pts_team_goals
            if ((home - away) === (predHome - predAway)) pts += DEFAULT_POOL_CONFIG.pts_goal_difference
            pointsEarned = pts
          }
        }
      }

      return {
        id: pred.id,
        mode: pred.mode,
        user_id: pred.user_id,
        pool_id: pred.pool_id,
        match_id: pred.match_id,
        home_score_predicted: pred.home_score_predicted,
        away_score_predicted: pred.away_score_predicted,
        created_at: pred.created_at,
        updated_at: pred.updated_at,
        points_earned: pointsEarned,
      }
    })

    return NextResponse.json(
      {
        success: true,
        data: enriched,
        message: 'Predictions fetched successfully',
        error: null,
      },
      { status: 200 }
    )
  } catch (err) {
    console.error('Unexpected error in GET /api/v1/bet/predictions:', err)

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

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: PredictionRequestBody = await request.json()

    // Validate required fields
    if (!body.match_id || body.home_score_predicted === undefined || body.away_score_predicted === undefined) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields: match_id, home_score_predicted, away_score_predicted',
          },
        },
        { status: 400 }
      )
    }

    // Get user session from Authorization header (Bearer token from Supabase JWT)
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Missing or invalid Authorization header',
          },
        },
        { status: 401 }
      )
    }

    // Extract JWT and verify user
    const token = authHeader.substring(7)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
          },
        },
        { status: 401 }
      )
    }

    // Validate score range
    const scoreValidation = validatePredictionScores(
      body.home_score_predicted,
      body.away_score_predicted
    )

    if (!scoreValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: ErrorCode.INVALID_SCORE_RANGE,
            message: scoreValidation.errors.join('; '),
          },
        },
        { status: 400 }
      )
    }

    // Fetch match to check if prediction is locked
    const { data: match, error: matchError } = await supabase
      .from('bet_matches')
      .select('id, kickoff_at, status')
      .eq('id', body.match_id)
      .single()

    if (matchError || !match) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: ErrorCode.MATCH_NOT_FOUND,
            message: `Match with ID ${body.match_id} not found`,
          },
        },
        { status: 404 }
      )
    }

    // Check if prediction is locked (10 minutes before kickoff)
    if (isPredictionLocked(match.kickoff_at, 10)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: ErrorCode.PREDICTION_LOCKED,
            message: 'Prediction is locked (10 minutes before kickoff)',
          },
        },
        { status: 400 }
      )
    }

    // Determine prediction mode and validate pool if provided
    let mode = PredictionMode.GLOBAL
    let poolId = null

    if (body.pool_id) {
      mode = PredictionMode.POOL

      // Verify pool exists and user is a member
      const { data: pool, error: poolError } = await supabase
        .from('bet_pools')
        .select('id')
        .eq('id', body.pool_id)
        .single()

      if (poolError || !pool) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: ErrorCode.POOL_NOT_FOUND,
              message: `Pool with ID ${body.pool_id} not found`,
            },
          },
          { status: 404 }
        )
      }

      // Check if user is member of pool
      const { data: membership } = await supabase
        .from('bet_pool_members')
        .select('id')
        .eq('pool_id', body.pool_id)
        .eq('user_id', user.id)
        .single()

      if (!membership) {
        return NextResponse.json(
          {
            success: false,
            data: null,
            error: {
              code: ErrorCode.UNAUTHORIZED_POOL_ACCESS,
              message: 'You are not a member of this pool',
            },
          },
          { status: 403 }
        )
      }

      poolId = body.pool_id
    }

    // Check if prediction already exists
    const { data: existingPrediction } = await supabase
      .from('bet_match_predictions')
      .select('id, updated_at')
      .eq('user_id', user.id)
      .eq('match_id', body.match_id)
      .eq('mode', mode)
      .eq('pool_id', poolId)
      .single()

    let response
    let statusCode = 201

    if (existingPrediction) {
      // Update existing prediction
      const { data: updatedPrediction, error: updateError } = await supabase
        .from('bet_match_predictions')
        .update({
          home_score_predicted: body.home_score_predicted,
          away_score_predicted: body.away_score_predicted,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingPrediction.id)
        .select()
        .single()

      if (updateError) {
        throw new Error(`Failed to update prediction: ${updateError.message}`)
      }

      response = updatedPrediction
      statusCode = 200
    } else {
      // Create new prediction
      const { data: newPrediction, error: createError } = await supabase
        .from('bet_match_predictions')
        .insert({
          user_id: user.id,
          match_id: body.match_id,
          mode,
          pool_id: poolId,
          home_score_predicted: body.home_score_predicted,
          away_score_predicted: body.away_score_predicted,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (createError) {
        throw new Error(`Failed to create prediction: ${createError.message}`)
      }

      response = newPrediction
    }

    return NextResponse.json(
      {
        success: true,
        data: response as MatchPrediction,
        message: statusCode === 201 ? 'Prediction created successfully' : 'Prediction updated successfully',
        error: null,
      },
      { status: statusCode }
    )
  } catch (err) {
    console.error('Unexpected error in POST /api/v1/bet/predictions:', err)

    // Check if it's a JSON parsing error
    if (err instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: {
            code: 'INVALID_JSON',
            message: 'Request body must be valid JSON',
          },
        },
        { status: 400 }
      )
    }

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
