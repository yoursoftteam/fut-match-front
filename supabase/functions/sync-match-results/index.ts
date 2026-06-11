import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type WcGame = {
  _id?: string;
  id?: string;
  home_team_id?: string;
  away_team_id?: string;
  home_score?: string;
  away_score?: string;
  finished?: string;
};

type WcTeam = {
  id?: string;
  fifa_code?: string;
};

type BetMatch = {
  id: string;
  api_fixture_id: string;
  kickoff_at: string;
  status: "scheduled" | "live" | "finished";
  home_team_id: string | null;
  away_team_id: string | null;
};

const BASE_URL = Deno.env.get("WC26_API_BASE_URL") ?? "https://worldcup26.ir";
const FIFA_CODE_ALIASES = new Map<string, string>([["KSA", "SAU"], ["HAI", "HTI"]]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidScore(score: unknown): score is number {
  return Number.isInteger(score) && (score as number) >= 0 && (score as number) <= 20;
}

function normalizeFifaCode(code: string | null | undefined): string {
  const normalized = String(code ?? "").trim().toUpperCase();
  return FIFA_CODE_ALIASES.get(normalized) ?? normalized;
}

function getGameFixtureId(game: WcGame): string | null {
  const raw = game._id ?? game.id;
  const id = String(raw ?? "").trim();
  return id.length > 0 ? id : null;
}

function getGameLegacyId(game: WcGame): string | null {
  const id = String(game.id ?? "").trim();
  return id.length > 0 ? id : null;
}

async function fetchWithRetry(url: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url);

      if (response.status === 429) {
        if (attempt === maxRetries) {
          throw new Error("WorldCup26 API rate limit reached after max retries (429)");
        }
        await sleep(1000 * attempt * 2);
        continue;
      }

      if (!response.ok) {
        if (response.status >= 500 && attempt < maxRetries) {
          await sleep(1000 * attempt);
          continue;
        }
        throw new Error(`WorldCup26 request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await sleep(1000 * attempt);
    }
  }

  throw new Error("Unexpected retry exhaustion");
}

serve(async (req) => {
  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    if (!serviceRoleKey || !supabaseUrl) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (bearerToken !== serviceRoleKey) {
      return new Response(
        JSON.stringify({ status: "error", message: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date();
    const threshold = new Date(now.getTime() - 125 * 60 * 1000).toISOString();

    const { data: activeMatches, error: activeMatchesError } = await supabase
      .from("bet_matches")
      .select("id, api_fixture_id, kickoff_at, status, home_team_id, away_team_id")
      .in("status", ["scheduled", "live", "finished"])
      .lte("kickoff_at", threshold)
      .not("api_fixture_id", "is", null);

    if (activeMatchesError) {
      throw new Error(`Failed to load eligible matches: ${activeMatchesError.message}`);
    }

    const matches = (activeMatches ?? []) as BetMatch[];

    if (matches.length === 0) {
      return new Response(
        JSON.stringify({
          status: "skipped",
          message: "No matches in active sync window",
          checked_before: threshold,
          api_calls: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    const [gamesPayload, teamsPayload] = await Promise.all([
      fetchWithRetry(`${BASE_URL}/get/games`, 3),
      fetchWithRetry(`${BASE_URL}/get/teams`, 3),
    ]);

    const games = (gamesPayload?.games ?? []) as WcGame[];
    const wcTeams = (teamsPayload?.teams ?? []) as WcTeam[];

    console.log("[API] games fetched:", games.length, "| teams fetched:", wcTeams.length);
    if (games.length > 0) {
      console.log("[API] sample game:", JSON.stringify(games[0], null, 2));
    }

    const matchByFixtureId = new Map<string, BetMatch>();
    const gameById = new Map<string, WcGame>();
    const worldcupCodeByTeamId = new Map<string, string>();

    for (const match of matches) {
      matchByFixtureId.set(match.api_fixture_id, match);
    }

    for (const game of games) {
      const gameId = getGameFixtureId(game);
      if (gameId) {
        gameById.set(gameId, game);
      }
      const legacyId = getGameLegacyId(game);
      if (legacyId) {
        gameById.set(legacyId, game);
      }
    }

    for (const team of wcTeams) {
      const teamId = String(team.id ?? "").trim();
      const code = normalizeFifaCode(team.fifa_code);
      if (teamId && code) {
        worldcupCodeByTeamId.set(teamId, code);
      }
    }

    const { data: teamsData, error: teamsError } = await supabase
      .from("bet_teams")
      .select("id, fifa_code");

    if (teamsError) {
      throw new Error(`Failed to load teams map: ${teamsError.message}`);
    }

    const teamIdByCode = new Map<string, string>();
    for (const team of teamsData ?? []) {
      const code = normalizeFifaCode(team.fifa_code);
      if (code) {
        teamIdByCode.set(code, team.id);
      }
    }

    let updatedFinished = 0;
    let updatedTeams = 0;
    let skippedOutOfRange = 0;

    for (const [fixtureId, localMatch] of matchByFixtureId.entries()) {
      const game = gameById.get(fixtureId);
      if (!game) {
        console.log(`[MATCH] ${localMatch.id} | fixture ${fixtureId} | NOT FOUND in API`);
        continue;
      }

      console.log(
        `[MATCH] ${localMatch.id} | fixture ${fixtureId} | ` +
        `api_finished=${game.finished} | api_score=${game.home_score ?? "?"}-${game.away_score ?? "?"} | ` +
        `db_status=${localMatch.status}`
      );

      const apiHomeCode = normalizeFifaCode(worldcupCodeByTeamId.get(String(game.home_team_id ?? "")));
      const apiAwayCode = normalizeFifaCode(worldcupCodeByTeamId.get(String(game.away_team_id ?? "")));
      const mappedHomeTeamId = apiHomeCode ? teamIdByCode.get(apiHomeCode) ?? null : null;
      const mappedAwayTeamId = apiAwayCode ? teamIdByCode.get(apiAwayCode) ?? null : null;

      const teamPatch: { home_team_id?: string; away_team_id?: string } = {};

      if (mappedHomeTeamId && mappedHomeTeamId !== localMatch.home_team_id) {
        teamPatch.home_team_id = mappedHomeTeamId;
      }
      if (mappedAwayTeamId && mappedAwayTeamId !== localMatch.away_team_id) {
        teamPatch.away_team_id = mappedAwayTeamId;
      }

      if (
        Object.keys(teamPatch).length > 0 &&
        (!teamPatch.home_team_id || !teamPatch.away_team_id || teamPatch.home_team_id !== teamPatch.away_team_id)
      ) {
        const { error: teamUpdateError } = await supabase
          .from("bet_matches")
          .update(teamPatch)
          .eq("id", localMatch.id);

        if (!teamUpdateError) {
          updatedTeams++;
        }
      }

      const isFinished = String(game.finished ?? "").toUpperCase() === "TRUE";
      if (!isFinished) {
        console.log(`[MATCH] ${localMatch.id} | SKIPPED — still live`);
        continue;
      }

      const homeScore = Number(game.home_score);
      const awayScore = Number(game.away_score);

      if (!isValidScore(homeScore) || !isValidScore(awayScore)) {
        console.log(`[MATCH] ${localMatch.id} | SKIPPED — invalid scores: ${game.home_score}-${game.away_score}`);
        skippedOutOfRange++;
        continue;
      }

      const { data: rpcResponse, error: rpcError } = await supabase.rpc("fn_update_match_result", {
        p_match_id: localMatch.id,
        p_home_score: homeScore,
        p_away_score: awayScore,
      });

      if (rpcError) {
        console.error("[MATCH]", localMatch.id, "| RPC error:", rpcError.message);
        continue;
      }

      const row = Array.isArray(rpcResponse) ? rpcResponse[0] : rpcResponse;
      if (row?.success === true) {
        console.log(`[MATCH] ${localMatch.id} | UPDATED — ${homeScore}-${awayScore} | ${row.message}`);
        updatedFinished++;
      }
    }

    return new Response(
      JSON.stringify({
        status: "success",
        checked_matches: matches.length,
        updated_finished_matches: updatedFinished,
        updated_teams: updatedTeams,
        skipped_out_of_range_scores: skippedOutOfRange,
        checked_before: threshold,
        api_calls: 2,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({ status: "error", message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
