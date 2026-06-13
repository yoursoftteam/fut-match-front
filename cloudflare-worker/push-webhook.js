/**
 * parti2 push webhook — Cloudflare Worker
 *
 * Receives match_registration_created / match_registration_deleted events
 * from the Supabase DB triggers and sends Firebase Cloud Messaging (FCM)
 * push notifications to all subscribed devices for that match.
 *
 * Worker secrets (Settings > Variables > Secrets):
 *   WEBHOOK_SECRET       — must match push_webhook_config.webhook_secret in DB
 *   FCM_SERVICE_ACCOUNT  — full JSON string of the Firebase service account key
 *   SUPABASE_URL         — Supabase project URL (e.g. https://xxx.supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY — Supabase service role key (for reading push_subscriptions)
 */

export default {
  async fetch(request, env) {
    const { method, url } = request;
    const { pathname } = new URL(url);

    if (method !== "POST" || pathname !== "/api/push/match-registration") {
      console.log(`[push] ignored: ${method} ${pathname}`);
      return new Response("Not found", { status: 404 });
    }

    // ── Auth ────────────────────────────────────────────────────────────────
    const incomingSecret = request.headers.get("x-parti2-webhook-secret");

    if (!env.WEBHOOK_SECRET) {
      console.error("[push] WEBHOOK_SECRET env var is not set");
      return new Response("Server misconfiguration", { status: 500 });
    }

    if (incomingSecret !== env.WEBHOOK_SECRET) {
      console.warn("[push] unauthorized: secret mismatch");
      return new Response("Unauthorized", { status: 401 });
    }

    // ── Parse body ──────────────────────────────────────────────────────────
    let payload;
    try {
      payload = await request.json();
    } catch (err) {
      console.error("[push] failed to parse JSON body:", err.message);
      return new Response("Bad request", { status: 400 });
    }

    const { event, registration, match, _debug } = payload;

    console.log("[push] event:", event);
    console.log("[push] match:", match?.id);
    console.log("[push] env.SUPABASE_URL:", env.SUPABASE_URL ? "set" : "NOT SET");
    console.log("[push] env.SUPABASE_SERVICE_ROLE_KEY:", env.SUPABASE_SERVICE_ROLE_KEY ? "set" : "NOT SET");

    // ── Build notification content ──────────────────────────────────────────
    let title, body;
    if (event === "match_registration_created") {
      const role = registration.is_goalkeeper ? "🥅 Arquero" : "⚽ Jugador de campo";
      title = `Nuevo jugador en ${match.title || match.location}`;
      body = `${registration.name} · ${role}`;
    } else if (event === "match_registration_deleted") {
      const role = registration.is_goalkeeper ? "🥅 Arquero" : "⚽ Jugador de campo";
      title = `Jugador se dio de baja en ${match.title || match.location}`;
      body = `${registration.name} · ${role}`;
    } else {
      console.warn("[push] unknown event:", event);
      return Response.json({ ok: false, reason: "unknown_event" }, { status: 400 });
    }

    // ── Get subscribed tokens from Supabase ─────────────────────────────────
    const tokens = await getSubscribedTokens(match.id, env);
    if (tokens.error) {
      return Response.json({ ok: false, sent: 0, debug: "v2-query-error", match_id: match.id, error: tokens.error, status: tokens.status, url: tokens.url });
    }
    console.log(`[push] subscribed tokens for match ${match.id}:`, tokens.length);

    if (tokens.length === 0) {
      console.log("[push] no subscribers, skipping");
      return Response.json({ ok: true, sent: 0, debug: "v2-no-tokens", match_id: match.id, url_short: (env.SUPABASE_URL || "").replace(/^https?:\/\//,"").slice(0,40), sk_short: (env.SUPABASE_SERVICE_ROLE_KEY || "").slice(0,10) + "..." });
    }

    // ── Send FCM notification to each token ─────────────────────────────────
    try {
      const result = await sendFcmPush({
        tokens,
        title,
        body,
        matchId: match.id,
        registrationId: registration.id,
        playerName: registration.name,
        isGoalkeeper: registration.is_goalkeeper,
        env,
      });
      console.log("[push] FCM sent:", JSON.stringify(result));
      return Response.json({ ok: true, sent: tokens.length });
    } catch (err) {
      console.error("[push] FCM failed:", err.message);
      return Response.json({ ok: false, reason: err.message }, { status: 500 });
    }
  },
};

// ── Supabase: get subscribed FCM tokens for a match ──────────────────────────

async function getSubscribedTokens(matchId, env) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("[push] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set");
    return [];
  }

  const url = `${env.SUPABASE_URL}/rest/v1/push_subscriptions?match_id=eq.${matchId}&select=fcm_token`;

  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`[push] supabase query failed: ${res.status} ${errText}`);
    return { error: `supabase_${res.status}`, status: res.status, url: url.substring(0, 100) };
  }

  const rows = await res.json();
  console.log(`[push] supabase query returned ${rows.length} rows for match ${matchId}`);
  console.log(`[push] raw response length: ${JSON.stringify(rows).length}`);
  return rows.map((r) => r.fcm_token);
}

// ── FCM v1 HTTP API via service account ──────────────────────────────────────

async function sendFcmPush({ tokens, title, body, matchId, registrationId, playerName, isGoalkeeper, env }) {
  if (!env.FCM_SERVICE_ACCOUNT) {
    throw new Error("FCM_SERVICE_ACCOUNT secret is not set in Worker");
  }

  const serviceAccount = JSON.parse(env.FCM_SERVICE_ACCOUNT);
  const accessToken = await getFcmAccessToken(serviceAccount);

  const results = [];

  for (const token of tokens) {
    const message = {
      message: {
        token,
        notification: { title, body },
        data: {
          match_id: matchId,
          registration_id: registrationId,
          player_name: playerName,
          is_goalkeeper: String(isGoalkeeper),
        },
        android: { priority: "high" },
        apns: {
          headers: { "apns-priority": "10" },
          payload: { aps: { sound: "default" } },
        },
        webpush: {
          headers: { Urgency: "high" },
        },
      },
    };

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
      }
    );

    const responseText = await res.text();
    results.push({ token: token.slice(0, 20) + "...", status: res.status });

    if (!res.ok) {
      console.error(`[push] send failed for token: ${responseText}`);
    }
  }

  console.log(`[push] sent ${results.length} pushes`);
  return results;
}

// ── Google OAuth2 token from service account (RS256 JWT) ─────────────────────

async function getFcmAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    sub: serviceAccount.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
  };

  const encode = (obj) =>
    btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const headerB64 = encode(header);
  const claimB64 = encode(claim);
  const signingInput = `${headerB64}.${claimB64}`;

  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");

  const keyData = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${signingInput}.${signatureB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`OAuth token exchange failed: ${err}`);
  }

  const { access_token } = await tokenRes.json();
  return access_token;
}
