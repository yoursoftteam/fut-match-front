import type {
  LeagueMode,
  Tournament,
  TournamentMatch,
  TournamentScheduleDay,
  TournamentTeam,
} from "@/lib/tournament-schema"

export interface FixtureTeam {
  id: string
  name: string
}

export interface RoundRobinPair {
  home_team_id: string | null
  away_team_id: string | null
  is_bye: boolean
}

export interface GeneratedTournamentMatchInput {
  tournament_id: string
  home_team_id: string
  away_team_id: string
  home_goals: null
  away_goals: null
  starts_at: string | null
  match_status: "pending"
  phase_label: string
  round_number: number
  group_label: string | null
}

export interface MatchScheduleSlot {
  day_of_week: number
  time: string
}

export interface GroupAssignment {
  group_label: string
  teams: FixtureTeam[]
}

export interface GroupFixtureResult {
  assignments: GroupAssignment[]
  matches: GeneratedTournamentMatchInput[]
}

export interface StandingRow {
  pos: number
  team_id: string
  team_name: string
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
  dg: number
  pts: number
}

interface MutableStandingRow {
  team_id: string
  team_name: string
  pj: number
  pg: number
  pe: number
  pp: number
  gf: number
  gc: number
}

function buildSeededRandom(seed: string): () => number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }

  return () => {
    h += h << 13
    h ^= h >>> 7
    h += h << 3
    h ^= h >>> 17
    h += h << 5
    return ((h >>> 0) % 10000) / 10000
  }
}

function shuffleWithSeed<T>(items: T[], seed: string): T[] {
  const rand = buildSeededRandom(seed)
  const arr = [...items]

  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }

  return arr
}

function roundLabel(roundNumber: number): string {
  return `Jornada ${roundNumber}`
}

function groupLabelFromIndex(index: number): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  if (index < alphabet.length) {
    return `Grupo ${alphabet[index]}`
  }

  return `Grupo ${index + 1}`
}

function parseTimeSlot(time: string): { hours: number; minutes: number } {
  const [hours, minutes] = time.split(":").map((segment) => Number(segment))
  return { hours, minutes }
}

function buildMatchStart(anchorIso: string, slot: MatchScheduleSlot, weekOffset: number): string {
  const anchor = new Date(anchorIso)
  const candidate = new Date(anchor)
  candidate.setHours(0, 0, 0, 0)

  const anchorDay = candidate.getDay()
  const dayDelta = (slot.day_of_week - anchorDay + 7) % 7
  const { hours, minutes } = parseTimeSlot(slot.time)

  candidate.setDate(candidate.getDate() + dayDelta + weekOffset * 7)
  candidate.setHours(hours, minutes, 0, 0)

  if (candidate < anchor) {
    candidate.setDate(candidate.getDate() + 7)
  }

  return candidate.toISOString()
}

export function buildMatchScheduleSlots(scheduleDays: TournamentScheduleDay[]): MatchScheduleSlot[] {
  const slots: MatchScheduleSlot[] = []

  const sortedDays = [...scheduleDays].sort((a, b) => a.day_of_week - b.day_of_week)

  sortedDays.forEach((day) => {
    const sortedTimes = [...day.times].sort()
    sortedTimes.forEach((time) => {
      slots.push({ day_of_week: day.day_of_week, time })
    })
  })

  return slots
}

export function assignMatchStartsAt(
  matches: GeneratedTournamentMatchInput[],
  anchorIso: string,
  scheduleDays?: TournamentScheduleDay[] | null,
  seed = anchorIso
): GeneratedTournamentMatchInput[] {
  if (!scheduleDays || scheduleDays.length === 0) {
    return matches
  }

  const slots = buildMatchScheduleSlots(scheduleDays)
  if (slots.length === 0) {
    return matches
  }

  return matches.map((match, index) => {
    const weekOffset = Math.floor(index / slots.length)
    const cycleSlots = shuffleWithSeed(slots, `${seed}:${weekOffset}`)
    const slot = cycleSlots[index % slots.length]
    return {
      ...match,
      starts_at: buildMatchStart(anchorIso, slot, weekOffset),
    }
  })
}

export function assignScheduleToExistingMatches(
  matches: Array<Pick<TournamentMatch, "id" | "round_number" | "created_at"> & GeneratedTournamentMatchInput>,
  anchorIso: string,
  scheduleDays?: TournamentScheduleDay[] | null,
  seed = anchorIso
): Array<{ id: string; starts_at: string | null }> {
  const scheduledMatches = assignMatchStartsAt(matches, anchorIso, scheduleDays, seed)
  return scheduledMatches.map((match) => ({
    id: match.id,
    starts_at: match.starts_at,
  }))
}

export function generateRoundRobinRounds(teamIds: string[]): RoundRobinPair[][] {
  if (teamIds.length < 2) {
    return []
  }

  const list: Array<string | null> = [...teamIds]
  if (list.length % 2 !== 0) {
    list.push(null)
  }

  const rounds: RoundRobinPair[][] = []
  const totalRounds = list.length - 1
  const half = list.length / 2
  const rotating = [...list]

  for (let roundIndex = 0; roundIndex < totalRounds; roundIndex += 1) {
    const roundPairs: RoundRobinPair[] = []

    for (let i = 0; i < half; i += 1) {
      const a = rotating[i]
      const b = rotating[rotating.length - 1 - i]

      if (!a || !b) {
        roundPairs.push({
          home_team_id: a,
          away_team_id: b,
          is_bye: true,
        })
        continue
      }

      // Alternating the anchor pair and mirrored pairs evens out home/away distribution.
      const shouldFlip = i === 0 ? roundIndex % 2 === 1 : roundIndex % 2 === 0
      roundPairs.push({
        home_team_id: shouldFlip ? b : a,
        away_team_id: shouldFlip ? a : b,
        is_bye: false,
      })
    }

    rounds.push(roundPairs)

    // Circle method rotation: keep first team fixed and rotate the rest.
    const fixed = rotating[0]
    const tail = rotating.slice(1)
    tail.unshift(tail.pop() ?? null)
    rotating.splice(0, rotating.length, fixed, ...tail)
  }

  return rounds
}

export function generateLeagueFixture(
  tournamentId: string,
  teams: FixtureTeam[],
  leagueMode: LeagueMode
): GeneratedTournamentMatchInput[] {
  const rounds = generateRoundRobinRounds(teams.map((team) => team.id))
  const matches: GeneratedTournamentMatchInput[] = []

  rounds.forEach((round, index) => {
    const roundNumber = index + 1
    round.forEach((pair) => {
      if (pair.is_bye || !pair.home_team_id || !pair.away_team_id) return

      matches.push({
        tournament_id: tournamentId,
        home_team_id: pair.home_team_id,
        away_team_id: pair.away_team_id,
        home_goals: null,
        away_goals: null,
        starts_at: null,
        match_status: "pending",
        phase_label: roundLabel(roundNumber),
        round_number: roundNumber,
        group_label: null,
      })
    })
  })

  if (leagueMode === "home_away") {
    const firstLegMatches = [...matches]
    const offset = rounds.length

    firstLegMatches.forEach((match) => {
      matches.push({
        ...match,
        home_team_id: match.away_team_id,
        away_team_id: match.home_team_id,
        round_number: match.round_number + offset,
        phase_label: roundLabel(match.round_number + offset),
      })
    })
  }

  return matches
}

export function generateFixtureWithSchedule(
  tournamentId: string,
  teams: FixtureTeam[],
  leagueMode: LeagueMode,
  anchorIso: string,
  scheduleDays?: TournamentScheduleDay[] | null
): GeneratedTournamentMatchInput[] {
  const matches = generateLeagueFixture(tournamentId, teams, leagueMode)
  return assignMatchStartsAt(matches, anchorIso, scheduleDays, tournamentId)
}

export function assignTeamsToGroups(
  teams: FixtureTeam[],
  groupsCount: number,
  seed: string
): GroupAssignment[] {
  const safeGroupsCount = Math.max(2, Math.min(groupsCount, teams.length))
  const shuffledTeams = shuffleWithSeed(teams, seed)

  const groups: GroupAssignment[] = Array.from({ length: safeGroupsCount }, (_, index) => ({
    group_label: groupLabelFromIndex(index),
    teams: [],
  }))

  shuffledTeams.forEach((team, index) => {
    const groupIndex = index % safeGroupsCount
    groups[groupIndex].teams.push(team)
  })

  return groups
}

export function generateGroupsFixture(
  tournamentId: string,
  teams: FixtureTeam[],
  groupsCount: number,
  seed: string
): GroupFixtureResult {
  const assignments = assignTeamsToGroups(teams, groupsCount, seed)
  const matches: GeneratedTournamentMatchInput[] = []

  assignments.forEach((group) => {
    const rounds = generateRoundRobinRounds(group.teams.map((team) => team.id))
    rounds.forEach((round, roundIndex) => {
      const roundNumber = roundIndex + 1
      round.forEach((pair) => {
        if (pair.is_bye || !pair.home_team_id || !pair.away_team_id) return

        matches.push({
          tournament_id: tournamentId,
          home_team_id: pair.home_team_id,
          away_team_id: pair.away_team_id,
          home_goals: null,
          away_goals: null,
          starts_at: null,
          match_status: "pending",
          phase_label: `${group.group_label} - ${roundLabel(roundNumber)}`,
          round_number: roundNumber,
          group_label: group.group_label,
        })
      })
    })
  })

  return {
    assignments,
    matches,
  }
}

export function generateGroupsFixtureWithSchedule(
  tournamentId: string,
  teams: FixtureTeam[],
  groupsCount: number,
  seed: string,
  anchorIso: string,
  scheduleDays?: TournamentScheduleDay[] | null
): GroupFixtureResult {
  const fixture = generateGroupsFixture(tournamentId, teams, groupsCount, seed)
  return {
    assignments: fixture.assignments,
    matches: assignMatchStartsAt(fixture.matches, anchorIso, scheduleDays, tournamentId),
  }
}

export function computeStandings(
  teams: Array<Pick<TournamentTeam, "id" | "name">>,
  matches: TournamentMatch[]
): StandingRow[] {
  const table = new Map<string, MutableStandingRow>()

  teams.forEach((team) => {
    table.set(team.id, {
      team_id: team.id,
      team_name: team.name,
      pj: 0,
      pg: 0,
      pe: 0,
      pp: 0,
      gf: 0,
      gc: 0,
    })
  })

  matches.forEach((match) => {
    if (
      !match.home_team_id ||
      !match.away_team_id ||
      match.home_goals === null ||
      match.away_goals === null
    ) {
      return
    }

    const home = table.get(match.home_team_id)
    const away = table.get(match.away_team_id)
    if (!home || !away) return

    home.pj += 1
    away.pj += 1
    home.gf += match.home_goals
    home.gc += match.away_goals
    away.gf += match.away_goals
    away.gc += match.home_goals

    if (match.home_goals > match.away_goals) {
      home.pg += 1
      away.pp += 1
    } else if (match.home_goals < match.away_goals) {
      away.pg += 1
      home.pp += 1
    } else {
      home.pe += 1
      away.pe += 1
    }
  })

  const sorted = Array.from(table.values())
    .map((row) => {
      const pts = row.pg * 3 + row.pe
      const dg = row.gf - row.gc
      return {
        ...row,
        pts,
        dg,
      }
    })
    .sort((a, b) => {
      if (b.pts !== a.pts) return b.pts - a.pts
      if (b.dg !== a.dg) return b.dg - a.dg
      if (b.gf !== a.gf) return b.gf - a.gf
      return a.team_name.localeCompare(b.team_name, "es")
    })

  return sorted.map((row, index) => ({
    pos: index + 1,
    team_id: row.team_id,
    team_name: row.team_name,
    pj: row.pj,
    pg: row.pg,
    pe: row.pe,
    pp: row.pp,
    gf: row.gf,
    gc: row.gc,
    dg: row.dg,
    pts: row.pts,
  }))
}

export function computeStandingsByGroup(
  tournament: Tournament,
  teams: TournamentTeam[],
  matches: TournamentMatch[]
): Record<string, StandingRow[]> {
  if (tournament.tournament_type === "league") {
    return {
      General: computeStandings(teams, matches),
    }
  }

  const result: Record<string, StandingRow[]> = {}
  const groups = new Set(matches.map((match) => match.group_label).filter(Boolean) as string[])

  groups.forEach((groupLabel) => {
    const groupMatches = matches.filter((match) => match.group_label === groupLabel)
    const teamIds = new Set<string>()

    groupMatches.forEach((match) => {
      if (match.home_team_id) teamIds.add(match.home_team_id)
      if (match.away_team_id) teamIds.add(match.away_team_id)
    })

    const groupTeams = teams.filter((team) => teamIds.has(team.id))
    result[groupLabel] = computeStandings(groupTeams, groupMatches)
  })

  return result
}
