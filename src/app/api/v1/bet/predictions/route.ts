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
import { MatchPrediction, ErrorCode, PredictionMode } from '@/types/bet'

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
