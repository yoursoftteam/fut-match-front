import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WC26_API_BASE_URL = process.env.WC26_API_BASE_URL ?? "https://worldcup26.ir";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const FIFA_CODE_ALIASES = new Map([["KSA", "SAU"], ["HAI", "HTI"]]);

function normalizeFifaCode(code) {
  const normalized = String(code ?? "").trim().toUpperCase();
  return FIFA_CODE_ALIASES.get(normalized) ?? normalized;
}

function toDateOnly(value) {
  return new Date(value).toISOString().slice(0, 10);
}

function toTimestampMs(value) {
  return new Date(value).getTime();
}

function worldcupDateToIsoDate(localDate) {
  const [datePart] = String(localDate ?? "").trim().split(" ");
  const [month, day, year] = datePart.split("/").map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function worldcupDateToTimestamp(localDate) {
  const [datePart, timePart = "00:00"] = String(localDate ?? "").trim().split(" ");
  const [month, day, year] = datePart.split("/").map(Number);
  const [hour = 0, minute = 0] = timePart.split(":").map(Number);

  if (!year || !month || !day) {
    return Number.NaN;
  }

  return Date.UTC(year, month - 1, day, hour, minute, 0, 0);
}

function getGameFixtureId(game) {
  const raw = game?._id ?? game?.id;
  const id = String(raw ?? "").trim();
  return id.length > 0 ? id : null;
}

function getGameMatchNumber(game) {
  const raw = String(game?.id ?? "").trim();
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? String(n) : null;
}

async function hydrateFixtureIds() {
  console.log("Starting api_fixture_id hydration...");

  const { data: dbMatches, error: dbError } = await supabase
    .from("bet_matches")
    .select(
      "id, kickoff_at, stage, fifa_match_number, api_fixture_id, home_team:bet_teams!home_team_id(fifa_code), away_team:bet_teams!away_team_id(fifa_code)",
    )
    .order("fifa_match_number", { ascending: true, nullsFirst: false });

  if (dbError) {
    throw new Error(`Failed to load local matches: ${dbError.message}`);
  }

  const [gamesResponse, teamsResponse] = await Promise.all([
    fetch(`${WC26_API_BASE_URL}/get/games`),
    fetch(`${WC26_API_BASE_URL}/get/teams`),
  ]);

  if (!gamesResponse.ok) {
    throw new Error(`WorldCup26 games request failed: ${gamesResponse.status}`);
  }
  if (!teamsResponse.ok) {
    throw new Error(`WorldCup26 teams request failed: ${teamsResponse.status}`);
  }

  const gamesPayload = await gamesResponse.json();
  const teamsPayload = await teamsResponse.json();

  const worldcupCodeByTeamId = new Map();
  for (const team of teamsPayload?.teams ?? []) {
    const teamId = String(team?.id ?? "").trim();
    const code = normalizeFifaCode(team?.fifa_code);
    if (teamId && code) {
      worldcupCodeByTeamId.set(teamId, code);
    }
  }

  const apiGames = Array.isArray(gamesPayload?.games) ? [...gamesPayload.games] : [];
  const gamesByMatchNumber = new Map();
  for (const game of apiGames) {
    const matchNumber = getGameMatchNumber(game);
    if (matchNumber) {
      gamesByMatchNumber.set(matchNumber, game);
    }
  }

  let updated = 0;
  let alreadyMapped = 0;
  let unmatched = 0;

  for (const match of dbMatches ?? []) {
    if (match.api_fixture_id) {
      alreadyMapped++;
      continue;
    }

    let foundIndex = -1;

    if (Number.isInteger(match.fifa_match_number) && match.fifa_match_number > 0) {
      const fifaMatchNumber = String(match.fifa_match_number);
      const gameByNumber = gamesByMatchNumber.get(fifaMatchNumber);
      if (gameByNumber) {
        foundIndex = apiGames.findIndex((item) => getGameMatchNumber(item) === fifaMatchNumber);
      }
    }

    if (
      foundIndex < 0 &&
      match.stage === "group_stage" &&
      match.home_team?.fifa_code &&
      match.away_team?.fifa_code
    ) {
      const localDate = toDateOnly(match.kickoff_at);
      const homeCode = normalizeFifaCode(match.home_team.fifa_code);
      const awayCode = normalizeFifaCode(match.away_team.fifa_code);

      foundIndex = apiGames.findIndex((apiGame) => {
        const apiDate = worldcupDateToIsoDate(apiGame?.local_date);
        const apiHomeCode = normalizeFifaCode(worldcupCodeByTeamId.get(String(apiGame?.home_team_id ?? "")));
        const apiAwayCode = normalizeFifaCode(worldcupCodeByTeamId.get(String(apiGame?.away_team_id ?? "")));

        if (!apiDate || !apiHomeCode || !apiAwayCode) {
          return false;
        }

        return apiDate === localDate && apiHomeCode === homeCode && apiAwayCode === awayCode;
      });
    }

    if (foundIndex < 0) {
      const localTs = toTimestampMs(match.kickoff_at);
      const homeCode = normalizeFifaCode(match.home_team?.fifa_code);
      const awayCode = normalizeFifaCode(match.away_team?.fifa_code);

      foundIndex = apiGames.findIndex((apiGame) => {
        const apiHomeCode = normalizeFifaCode(worldcupCodeByTeamId.get(String(apiGame?.home_team_id ?? "")));
        const apiAwayCode = normalizeFifaCode(worldcupCodeByTeamId.get(String(apiGame?.away_team_id ?? "")));
        if (!apiHomeCode || !apiAwayCode || apiHomeCode !== homeCode || apiAwayCode !== awayCode) {
          return false;
        }

        const apiTs = worldcupDateToTimestamp(apiGame?.local_date);
        if (!Number.isFinite(apiTs)) {
          return false;
        }

        const deltaHours = Math.abs(apiTs - localTs) / 36e5;
        return deltaHours <= 24;
      });
    }

    if (foundIndex < 0) {
      const localTs = toTimestampMs(match.kickoff_at);

      foundIndex = apiGames.findIndex((apiGame) => {
        const apiTs = worldcupDateToTimestamp(apiGame?.local_date);
        if (!Number.isFinite(apiTs)) {
          return false;
        }

        const deltaHours = Math.abs(apiTs - localTs) / 36e5;
        return deltaHours <= 2;
      });
    }

    if (foundIndex < 0) {
      unmatched++;
      continue;
    }

    const matched = apiGames[foundIndex];
    const fixtureId = getGameFixtureId(matched);

    if (!fixtureId) {
      unmatched++;
      continue;
    }

    const { error: updateError } = await supabase
      .from("bet_matches")
      .update({ api_fixture_id: fixtureId })
      .eq("id", match.id);

    if (updateError) {
      console.warn(`Failed updating match ${match.id}: ${updateError.message}`);
      unmatched++;
      continue;
    }

    apiGames.splice(foundIndex, 1);
    updated++;
  }

  console.log("Hydration finished");
  console.log(`Updated: ${updated}`);
  console.log(`Already mapped: ${alreadyMapped}`);
  console.log(`Unmatched: ${unmatched}`);
}

hydrateFixtureIds().catch((error) => {
  console.error(error);
  process.exit(1);
});
