import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, requireAdmin } from '@/lib/supabase-admin'

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

interface R32Match {
  id: string
  fifa_match_number: number
  kickoff_at: string
  venue: string
  home_placeholder: string
  away_placeholder: string
  home_team_id: string | null
  away_team_id: string | null
}

function calculateStandings(groupMatches: any[]): StandingsRow[] {
  const teamMap = new Map<string, TeamInfo>()
  for (const m of groupMatches) {
    const ht = m.home_team as TeamInfo | null
    const at = m.away_team as TeamInfo | null
    if (ht) teamMap.set(ht.id, ht)
    if (at) teamMap.set(at.id, at)
  }

  const statsMap = new Map<string, StandingsRow>()
  for (const team of teamMap.values()) {
    statsMap.set(team.id, {
      team_id: team.id,
      team_name: team.name,
      fifa_code: team.fifa_code,
      flag_svg_url: team.flag_svg_url,
      played: 0, wins: 0, draws: 0,
      losses: 0, goals_for: 0, goals_against: 0, points: 0,
    })
  }

  for (const m of groupMatches) {
    if (m.status !== 'finished') continue
    const hS = m.home_score_official as number | null
    const aS = m.away_score_official as number | null
    if (hS == null || aS == null) continue

    const home = statsMap.get(m.home_team_id)
    const away = statsMap.get(m.away_team_id)
    if (!home || !away) continue

    home.played++; away.played++
    home.goals_for += hS; home.goals_against += aS
    away.goals_for += aS; away.goals_against += hS

    if (hS > aS) {
      home.wins++; home.points += 3; away.losses++
    } else if (hS < aS) {
      away.wins++; away.points += 3; home.losses++
    } else {
      home.draws++; home.points++; away.draws++; away.points++
    }
  }

  return Array.from(statsMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    const gdA = a.goals_for - a.goals_against
    const gdB = b.goals_for - b.goals_against
    if (gdB !== gdA) return gdB - gdA
    return b.goals_for - a.goals_for
  })
}

function parsePlaceholder(
  placeholder: string,
  standingsByGroup: Record<string, StandingsRow[]>,
  thirdQualifiers: Map<string, string>,
): string | null {
  if (!placeholder) return null

  if (placeholder.startsWith('1º')) {
    const g = placeholder.replace('1º Grupo ', '').trim()
    const st = standingsByGroup[g]
    if (!st || st.length < 1) return null
    return st[0].team_id
  }

  if (placeholder.startsWith('2º')) {
    const g = placeholder.replace('2º Grupo ', '').trim()
    const st = standingsByGroup[g]
    if (!st || st.length < 2) return null
    return st[1].team_id
  }

  if (placeholder.startsWith('3º')) {
    const rest = placeholder.replace('3º Grupo ', '').trim()
    const candidateGroups = rest.split('/')
    const candidates: Array<{ team_id: string; group: string; points: number; gd: number }> = []

    for (const g of candidateGroups) {
      const st = standingsByGroup[g]
      if (!st || st.length < 3) continue
      const third = st[2]
      const qTeamId = thirdQualifiers.get(g)
      if (qTeamId && qTeamId === third.team_id) {
        candidates.push({
          team_id: third.team_id, group: g,
          points: third.points,
          gd: third.goals_for - third.goals_against,
        })
      }
    }

    if (candidates.length === 1) return candidates[0].team_id

    if (candidates.length > 1) {
      candidates.sort((a, b) => b.points - a.points || b.gd - a.gd)
      return candidates[0].team_id
    }

    for (const g of candidateGroups) {
      const st = standingsByGroup[g]
      if (!st || st.length < 3) continue
      const third = st[2]
      candidates.push({
        team_id: third.team_id, group: g,
        points: third.points,
        gd: third.goals_for - third.goals_against,
      })
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.points - a.points || b.gd - a.gd)
      return candidates[0].team_id
    }

    return null
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Server config error' }, { status: 500 })
    }

    const auth = await requireAdmin(request, supabase)
    if (!auth.success) return auth.response

    const body = await request.json()
    const { action, tournament_id, matches } = body

    if (!tournament_id) {
      return NextResponse.json({ success: false, error: 'tournament_id required' }, { status: 400 })
    }

    const { data: tData } = await supabase
      .from('bet_tournaments')
      .select('id')
      .eq('id', tournament_id)
      .single()

    if (!tData) {
      return NextResponse.json({ success: false, error: 'Tournament not found' }, { status: 404 })
    }

    if (action === 'save_matches') {
      if (!matches || !Array.isArray(matches)) {
        return NextResponse.json({ success: false, error: 'matches array required' }, { status: 400 })
      }

      for (const m of matches) {
        if (!m.match_id) continue
        const updateData: Record<string, any> = {}
        if (m.home_team_id !== undefined) updateData.home_team_id = m.home_team_id || null
        if (m.away_team_id !== undefined) updateData.away_team_id = m.away_team_id || null
        updateData.updated_at = new Date().toISOString()
        await supabase.from('bet_matches').update(updateData).eq('id', m.match_id)
      }

      return NextResponse.json({ success: true, data: { updated: matches.length } })
    }

    const { data: allMatches, error: matchError } = await supabase
      .from('bet_matches')
      .select(`
        id, group_name, status, stage, home_score_official, away_score_official,
        home_team_id, away_team_id, home_placeholder, away_placeholder,
        fifa_match_number, kickoff_at, venue,
        home_team:bet_teams!home_team_id(id, name, fifa_code, flag_svg_url),
        away_team:bet_teams!away_team_id(id, name, fifa_code, flag_svg_url)
      `)
      .eq('tournament_id', tournament_id)
      .order('fifa_match_number', { ascending: true })

    if (matchError) {
      return NextResponse.json({ success: false, error: matchError.message }, { status: 500 })
    }

    const groupMatches = (allMatches || []).filter((m: any) => m.stage === 'group_stage' && m.group_name)
    const r32Matches = (allMatches || []).filter((m: any) => m.stage === 'round_of_32') as R32Match[]

    const uniqueGroups = [...new Set(groupMatches.map((m: any) => m.group_name).filter(Boolean))] as string[]
    const standingsByGroup: Record<string, StandingsRow[]> = {}

    for (const gn of uniqueGroups) {
      const gm = groupMatches.filter(
        (m: any) => String(m.group_name).trim() === String(gn).trim()
      )
      standingsByGroup[gn] = calculateStandings(gm)
    }

    const { data: pools } = await supabase
      .from('bet_pools')
      .select('id')
      .eq('tournament_id', tournament_id)
      .limit(1)

    const somePoolId = (pools && pools.length > 0) ? (pools[0] as { id: string }).id : null
    const thirdQualifiers = new Map<string, string>()

    if (somePoolId) {
      const { data: thirdData } = await supabase
        .from('bet_best_third_qualifiers')
        .select('group_name, team_id')
        .eq('pool_id', somePoolId)

      for (const t of (thirdData || []) as Array<{ group_name: string; team_id: string }>) {
        thirdQualifiers.set(t.group_name, t.team_id)
      }
    }

    const generated: Array<{
      match_id: string
      fifa_match_number: number
      kickoff_at: string
      venue: string
      home_placeholder: string
      away_placeholder: string
      home_team_id: string | null
      away_team_id: string | null
      home_team_name: string | null
      away_team_name: string | null
    }> = []

    for (const m of r32Matches) {
      const homeTeamId = parsePlaceholder(m.home_placeholder, standingsByGroup, thirdQualifiers)
      const awayTeamId = parsePlaceholder(m.away_placeholder, standingsByGroup, thirdQualifiers)

      const allTeams = Object.values(standingsByGroup).flat()
      const homeName = homeTeamId
        ? allTeams.find(s => s.team_id === homeTeamId)?.team_name || null
        : null
      const awayName = awayTeamId
        ? allTeams.find(s => s.team_id === awayTeamId)?.team_name || null
        : null

      if (homeTeamId || awayTeamId) {
        await supabase
          .from('bet_matches')
          .update({
            home_team_id: homeTeamId,
            away_team_id: awayTeamId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', m.id)
      }

      generated.push({
        match_id: m.id,
        fifa_match_number: m.fifa_match_number,
        kickoff_at: m.kickoff_at,
        venue: m.venue,
        home_placeholder: m.home_placeholder,
        away_placeholder: m.away_placeholder,
        home_team_id: homeTeamId,
        away_team_id: awayTeamId,
        home_team_name: homeName,
        away_team_name: awayName,
      })
    }

    const resolved = generated.filter(g => g.home_team_id && g.away_team_id).length
    const partial = generated.filter(g => g.home_team_id || g.away_team_id).length - resolved

    const qualifiedSet = new Map<string, { team_id: string; team_name: string; flag_svg_url?: string }>()

    for (const teams of Object.values(standingsByGroup)) {
      for (const t of teams) {
        if (!qualifiedSet.has(t.team_id)) {
          qualifiedSet.set(t.team_id, {
            team_id: t.team_id,
            team_name: t.team_name,
            flag_svg_url: t.flag_svg_url,
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        matches: generated,
        summary: {
          total: generated.length,
          resolved,
          partial,
          unresolved: generated.length - resolved - partial,
        },
        groups: Object.entries(standingsByGroup).map(([gn, teams]) => ({
          group_name: gn,
          top2: teams.slice(0, 2).map(t => ({
            team_id: t.team_id,
            team_name: t.team_name,
          })),
          third: teams.length > 2
            ? {
                team_id: teams[2].team_id,
                team_name: teams[2].team_name,
                is_best_third: thirdQualifiers.has(gn) && thirdQualifiers.get(gn) === teams[2].team_id,
              }
            : null,
        })),
        qualified: Array.from(qualifiedSet.values()),
      },
    })
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    )
  }
}
