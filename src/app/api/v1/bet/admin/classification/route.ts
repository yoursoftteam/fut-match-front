import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase-admin'

export const runtime = 'edge'

interface TeamInfo {
  id: string
  name: string
  fifa_code: string
  flag_svg_url?: string
}

interface StandingsRow {
  team_id: string
  team_name: string
  fifa_code: string
  flag_svg_url?: string
  played: number
  wins: number
  draws: number
  losses: number
  goals_for: number
  goals_against: number
  points: number
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Server config error' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const poolId = searchParams.get('pool_id')

    if (!poolId) {
      return NextResponse.json({ success: false, error: 'pool_id required' }, { status: 400 })
    }

    // Get pool's tournament
    const { data: pool } = await supabase
      .from('bet_pools')
      .select('tournament_id')
      .eq('id', poolId)
      .single()

    if (!pool) {
      return NextResponse.json({ success: false, error: 'Pool not found' }, { status: 404 })
    }

    const tid = (pool as unknown as { tournament_id: string }).tournament_id

    // Get ALL group stage matches for this tournament (one query)
    const { data: allMatches, error: matchError } = await supabase
      .from('bet_matches')
      .select(`
        id, group_name, status,
        home_score_official, away_score_official,
        home_team_id, away_team_id,
        home_team:bet_teams!home_team_id(id, name, fifa_code, flag_svg_url),
        away_team:bet_teams!away_team_id(id, name, fifa_code, flag_svg_url)
      `)
      .eq('tournament_id', tid)
      .eq('stage', 'group_stage')
      .not('group_name', 'is', null)
      .order('group_name')

    if (matchError) {
      return NextResponse.json({ success: false, error: matchError.message }, { status: 500 })
    }

    // Build group names list
    const uniqueGroups = [...new Set((allMatches || []).map((m: any) => m.group_name).filter(Boolean))] as string[]

    // Build standings per group
    const groupTeams: Record<string, StandingsRow[]> = {}

    for (const gn of uniqueGroups) {
      const groupMatches = (allMatches || []).filter((m: any) => String(m.group_name).trim() === String(gn).trim())

      // Collect all teams in this group
      const teamMap = new Map<string, TeamInfo>()
      for (const match of groupMatches) {
        const ht = match.home_team as unknown as TeamInfo | null
        const at = match.away_team as unknown as TeamInfo | null
        if (ht) teamMap.set(ht.id, ht)
        if (at) teamMap.set(at.id, at)
      }

      // Calculate standings using ONLY finished matches
      const statsMap = new Map<string, StandingsRow>()

      for (const team of teamMap.values()) {
        statsMap.set(team.id, {
          team_id: team.id,
          team_name: team.name,
          fifa_code: team.fifa_code,
          flag_svg_url: team.flag_svg_url,
          played: 0, wins: 0, draws: 0, losses: 0,
          goals_for: 0, goals_against: 0, points: 0,
        })
      }

      for (const match of groupMatches) {
        if (match.status !== 'finished') continue
        const hScore = match.home_score_official
        const aScore = match.away_score_official
        if (hScore == null || aScore == null) continue

        const hTeam = match.home_team_id
        const aTeam = match.away_team_id

        const homeStats = statsMap.get(hTeam)
        const awayStats = statsMap.get(aTeam)
        if (!homeStats || !awayStats) continue

        homeStats.played++
        awayStats.played++

        homeStats.goals_for += hScore
        homeStats.goals_against += aScore
        awayStats.goals_for += aScore
        awayStats.goals_against += hScore

        if (hScore > aScore) {
          homeStats.wins++
          homeStats.points += 3
          awayStats.losses++
        } else if (hScore < aScore) {
          awayStats.wins++
          awayStats.points += 3
          homeStats.losses++
        } else {
          homeStats.draws++
          homeStats.points += 1
          awayStats.draws++
          awayStats.points += 1
        }
      }

      // Sort
      groupTeams[gn] = Array.from(statsMap.values()).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points
        const gdA = a.goals_for - a.goals_against
        const gdB = b.goals_for - b.goals_against
        if (gdB !== gdA) return gdB - gdA
        return b.goals_for - a.goals_for
      })
    }

    // Get existing best third selections
    const { data: existingThirdData } = await supabase
      .from('bet_best_third_qualifiers')
      .select('group_name, team_id')
      .eq('pool_id', poolId)

    const existingThird = (existingThirdData || []) as Array<{ group_name: string; team_id: string }>

    return NextResponse.json({
      success: true,
      data: { groups: uniqueGroups, groupTeams, existingThird },
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
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
      const { data: pool } = await supabase.from('bet_pools').select('tournament_id').eq('id', pool_id).single()
      const tournId = (pool as unknown as { tournament_id: string })?.tournament_id
      if (!tournId) return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 })

      const { data: gs } = await supabase
        .from('bet_matches')
        .select('group_name')
        .eq('tournament_id', tournId)
        .eq('stage', 'group_stage')
        .not('group_name', 'is', null)

      const uniqueGs = [...new Set((gs || []).map((g: any) => g.group_name).filter(Boolean))]
      for (const g of uniqueGs) {
        await supabase.rpc('fn_calculate_group_classification', { p_pool_id: pool_id, p_group_name: g })
      }
      return NextResponse.json({ success: true, data: { groups_processed: uniqueGs.length } })
    }

    if (action === 'calculate_best_third') {
      const { error } = await supabase.rpc('fn_calculate_best_third_points', { p_pool_id: pool_id })
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
