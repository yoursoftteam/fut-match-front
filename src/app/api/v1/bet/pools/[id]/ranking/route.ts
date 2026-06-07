import { NextRequest, NextResponse } from 'next/server'
export const runtime = "edge";

import { getServiceClient } from '@/lib/supabase-admin'

interface RankingEntry {
  rank: number
  user_id: string
  name: string
  email: string
  points_total: number
  exact_predictions: number
  total_predictions: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json(
        { success: false, data: null, error: { code: 'MISSING_ENV', message: 'Server configuration error' } },
        { status: 500 }
      )
    }

    const { id: poolId } = await params

    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ success: false, data: null, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } }, { status: 401 })
    }

    const { data: membership } = await supabase
      .from('bet_pool_members')
      .select('id')
      .eq('pool_id', poolId)
      .eq('user_id', user.id)
      .single()

    if (!membership) {
      return NextResponse.json({ success: false, data: null, error: { code: 'FORBIDDEN', message: 'Not a pool member' } }, { status: 403 })
    }

    const { data: memberRows } = await supabase
      .from('bet_pool_members')
      .select('user_id')
      .eq('pool_id', poolId)

    if (!memberRows || memberRows.length === 0) {
      return NextResponse.json({ success: true, data: [], message: 'No members', error: null }, { status: 200 })
    }

    const userIds = memberRows.map((r) => r.user_id)

    const { data: scores } = await supabase
      .from('bet_scores_aggregate')
      .select('user_id, points_total')
      .eq('pool_id', poolId)
      .eq('mode', 'pool')

    const scoreMap = new Map<string, number>()
    if (scores) {
      for (const s of scores) {
        scoreMap.set(s.user_id, s.points_total)
      }
    }

    const { data: finishedMatches } = await supabase
      .from('bet_matches')
      .select('id, home_score_official, away_score_official')
      .eq('status', 'finished')

    const finishedMatchIds = finishedMatches?.map((m) => m.id) ?? []
    const finishedScoreMap = new Map<string, { home: number; away: number }>()
    if (finishedMatches) {
      for (const m of finishedMatches) {
        finishedScoreMap.set(m.id, { home: m.home_score_official, away: m.away_score_official })
      }
    }

    const exactCountMap = new Map<string, number>()
    const totalPredMap = new Map<string, number>()

    if (finishedMatchIds.length > 0) {
      const { data: predictions } = await supabase
        .from('bet_match_predictions')
        .select('user_id, match_id, home_score_predicted, away_score_predicted')
        .eq('pool_id', poolId)
        .eq('mode', 'pool')
        .in('match_id', finishedMatchIds)

      if (predictions) {
        for (const p of predictions) {
          const matchScores = finishedScoreMap.get(p.match_id)
          if (!matchScores) continue

          totalPredMap.set(p.user_id, (totalPredMap.get(p.user_id) ?? 0) + 1)

          if (matchScores.home === p.home_score_predicted && matchScores.away === p.away_score_predicted) {
            exactCountMap.set(p.user_id, (exactCountMap.get(p.user_id) ?? 0) + 1)
          }
        }
      }
    }

    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const userMetaMap = new Map<string, { email: string; fullName: string | null }>()
    if (authUsers?.users) {
      for (const u of authUsers.users) {
        const meta = u.user_metadata as Record<string, unknown> | undefined
        const fullName = (typeof meta?.full_name === 'string' && meta.full_name.trim()) ? meta.full_name.trim() : null
        userMetaMap.set(u.id, { email: u.email ?? 'Unknown', fullName })
      }
    }

    const entries: RankingEntry[] = userIds
      .map((uid) => {
        const meta = userMetaMap.get(uid) ?? { email: 'Unknown', fullName: null }
        let name: string
        if (meta.fullName) {
          name = meta.fullName
        } else {
          name = meta.email.split('@')[0].replace(/[._-]/g, ' ')
          name = name.replace(/\b\w/g, (c) => c.toUpperCase())
        }

        return {
          rank: 0,
          user_id: uid,
          name,
          email: meta.email,
          points_total: scoreMap.get(uid) ?? 0,
          exact_predictions: exactCountMap.get(uid) ?? 0,
          total_predictions: totalPredMap.get(uid) ?? 0,
        }
      })
      .sort((a, b) => {
        const ptsDiff = b.points_total - a.points_total
        if (ptsDiff !== 0) return ptsDiff
        return b.exact_predictions - a.exact_predictions
      })
      .map((entry, i) => ({ ...entry, rank: i + 1 }))

    return NextResponse.json({ success: true, data: entries, message: 'Ranking fetched', error: null }, { status: 200 })
  } catch (err) {
    console.error('Error in GET /api/v1/bet/pools/[id]/ranking:', err)
    return NextResponse.json({ success: false, data: null, error: { code: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' } }, { status: 500 })
  }
}
