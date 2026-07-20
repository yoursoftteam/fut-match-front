import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, requireAdmin } from '@/lib/supabase-admin'

export const runtime = 'edge'

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Server config error' }, { status: 500 })
    }

    const auth = await requireAdmin(request, supabase)
    if (!auth.success) return auth.response

    const body = await request.json()
    const { tournament_id, pool_id } = body

    if (!tournament_id && !pool_id) {
      return NextResponse.json({ success: false, error: 'tournament_id or pool_id required' }, { status: 400 })
    }

    let poolIds: string[] = []

    if (pool_id) {
      poolIds = [pool_id]
    } else {
      const { data: pools } = await supabase
        .from('bet_pools')
        .select('id')
        .eq('tournament_id', tournament_id)
        .eq('competition_type', 'pool')

      poolIds = (pools ?? []).map((p: { id: string }) => p.id)
    }

    if (poolIds.length === 0) {
      return NextResponse.json({ success: false, error: 'No pools found' }, { status: 404 })
    }

    const debugResults: Record<string, unknown>[] = []

    for (const pid of poolIds) {
      const { data: pool } = await supabase
        .from('bet_pools')
        .select('id, name, tournament_id')
        .eq('id', pid)
        .single()

      if (!pool) {
        debugResults.push({ pool_id: pid, error: 'pool not found' })
        continue
      }

      const { data: memberRows, error: memberErr } = await supabase
        .from('bet_pool_members')
        .select('user_id')
        .eq('pool_id', pid)

      const debug: Record<string, unknown> = {
        pool_id: pid,
        pool_name: pool.name,
        member_count: memberRows?.length ?? 0,
        member_error: memberErr?.message ?? null,
        user_ids: memberRows?.map((r: { user_id: string }) => r.user_id) ?? [],
      }

      if (!memberRows || memberRows.length === 0) {
        debugResults.push(debug)
        continue
      }

      const allUserIds = memberRows.map((r: { user_id: string }) => r.user_id)

      const metaResults: Record<string, unknown>[] = []
      for (const uid of allUserIds) {
        const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(uid)
        metaResults.push({
          uid,
          found: !!userData?.user,
          email: userData?.user?.email ?? null,
          full_name: (userData?.user?.user_metadata as Record<string, unknown>)?.full_name ?? null,
          error: userErr?.message ?? null,
        })
      }

      debug.user_meta = metaResults
      debugResults.push(debug)
    }

    return NextResponse.json({ success: true, debug: debugResults })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
