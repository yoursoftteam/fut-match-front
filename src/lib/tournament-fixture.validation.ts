import {
  assignTeamsToGroups,
  computeStandings,
  generateGroupsFixture,
  generateGroupsFixtureWithSchedule,
  generateLeagueFixture,
  generateFixtureWithSchedule,
  generateRoundRobinRounds,
  type FixtureTeam,
} from "@/lib/tournament-fixture"
import type { TournamentMatch } from "@/lib/tournament-schema"

export interface ValidationResult {
  name: string
  pass: boolean
  detail: string
}

function assertCondition(name: string, condition: boolean, detail: string): ValidationResult {
  return {
    name,
    pass: condition,
    detail,
  }
}

export function runTournamentAlgorithmValidations(): ValidationResult[] {
  const teams: FixtureTeam[] = [
    { id: "A", name: "A" },
    { id: "B", name: "B" },
    { id: "C", name: "C" },
    { id: "D", name: "D" },
    { id: "E", name: "E" },
  ]

  const leagueSingle = generateLeagueFixture("t1", teams, "single_leg")
  const leagueDouble = generateLeagueFixture("t1", teams, "home_away")
  const roundsOdd = generateRoundRobinRounds(teams.map((t) => t.id))
  const groups = assignTeamsToGroups(teams, 2, "seed-1")
  const groupsFixture = generateGroupsFixture("t1", teams, 2, "seed-1")
  const scheduledLeague = generateFixtureWithSchedule(
    "t1",
    teams,
    "single_leg",
    "2026-05-26T12:00:00.000Z",
    [
      { day_of_week: 1, times: ["19:00", "21:00"] },
      { day_of_week: 3, times: ["20:00"] },
    ]
  )
  const scheduledGroups = generateGroupsFixtureWithSchedule(
    "t1",
    teams,
    2,
    "seed-1",
    "2026-05-26T12:00:00.000Z",
    [
      { day_of_week: 1, times: ["19:00", "21:00"] },
      { day_of_week: 3, times: ["20:00"] },
    ]
  )

  const sampleMatches: TournamentMatch[] = [
    {
      id: "m1",
      tournament_id: "t1",
      home_team_id: "A",
      away_team_id: "B",
      home_goals: 2,
      away_goals: 1,
      starts_at: null,
      match_status: "played",
      phase_label: "Jornada 1",
      round_number: 1,
      group_label: null,
      created_at: new Date().toISOString(),
    },
    {
      id: "m2",
      tournament_id: "t1",
      home_team_id: "C",
      away_team_id: "A",
      home_goals: 0,
      away_goals: 0,
      starts_at: null,
      match_status: "played",
      phase_label: "Jornada 2",
      round_number: 2,
      group_label: null,
      created_at: new Date().toISOString(),
    },
  ]

  const standings = computeStandings(
    teams.map((t) => ({ id: t.id, name: t.name })),
    sampleMatches
  )

  return [
    assertCondition(
      "round-robin-odd-rounds",
      roundsOdd.length === 5,
      `Esperado 5 jornadas para 5 equipos; obtenido ${roundsOdd.length}`
    ),
    assertCondition(
      "league-single-not-empty",
      leagueSingle.length > 0,
      `Esperado fixture de liga no vacío; obtenido ${leagueSingle.length}`
    ),
    assertCondition(
      "league-double-is-double",
      leagueDouble.length === leagueSingle.length * 2,
      `Esperado ida-vuelta = 2x; ${leagueDouble.length} vs ${leagueSingle.length}`
    ),
    assertCondition(
      "groups-balance",
      Math.abs(groups[0].teams.length - groups[1].teams.length) <= 1,
      `Desbalance detectado: ${groups[0].teams.length} vs ${groups[1].teams.length}`
    ),
    assertCondition(
      "groups-fixture-has-group-label",
      groupsFixture.matches.every((match) => Boolean(match.group_label)),
      "Todos los partidos de grupos deben tener group_label"
    ),
    assertCondition(
      "scheduled-league-has-starts",
      scheduledLeague.every((match) => Boolean(match.starts_at)),
      "Los partidos de liga con agenda deben tener starts_at"
    ),
    assertCondition(
      "scheduled-groups-has-starts",
      scheduledGroups.matches.every((match) => Boolean(match.starts_at)),
      "Los partidos de grupos con agenda deben tener starts_at"
    ),
    assertCondition(
      "standings-points-order",
      standings[0]?.team_id === "A" && standings[0]?.pts === 4,
      `Esperado A líder con 4 pts; obtenido ${standings[0]?.team_id ?? "none"} ${standings[0]?.pts ?? 0}`
    ),
  ]
}
