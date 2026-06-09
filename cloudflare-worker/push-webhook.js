/**
 * parti2 push webhook — Cloudflare Worker
 *
 * Receives match_registration_created events from the Supabase DB trigger
 * and sends a Firebase Cloud Messaging (FCM) push to the match topic.
 *
 * Worker secrets (Settings > Variables > Secrets):
 *   WEBHOOK_SECRET       — must match push_webhook_config.webhook_secret in DB
 *   FCM_SERVICE_ACCOUNT  — full JSON string of the Firebase service account key
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
    console.log("[push] db debug:", JSON.stringify(_debug));
    console.log("[push] registration:", JSON.stringify(registration));
    console.log("[push] match:", JSON.stringify(match));

    if (event !== "match_registration_created") {
      console.warn("[push] unknown event:", event);
      return Response.json({ ok: false, reason: "unknown_event" }, { status: 400 });
    }

    // ── Send FCM notification ───────────────────────────────────────────────
    try {
      const result = await sendFcmPush({ registration, match, env });
      console.log("[push] FCM response:", JSON.stringify(result));
    } catch (err) {
      console.error("[push] FCM failed:", err.message);
      return Response.json({ ok: false, reason: err.message }, { status: 500 });
    }

    return Response.json({ ok: true });
  },
};

// ── FCM v1 HTTP API via service account ──────────────────────────────────────

async function sendFcmPush({ registration, match, env }) {
  if (!env.FCM_SERVICE_ACCOUNT) {
    throw new Error("FCM_SERVICE_ACCOUNT secret is not set in Worker");
  }

  const serviceAccount = JSON.parse(env.FCM_SERVICE_ACCOUNT);
  const accessToken = await getFcmAccessToken(serviceAccount);

  const role = registration.is_goalkeeper ? "🥅 Arquero" : "⚽ Jugador de campo";
  const title = `Nuevo jugador en ${match.title || match.location}`;
  const body = `${registration.name} · ${role}`;

  // Topic: one topic per match so only interested parties receive it.
  // Clients must subscribe to "match-<match_id>" to receive these.
  const topic = `match-${match.id}`;

  const message = {
    message: {
      topic,
      notification: { title, body },
      data: {
        match_id:        match.id,
        registration_id: registration.id,
        player_name:     registration.name,
        is_goalkeeper:   String(registration.is_goalkeeper),
      },
      android: { priority: "high" },
      apns: {
        headers: { "apns-priority": "10" },
        payload: { aps: { sound: "default" } },
      },
      webpush: {
        headers: { Urgency: "high" },
        notification: { title, body, icon: "/icon-192.png" },
      },
    },
  };

  console.log(`[push] sending FCM to topic "${topic}"`);

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
  console.log(`[push] FCM status: ${res.status} — body: ${responseText}`);

  if (!res.ok) {
    throw new Error(`FCM error ${res.status}: ${responseText}`);
  }

  return JSON.parse(responseText);
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

  // Import the RSA private key
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

  // Exchange JWT for access token
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
