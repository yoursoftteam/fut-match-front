import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type WcGame = {
  _id?: string;
  id?: string;
  home_team_id?: string;
  away_team_id?: string;
  home_score?: string | null;
  away_score?: string | null;
  finished?: string;
};

type BetMatch = {
  id: string;
  api_fixture_id: string;
  kickoff_at: string;
  status: "scheduled" | "live" | "finished";
  home_team_id: string | null;
  away_team_id: string | null;
};

const BASE_URL = Deno.env.get("WC26_API_BASE_URL") ?? "http://worldcup26.ir:3050";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isValidScore(score: unknown): score is number {
  return Number.isInteger(score) && (score as number) >= 0 && (score as number) <= 20;
}

async function fetchText(url: string, maxRetries = 3): Promise<string> {
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
        throw new Error(`WorldCup26 request failed with status ${response.status} for ${url}`);
      }

      return await response.text();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }
      await sleep(1000 * attempt);
    }
  }

  throw new Error("Unexpected retry exhaustion");
}

function hasStarted(game: WcGame): boolean {
  const home = game.home_score;
  const away = game.away_score;

  if (home === null || home === undefined || home === "" || away === null || away === undefined || away === "") return false;

  return true;
}

serve(async (req) => {
  const execId = crypto.randomUUID().slice(0, 8);
  const startedAt = new Date().toISOString();
  console.log(`[${execId}] START | ${startedAt}`);

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";

    if (!serviceRoleKey || !supabaseUrl) {
      console.error(`[${execId}] MISSING_ENV | SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set`);
      return new Response(
        JSON.stringify({
          status: "error",
          message: "Missing required env vars: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    console.log(`[${execId}] ENV_OK | SUPABASE_URL=${supabaseUrl}`);

    const authHeader = req.headers.get("Authorization") ?? "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (bearerToken !== serviceRoleKey) {
      console.error(`[${execId}] UNAUTHORIZED | bearer token does not match service role key`);
      return new Response(
        JSON.stringify({ status: "error", message: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    console.log(`[${execId}] AUTH_OK`);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const now = new Date().toISOString();
    console.log(`[${execId}] QUERY | looking for matches with status=scheduled AND kickoff_at<${now} AND api_fixture_id IS NOT NULL`);

    const { data: scheduledMatches, error: matchesError } = await supabase
      .from("bet_matches")
      .select("id, api_fixture_id, kickoff_at, status, home_team_id, away_team_id")
      .eq("status", "scheduled")
      .lt("kickoff_at", now)
      .not("api_fixture_id", "is", null);

    if (matchesError) {
      console.error(`[${execId}] DB_ERROR | ${matchesError.message}`);
      throw new Error(`Failed to query scheduled matches: ${matchesError.message}`);
    }

    const matches = (scheduledMatches ?? []) as BetMatch[];
    for (const m of matches) {
      console.log(`[${execId}] FOUND | match=${m.id} | kickoff=${m.kickoff_at} | api_fixture=${m.api_fixture_id}`);
    }

    if (matches.length === 0) {
      console.log(`[${execId}] DONE | no matches to process, elapsed=${Date.now() - new Date(startedAt).getTime()}ms`);
      return new Response(
        JSON.stringify({
          status: "skipped",
          message: "No scheduled matches with passed kickoff",
          api_calls: 0,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    let updatedLive = 0;
    let updatedFinished = 0;
    let skippedLiveNoScore = 0;
    let apiCalls = 0;

    for (const match of matches) {
      const fixtureId = match.api_fixture_id;
      const gameUrl = `${BASE_URL}/get/game/${fixtureId}`;

      console.log(`[${execId}] PROCESS | match=${match.id} | fixture=${fixtureId} | kickoff=${match.kickoff_at} | status=${match.status} | api_url=${gameUrl}`);

      let gameBody: string;
      try {
        gameBody = await fetchText(gameUrl, 3);
        apiCalls++;
        console.log(`[${execId}] API_OK | match=${match.id} | fixture=${fixtureId} | response_length=${gameBody.length} | body=${gameBody.slice(0, 2000)}`);
      } catch (err) {
        console.error(`[${execId}] API_ERROR | match=${match.id} | fixture=${fixtureId} | error=${err instanceof Error ? err.message : err}`);
        continue;
      }

      let game: WcGame;
      try {
        const parsed = JSON.parse(gameBody);
        game = (parsed && typeof parsed === "object" && "game" in parsed ? parsed.game : parsed) as WcGame;
        console.log(`[${execId}] PARSE_OK | match=${match.id} | fixture=${fixtureId} | has_game_wrapper=${"game" in (typeof parsed === "object" ? parsed : {})}`);
      } catch {
        console.error(`[${execId}] PARSE_ERROR | match=${match.id} | fixture=${fixtureId} | invalid JSON body`);
        continue;
      }

      console.log(
        `[${execId}] API_DATA | match=${match.id} | fixture=${fixtureId} | ` +
        `finished=${game.finished} | home_score=${game.home_score ?? "null"} | away_score=${game.away_score ?? "null"}`
      );

      const isFinished = String(game.finished ?? "").toUpperCase() === "TRUE";
      console.log(`[${execId}] DECISION | match=${match.id} | fixture=${fixtureId} | is_finished=${isFinished}`);

      if (isFinished) {
        const homeScore = Number(game.home_score);
        const awayScore = Number(game.away_score);

        if (!isValidScore(homeScore) || !isValidScore(awayScore)) {
          console.log(`[${execId}] SKIP | match=${match.id} | finished but invalid scores: home=${game.home_score} away=${game.away_score}`);
          continue;
        }

        console.log(`[${execId}] RPC_CALL | match=${match.id} | calling fn_update_match_result(${homeScore}, ${awayScore})`);
        const { data: rpcResponse, error: rpcError } = await supabase.rpc("fn_update_match_result", {
          p_match_id: match.id,
          p_home_score: homeScore,
          p_away_score: awayScore,
        });

        if (rpcError) {
          console.error(`[${execId}] RPC_ERROR | match=${match.id} | ${rpcError.message}`);
          continue;
        }

        const row = Array.isArray(rpcResponse) ? rpcResponse[0] : rpcResponse;
        if (row?.success === true) {
          console.log(`[${execId}] UPDATED_FINISHED | match=${match.id} | score=${homeScore}-${awayScore} | message=${row.message}`);
          updatedFinished++;
        } else {
          console.log(`[${execId}] RPC_RESP | match=${match.id} | unexpected response: ${JSON.stringify(row)}`);
        }
        continue;
      }

      if (hasStarted(game)) {
        console.log(`[${execId}] LIVE | match=${match.id} | has_started=true | updating status to 'live'`);
        const { error: updateError } = await supabase
          .from("bet_matches")
          .update({ status: "live" })
          .eq("id", match.id);

        if (updateError) {
          console.error(`[${execId}] UPDATE_ERROR | match=${match.id} | ${updateError.message}`);
          continue;
        }

        console.log(`[${execId}] UPDATED_LIVE | match=${match.id} | status changed to live`);
        updatedLive++;
      } else {
        console.log(`[${execId}] SKIP | match=${match.id} | has_started=false (no scores yet, match may not have kicked off)`);
        skippedLiveNoScore++;
      }
    }

    const elapsed = Date.now() - new Date(startedAt).getTime();
    console.log(`[${execId}] SUMMARY | checked=${matches.length} | live=${updatedLive} | finished=${updatedFinished} | skipped=${skippedLiveNoScore} | api_calls=${apiCalls} | elapsed=${elapsed}ms`);

    return new Response(
      JSON.stringify({
        status: "success",
        exec_id: execId,
        checked_matches: matches.length,
        updated_live: updatedLive,
        updated_finished: updatedFinished,
        skipped_no_score: skippedLiveNoScore,
        api_calls: apiCalls,
        elapsed_ms: elapsed,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const elapsed = Date.now() - new Date(startedAt).getTime();
    console.error(`[${execId}] FATAL | ${message} | elapsed=${elapsed}ms`);

    return new Response(
      JSON.stringify({ status: "error", message, exec_id: execId }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
