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

    let totalEnqueued = 0
    const results: Array<{ pool_id: string; pool_name: string; enqueued: number }> = []

    for (const pid of poolIds) {
      const { data: pool } = await supabase
        .from('bet_pools')
        .select('id, name, tournament_id')
        .eq('id', pid)
        .single()

      if (!pool) continue

      const { data: memberRows } = await supabase
        .from('bet_pool_members')
        .select('user_id')
        .eq('pool_id', pid)

      if (!memberRows || memberRows.length === 0) continue

      const allUserIds = memberRows.map((r: { user_id: string }) => r.user_id)

      const { data: scores } = await supabase
        .from('bet_scores_aggregate')
        .select('user_id, points_total')
        .eq('pool_id', pid)
        .eq('mode', 'pool')

      const scoreMap = new Map<string, number>()
      if (scores) {
        for (const s of scores) {
          scoreMap.set(s.user_id, s.points_total)
        }
      }

      const { data: tournamentScores } = await supabase
        .from('bet_scores_details')
        .select('user_id, points')
        .eq('pool_id', pid)
        .eq('mode', 'pool')
        .eq('source_type', 'tournament')

      const tournamentPointsMap = new Map<string, number>()
      if (tournamentScores) {
        for (const ts of tournamentScores) {
          tournamentPointsMap.set(ts.user_id, (tournamentPointsMap.get(ts.user_id) ?? 0) + ts.points)
        }
      }

      const sortedUsers = allUserIds
        .map(uid => ({
          uid,
          points: scoreMap.get(uid) ?? 0,
        }))
        .sort((a, b) => {
          const ptsDiff = b.points - a.points
          if (ptsDiff !== 0) return ptsDiff
          return a.uid.localeCompare(b.uid)
        })

      const totalMembers = sortedUsers.length

      const userMetaMap = new Map<string, { email: string; fullName: string | null }>()
      const metaResults = await Promise.all(
        sortedUsers.map(({ uid }) =>
          supabase.auth.admin.getUserById(uid)
            .then(({ data: { user: u }, error }) => {
              if (error) {
                console.error(`[send-tournament-results] getUserById error for ${uid}:`, error.message)
                return
              }
              if (u) {
                const meta = u.user_metadata as Record<string, unknown> | undefined
                const fullName = (typeof meta?.full_name === 'string' && meta.full_name.trim()) ? meta.full_name.trim() : null
                userMetaMap.set(u.id, { email: u.email ?? '', fullName })
              }
            })
        )
      )
      console.log(`[send-tournament-results] pool ${pid}: ${sortedUsers.length} users, ${userMetaMap.size} resolved`)

      const poolUrl = `https://parti2.app/bet/pool/${pid}`
      let poolEnqueued = 0
      let skippedNoEmail = 0

      for (let i = 0; i < sortedUsers.length; i++) {
        const { uid, points } = sortedUsers[i]
        const rank = i + 1
        const meta = userMetaMap.get(uid)
        if (!meta?.email) {
          skippedNoEmail++
          continue
        }

        let tier: 'winner' | 'top3' | 'rest' = 'rest'
        if (rank === 1) tier = 'winner'
        else if (rank <= 3) tier = 'top3'

        const userName = meta.fullName
          ?? (meta.email.includes('@')
            ? meta.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            : 'Jugador')

        const { renderTournamentResultsEmail } = await import('@/lib/email-templates/tournament-results')
        const { subject, html } = (() => {
          const rendered = renderTournamentResultsEmail({
            user_name: userName,
            pool_name: pool.name,
            pool_url: poolUrl,
            rank,
            total_members: totalMembers,
            total_points: points,
            tournament_points: tournamentPointsMap.get(uid) ?? 0,
            tier,
          })
          return { subject: '¡Resultados finales de la polla! Descubre cómo te fue y quién se llevó la corona 🏆', html: rendered }
        })()

        const idempotencyKey = `tournament_results:${pid}:${uid}:${Date.now()}`

        const { error: insertError } = await supabase
          .from('bet_notification_queue')
          .insert({
            user_id: uid,
            email: meta.email,
            notification_type: 'tournament_results',
            payload: { subject, html },
            idempotency_key: idempotencyKey,
            send_at: new Date().toISOString(),
          })

        if (!insertError) {
          poolEnqueued++
          totalEnqueued++
        } else {
          console.error(`[send-tournament-results] insert error for ${uid}:`, insertError.message)
        }
      }

      console.log(`[send-tournament-results] pool ${pid}: enqueued=${poolEnqueued}, skipped_no_email=${skippedNoEmail}`)

      results.push({
        pool_id: pid,
        pool_name: pool.name,
        enqueued: poolEnqueued,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        pools_processed: results.length,
        total_enqueued: totalEnqueued,
        results,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
