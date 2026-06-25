import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-admin'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Server config error' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const poolId = searchParams.get('pool_id')
    const tournamentId = searchParams.get('tournament_id')

    if (!poolId && !tournamentId) {
      return NextResponse.json({ success: false, error: 'pool_id or tournament_id required' }, { status: 400 })
    }

    let tid = tournamentId
    if (poolId) {
      const { data: pool } = await supabase.from('bet_pools').select('tournament_id').eq('id', poolId).single()
      if (pool) tid = pool.tournament_id
    }

    // Get all groups for this tournament
    const { data: groups } = await supabase
      .from('bet_matches')
      .select('group_name')
      .eq('tournament_id', tid)
      .eq('stage', 'group_stage')
      .not('group_name', 'is', null)
      .order('group_name')

    const uniqueGroups = [...new Set((groups || []).map((g) => g.group_name).filter(Boolean))]

    // Get teams for each group
    const groupTeams: Record<string, Array<{ id: string; name: string; fifa_code: string; flag_svg_url?: string }>> = {}
    for (const gn of uniqueGroups) {
      const { data: teams } = await supabase
        .from('bet_matches')
        .select(`
          home_team:bet_teams!home_team_id(id, name, fifa_code, flag_svg_url),
          away_team:bet_teams!away_team_id(id, name, fifa_code, flag_svg_url)
        `)
        .eq('tournament_id', tid)
        .eq('group_name', gn)
        .eq('stage', 'group_stage')

      const teamMap = new Map<string, { id: string; name: string; fifa_code: string; flag_svg_url?: string }>()
      for (const row of teams || []) {
        const ht = row.home_team as unknown as { id: string; name: string; fifa_code: string; flag_svg_url?: string } | null
        const at = row.away_team as unknown as { id: string; name: string; fifa_code: string; flag_svg_url?: string } | null
        if (ht) teamMap.set(ht.id, ht)
        if (at) teamMap.set(at.id, at)
      }
      groupTeams[gn] = Array.from(teamMap.values())

      // Add standings for finished groups
      if (tid) {
        const { data: standingsRows } = await supabase
          .rpc('fn_actual_group_standings', {
            p_group_name: gn,
            p_tournament_id: tid,
          })

        const standings = standingsRows as unknown as Array<{
          team_id: string; team_name: string; played: number; wins: number;
          draws: number; losses: number; goals_for: number; goals_against: number; points: number
        }> | null

        // Attach flag to standings
        const standingsWithFlags = (standings || []).map((s) => ({
          ...s,
          flag_svg_url: teamMap.get(s.team_id)?.flag_svg_url,
        }))

        groupTeams[gn] = (standingsWithFlags && standingsWithFlags.length > 0
          ? standingsWithFlags
          : Array.from(teamMap.values())
        ) as unknown as Array<{ id: string; name: string; fifa_code: string; flag_svg_url?: string }>
      }
    }

    // Get existing best third selections
    let existingThird: Array<{ group_name: string; team_id: string }> = []
    if (poolId) {
      const { data } = await supabase
        .from('bet_best_third_qualifiers')
        .select('group_name, team_id')
        .eq('pool_id', poolId)
      existingThird = (data || []) as Array<{ group_name: string; team_id: string }>
    }

    return NextResponse.json({
      success: true,
      data: {
        groups: uniqueGroups,
        groupTeams,
        existingThird,
      },
    })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Server config error' }, { status: 500 })
    }

    const body = await request.json()
    const { action, pool_id, group_name, team_id } = body

    if (!pool_id) {
      return NextResponse.json({ success: false, error: 'pool_id required' }, { status: 400 })
    }

    if (action === 'set_best_third') {
      if (!group_name || !team_id) {
        return NextResponse.json({ success: false, error: 'group_name and team_id required' }, { status: 400 })
      }

      const { error } = await supabase
        .from('bet_best_third_qualifiers')
        .upsert({ pool_id, group_name, team_id }, { onConflict: 'pool_id, group_name' })

      if (error) throw error

      return NextResponse.json({ success: true, data: { pool_id, group_name, team_id } })
    }

    if (action === 'remove_best_third') {
      if (!group_name) {
        return NextResponse.json({ success: false, error: 'group_name required' }, { status: 400 })
      }

      const { error } = await supabase
        .from('bet_best_third_qualifiers')
        .delete()
        .eq('pool_id', pool_id)
        .eq('group_name', group_name)

      if (error) throw error

      return NextResponse.json({ success: true })
    }

    if (action === 'calculate_classification') {
      if (!group_name) {
        // Calculate for all groups
        const { data: pools } = await supabase
          .from('bet_pools')
          .select('id')
          .eq('id', pool_id)

        if (!pools || pools.length === 0) {
          return NextResponse.json({ success: false, error: 'Pool not found' }, { status: 404 })
        }

        const { data: groups } = await supabase
          .from('bet_matches')
          .select('group_name')
          .eq('tournament_id', (await supabase.from('bet_pools').select('tournament_id').eq('id', pool_id).single()).data?.tournament_id)
          .eq('stage', 'group_stage')
          .not('group_name', 'is', null)

        const uniqueGs = [...new Set((groups || []).map((g) => g.group_name).filter(Boolean))]
        for (const g of uniqueGs) {
          await supabase.rpc('fn_calculate_group_classification', {
            p_pool_id: pool_id,
            p_group_name: g,
          })
        }

        return NextResponse.json({ success: true, data: { groups_processed: uniqueGs.length } })
      }

      const { error } = await supabase.rpc('fn_calculate_group_classification', {
        p_pool_id: pool_id,
        p_group_name: group_name,
      })

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    if (action === 'calculate_best_third') {
      const { error } = await supabase.rpc('fn_calculate_best_third_points', {
        p_pool_id: pool_id,
      })

      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
