import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-admin'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Service client not available' }, { status: 500 })
  }

  const { match_id, home_score, away_score } = await request.json()

  if (!match_id || home_score === undefined || away_score === undefined) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { error } = await supabase.rpc('fn_update_match_result', {
    p_match_id: match_id,
    p_home_score: home_score,
    p_away_score: away_score,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
