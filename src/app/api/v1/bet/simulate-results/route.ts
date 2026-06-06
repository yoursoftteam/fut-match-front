import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-admin'
import { Match } from '@/types/bet'
import { simulateMatchResult } from '@/lib/simulate-results'

const ADMIN_USER_ID = process.env.ADMIN_USER_ID

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
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    if (user.id !== ADMIN_USER_ID) {
      return NextResponse.json(
        { success: false, error: 'Solo el administrador puede ejecutar esta acción' },
        { status: 403 }
      )
    }

    const now = new Date().toISOString()

    const { data: matches, error: fetchError } = await supabase
      .from('bet_matches')
      .select('*')
      .neq('status', 'finished')
      .lt('kickoff_at', now)
      .order('kickoff_at', { ascending: true })

    if (fetchError) {
      return NextResponse.json(
        { success: false, error: 'Error al obtener partidos' },
        { status: 500 }
      )
    }

    const results: Array<{
      match_id: string
      home_team?: string
      away_team?: string
      home_score: number
      away_score: number
      status: 'simulated' | 'skipped' | 'error'
      error?: string
    }> = []

    for (const match of matches as Match[]) {
      const simulation = simulateMatchResult(match)

      if (!simulation) {
        results.push({
          match_id: match.id,
          status: 'skipped',
          home_score: 0,
          away_score: 0,
        })
        continue
      }

      const { error: rpcError } = await supabase.rpc('fn_update_match_result', {
        p_match_id: match.id,
        p_home_score: simulation.homeScore,
        p_away_score: simulation.awayScore,
      })

      if (rpcError) {
        results.push({
          match_id: match.id,
          status: 'error',
          home_score: simulation.homeScore,
          away_score: simulation.awayScore,
          error: rpcError.message,
        })
        continue
      }

      results.push({
        match_id: match.id,
        home_team: match.home_team?.name ?? match.home_placeholder ?? undefined,
        away_team: match.away_team?.name ?? match.away_placeholder ?? undefined,
        home_score: simulation.homeScore,
        away_score: simulation.awayScore,
        status: 'simulated',
      })
    }

    const simulated = results.filter(r => r.status === 'simulated').length
    const skipped = results.filter(r => r.status === 'skipped').length
    const errors = results.filter(r => r.status === 'error').length

    return NextResponse.json({
      success: true,
      data: {
        simulated,
        skipped,
        errors,
        results,
      },
    })
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Error interno',
      },
      { status: 500 }
    )
  }
}
