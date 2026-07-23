import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface NotificationQueueItem {
  id: string;
  user_id: string;
  email: string;
  notification_type: string;
  payload: Record<string, unknown>;
  idempotency_key: string;
  attempts: number;
  max_attempts: number;
  send_at: string;
  sent_at: string | null;
  failed_at: string | null;
  error_message: string | null;
}

interface LastChancePool {
  pool_id: string;
  pool_name: string;
  pending_count: number;
  predict_url: string;
  matches: Array<{
    match_id: string;
    home_team: string;
    away_team: string;
    home_flag_url: string;
    away_flag_url: string;
    kickoff_at: string;
  }>;
}

interface LastChancePayload {
  pools: LastChancePool[];
  total_pending: number;
}

interface DailyDigestPool {
  pool_id: string;
  pool_name: string;
  pool_url: string;
  points: number;
  rank: number;
  total_members: number;
  tier: "top3" | "mid" | "bottom2";
  leaderboard: Array<{
    rank: number;
    user_email: string;
    display_name?: string;
    user_id?: string;
    points: number;
  }>;
}

interface DailyDigestPayload {
  pools: DailyDigestPool[];
  user_email: string;
}

function flagUrl(url: string): string {
  return url.replace("/w320/", "/w640/");
}

const EMAIL_STYLES = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>parti2</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
table{border-collapse:collapse!important}
body{height:100%!important;margin:0!important;padding:0!important;width:100%!important;font-family:'Inter',Arial,Helvetica,sans-serif;background-color:#0F172A!important}
.bg-dark{background-color:#0F172A!important}
.bg-card{background-color:#1E293B!important}
.bg-green{background-color:#22C55E!important}
.bg-divider{background-color:#334155!important}
.text-white{color:#F8FAFC!important}
.text-muted{color:#94A3B8!important}
.text-green{color:#22C55E!important}
.text-dark{color:#0F172A!important}
@media only screen and (max-width:480px){
  .container{width:100%!important;max-width:100%!important}
  .mobile-pad{padding:24px 16px!important}
  .mobile-hide{display:none!important}
  .stats-value{font-size:26px!important;line-height:1.2!important}
  .flag-img{width:36px!important;height:36px!important}
  .team-name{font-size:16px!important}
  .cta-wrap{width:100%!important}
  .cta-btn{display:block!important;width:auto!important;padding:14px 24px!important;font-size:14px!important;text-align:center!important}
}
/* Gmail dark mode — forces our dark bg back when Gmail auto-inverts */
html[data-ogsc] body,
html[data-ogsc] table,
html[data-ogsc] td,
html[data-ogsc] tbody,
html[data-ogsc] tr,
html[data-ogsc] div,
html[data-ogsc] p,
html[data-ogsc] h1,
html[data-ogsc] h2,
html[data-ogsc] .email-wrapper { background-color:#0F172A!important }
html[data-ogsb] body,
html[data-ogsb] table,
html[data-ogsb] td,
html[data-ogsb] tbody,
html[data-ogsb] tr,
html[data-ogsb] div,
html[data-ogsb] p,
html[data-ogsb] h1,
html[data-ogsb] h2,
html[data-ogsb] .email-wrapper { background-color:#0F172A!important }
html[data-ogsc] .email-card-bg { background-color:#1E293B!important }
html[data-ogsb] .email-card-bg { background-color:#1E293B!important }
html[data-ogsc] .email-light-text,
html[data-ogsc] .stats-value,
html[data-ogsc] h1,
html[data-ogsc] h2 { color:#F8FAFC!important }
html[data-ogsb] .email-light-text,
html[data-ogsb] .stats-value,
html[data-ogsb] h1,
html[data-ogsb] h2 { color:#F8FAFC!important }
/* Newer Gmail — no html prefix */
[data-ogsc] body,
[data-ogsc] table,
[data-ogsc] td,
[data-ogsc] tbody,
[data-ogsc] tr,
[data-ogsc] div,
[data-ogsc] p,
[data-ogsc] h1,
[data-ogsc] h2,
[data-ogsc] .email-wrapper { background-color:#0F172A!important }
[data-ogsb] body,
[data-ogsb] table,
[data-ogsb] td,
[data-ogsb] tbody,
[data-ogsb] tr,
[data-ogsb] div,
[data-ogsb] p,
[data-ogsb] h1,
[data-ogsb] h2,
[data-ogsb] .email-wrapper { background-color:#0F172A!important }
[data-ogsc] .email-card-bg { background-color:#1E293B!important }
[data-ogsb] .email-card-bg { background-color:#1E293B!important }
[data-ogsc] .email-light-text,
[data-ogsc] .stats-value { color:#F8FAFC!important }
[data-ogsb] .email-light-text,
[data-ogsb] .stats-value { color:#F8FAFC!important }
/* Fallback for older Gmail versions */
u + .body .email-wrapper{background-color:#0F172A!important}
u + .body .email-card-bg{background-color:#1E293B!important}
u + .body .email-light-text{color:#F8FAFC!important}
</style>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->`;

const PREHEADER = (total: number) =>
  `Tenés ${total} partidos sin predecir — entrá y dejá tus pronósticos`;

function renderLastChanceEmail(p: LastChancePayload): string {
  const lcFlag = (url: string) => flagUrl(url);

  const poolsHtml = p.pools.map((pool) => `
<tr><td align="center" style="padding-bottom:24px" bgcolor="#0F172A">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1E293B;padding:24px;border-radius:24px" bgcolor="#1E293B" class="email-card-bg">
<tr><td bgcolor="#1E293B">
<p style="color:#22C55E;font-family:'Inter',Arial,sans-serif;font-size:16px;font-weight:700;margin:0 0 4px 0" class="text-green">🏆 ${pool.pool_name}</p>
<p style="color:#94A3B8;font-family:'Inter',Arial,sans-serif;font-size:13px;margin:0 0 16px 0" class="text-muted">${pool.pending_count} partido${pool.pending_count !== 1 ? "s" : ""} sin predecir</p>
${pool.matches.map((m) => `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px">
<tr>
<td style="width:40px;padding:6px 0;vertical-align:middle" bgcolor="#1E293B"><img src="${lcFlag(m.home_flag_url)}" alt="${m.home_team}" width="32" height="32" style="width:32px;height:32px;border-radius:6px;display:block"></td>
<td style="padding:6px 8px;vertical-align:middle" bgcolor="#1E293B"><span style="color:#F8FAFC;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:600" class="email-light-text">${m.home_team}</span></td>
<td style="padding:6px 4px;vertical-align:middle;text-align:center" bgcolor="#1E293B"><span style="color:#64748B;font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:600">VS</span></td>
<td style="padding:6px 8px;vertical-align:middle" bgcolor="#1E293B"><span style="color:#F8FAFC;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:600" class="email-light-text">${m.away_team}</span></td>
<td style="width:40px;padding:6px 0;vertical-align:middle" bgcolor="#1E293B"><img src="${lcFlag(m.away_flag_url)}" alt="${m.away_team}" width="32" height="32" style="width:32px;height:32px;border-radius:6px;display:block"></td>
</tr>
</table>`).join("")}
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px"><tr><td align="center" bgcolor="#1E293B">
<table cellpadding="0" cellspacing="0" border="0" class="cta-wrap"><tr><td align="center" style="background-color:#22C55E;padding:12px 24px;border-radius:10px" bgcolor="#22C55E"><a href="${pool.predict_url}" style="color:#0F172A;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:700;text-decoration:none;display:inline-block;white-space:nowrap" class="cta-btn text-dark">🔮 Predecir ${pool.pool_name}</a></td></tr></table>
</td></tr></table>
</td></tr></table>
</td></tr>`).join("");

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>${EMAIL_STYLES}
</head>
<body style="margin:0;padding:0;-webkit-font-smoothing:antialiased;font-family:'Inter',Arial,Helvetica,sans-serif" class="bg-dark">
<div style="display:none;font-size:0;color:#0F172A;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden">${PREHEADER(p.total_pending)}</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0F172A">
<tr><td align="center" style="padding:40px 20px" bgcolor="#0F172A" class="mobile-pad email-wrapper">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%" class="container" bgcolor="#0F172A">
<tr><td align="center" style="padding-bottom:32px" bgcolor="#0F172A">
<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr>
<td style="padding-right:12px;vertical-align:middle" bgcolor="#0F172A"><img src="https://parti2.app/p2-logo.png" alt="parti2" width="140" style="width:140px;max-width:140px;height:auto;display:block;border:0"></td>
<td style="padding-left:12px;vertical-align:middle" bgcolor="#0F172A"><img src="https://cdn.prod.website-files.com/68f550992570ca0322737dc2/69f4a82e3685731a3ab5086e_fifa-world-cup-2026-official-logo-footylogos-white.png" alt="FIFA World Cup 2026" width="80" style="width:80px;max-width:80px;height:auto;display:block;border:0"></td>
</tr></table>
</td></tr>
<tr><td align="center" style="padding-bottom:24px" bgcolor="#0F172A">
<!--[if mso]><table cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:#1E293B;border-radius:100px;padding:12px 24px" bgcolor="#1E293B"><![endif]-->
<div style="display:inline-block;background-color:#1E293B;padding:12px 24px;border-radius:100px"><span style="color:#22C55E;font-family:'Inter',Arial,sans-serif;font-size:14px;font-weight:700;letter-spacing:1px">⏰ ARRANCA EN 1 HORA</span></div>
<!--[if mso]></td></tr></table><![endif]-->
</td></tr>
<tr><td align="center" style="padding-bottom:4px" bgcolor="#0F172A"><p style="color:#94A3B8;font-family:'Inter',Arial,sans-serif;font-size:14px;margin:0;line-height:1.5" class="text-muted">Tenés <strong style="color:#F8FAFC" class="email-light-text">${p.total_pending} partidos</strong> sin predecir en</p></td></tr>
<tr><td align="center" style="padding-bottom:24px" bgcolor="#0F172A"><span style="color:#64748B;font-family:'Inter',Arial,sans-serif;font-size:14px" class="text-muted">${p.pools.length} polla${p.pools.length !== 1 ? "s" : ""} — metele que arranca</span></td></tr>
${poolsHtml}
<tr><td align="center" style="padding-top:32px" bgcolor="#0F172A"><p style="color:#F8FAFC;font-family:'Inter',Arial,sans-serif;font-size:16px;font-weight:700;margin:0 0 12px 0;font-style:italic" class="email-light-text">"Menos chat, más juego."</p><p style="color:#94A3B8;font-family:'Inter',Arial,sans-serif;font-size:13px;line-height:1.5;margin:0" class="text-muted">Si ya prediciste, ignorá este mensaje y segui tranqui.<br>&copy; 2026 parti2.app</p></td></tr>
</table>
</td></tr></table>
</body></html>`;
}

function renderDailyDigestEmail(p: DailyDigestPayload): string {
  const tiers: Record<string, { pill: string; title: string; cta: string }> = {
    top3: {
      pill: '<span style="display:inline-block;background-color:#22C55E;color:#0F172A;padding:4px 14px;border-radius:100px;font-size:13px;font-weight:700">🏆 Top 3</span>',
      title: "¡Vas a Fuego! 🔥",
      cta: "Seguí así",
    },
    mid: {
      pill: '<span style="display:inline-block;background-color:#334155;color:#F8FAFC;padding:4px 14px;border-radius:100px;font-size:13px;font-weight:700">📊 Zona media</span>',
      title: "La lucha sigue",
      cta: "Metele que se puede",
    },
    bottom2: {
      pill: '<span style="display:inline-block;background-color:#7F1D1D;color:#FCA5A5;padding:4px 14px;border-radius:100px;font-size:13px;font-weight:700">💪 Fondo de tabla</span>',
      title: "Hay que remar",
      cta: "Vamos a remar",
    },
  };

  function bodyText(pool: DailyDigestPool): string {
    const t = tiers[pool.tier] ?? tiers.mid;
    if (pool.tier === "top3") {
      return `Vas ${pool.rank}° en ${pool.pool_name} con ${pool.points} pts. Mantené el ritmo que la Copa no perdona.`;
    }
    if (pool.tier === "bottom2") {
      return `Vas ${pool.rank}° en ${pool.pool_name} con ${pool.points} pts. La buena: queda mucha tela para cortar.`;
    }
    return `Vas ${pool.rank}° de ${pool.total_members} en ${pool.pool_name} con ${pool.points} pts. Quedan partidos y todo puede pasar.`;
  }

  const poolsHtml = p.pools.map((pool) => {
    const tc = tiers[pool.tier] ?? tiers.mid;
    const staticUserEmail = p.user_email ?? "";
    const leaderboardHtml = pool.leaderboard.length > 0
      ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:12px;margin-bottom:24px" bgcolor="#0F172A">${
          pool.leaderboard.map((e) => {
            const isCurrent = e.user_email === staticUserEmail;
            const medal = e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : "";
            const rd = medal || `${e.rank}°`;
            const bg = isCurrent ? 'style="background-color:#22C55E20"' : "";
            const nc = isCurrent ? "#22C55E" : "#F8FAFC";
            const fw = isCurrent ? "700" : "400";
            return `<tr ${bg}><td style="padding:8px 12px;color:#94A3B8;font-size:14px;font-weight:600;width:40px" bgcolor="#0F172A">${rd}</td><td style="padding:8px 12px;color:${nc};font-size:14px;font-weight:${fw}" bgcolor="#0F172A">${e.display_name ?? e.user_email.split("@")[0]}</td><td style="padding:8px 12px;color:#22C55E;font-size:14px;font-weight:700;text-align:right" bgcolor="#0F172A">${e.points}p</td></tr>`;
          }).join("")
        }</table>`
      : "";
    return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#1E293B;padding:32px;border-radius:24px;margin-bottom:24px" bgcolor="#1E293B" class="email-card-bg">
<tr><td bgcolor="#1E293B">
<div style="margin-bottom:20px">${tc.pill}</div>
<h2 style="color:#F8FAFC;font-family:'Inter',Arial,sans-serif;font-size:22px;font-weight:700;margin:0 0 4px 0" class="email-light-text">${tc.title}</h2>
<p style="color:#94A3B8;font-family:'Inter',Arial,sans-serif;font-size:13px;margin:0 0 16px 0" class="text-muted">🏆 ${pool.pool_name}</p>
<p style="color:#94A3B8;font-family:'Inter',Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 24px 0" class="text-muted">${bodyText(pool)}</p>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0F172A;border-radius:16px;margin-bottom:24px" bgcolor="#0F172A" class="email-stats-bg">
<tr><td style="padding:20px 16px" bgcolor="#0F172A" class="email-stats-cell">
<table width="100%" cellpadding="0" cellspacing="0" border="0" class="email-stat-row"><tr><td align="center" style="padding:4px 0" bgcolor="#0F172A">
<span style="color:#64748B;font-family:'Inter',Arial,sans-serif;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Posición</span>
<p style="color:#F8FAFC;font-family:'Inter',Arial,sans-serif;font-size:32px;font-weight:800;margin:2px 0 0 0" class="email-light-text stats-value">${pool.rank}<span style="color:#64748B;font-size:18px;font-weight:600">°</span></p>
</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #334155"><tr><td align="center" style="padding:12px 0" bgcolor="#0F172A">
<span style="color:#64748B;font-family:'Inter',Arial,sans-serif;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Puntos</span>
<p style="color:#22C55E;font-family:'Inter',Arial,sans-serif;font-size:32px;font-weight:800;margin:2px 0 0 0" class="stats-value">${pool.points}</p>
</td></tr></table>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #334155"><tr><td align="center" style="padding:12px 0" bgcolor="#0F172A">
<span style="color:#64748B;font-family:'Inter',Arial,sans-serif;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Participantes</span>
<p style="color:#F8FAFC;font-family:'Inter',Arial,sans-serif;font-size:32px;font-weight:800;margin:2px 0 0 0" class="email-light-text stats-value">${pool.total_members}</p>
</td></tr></table>
</td></tr></table>
${leaderboardHtml}
<table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" bgcolor="#1E293B">
<!--[if mso]>
<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${pool.pool_url}" style="height:52px;v-text-anchor:middle;width:220px" arcsize="24%" strokecolor="#22C55E" fillcolor="#22C55E">
<w:anchorlock/>
<center style="color:#0F172A;font-family:'Inter',Arial,sans-serif;font-size:16px;font-weight:700">${tc.cta}</center>
</v:roundrect>
<![endif]-->
<!--[if !mso]><!-->
<a href="${pool.pool_url}" style="background-color:#22C55E;color:#0F172A;font-family:'Inter',Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:16px 32px;border-radius:12px;display:inline-block" class="cta-btn text-dark">${tc.cta}</a>
<!--<![endif]-->
</td></tr></table>
</td></tr></table>`;
  }).join("");

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>${EMAIL_STYLES}
</head>
<body style="margin:0;padding:0;-webkit-font-smoothing:antialiased;font-family:'Inter',Arial,Helvetica,sans-serif" class="bg-dark">
<div style="display:none;font-size:0;color:#0F172A;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden">Resumen diario de tus pollas en parti2.app</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0F172A">
<tr><td align="center" style="padding:40px 20px" bgcolor="#0F172A" class="mobile-pad email-wrapper">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%" class="container" bgcolor="#0F172A">
<tr><td align="center" style="padding-bottom:32px" bgcolor="#0F172A">
<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto"><tr>
<td style="padding-right:12px;vertical-align:middle" bgcolor="#0F172A"><img src="https://parti2.app/p2-logo.png" alt="parti2" width="140" style="width:140px;max-width:140px;height:auto;display:block;border:0"></td>
<td style="padding-left:12px;vertical-align:middle" bgcolor="#0F172A"><img src="https://cdn.prod.website-files.com/68f550992570ca0322737dc2/69f4a82e3685731a3ab5086e_fifa-world-cup-2026-official-logo-footylogos-white.png" alt="FIFA World Cup 2026" width="80" style="width:80px;max-width:80px;height:auto;display:block;border:0"></td>
</tr></table>
</td></tr>
<tr><td align="center" style="padding-bottom:24px" bgcolor="#0F172A"><h1 style="color:#F8FAFC;font-family:'Inter',Arial,sans-serif;font-size:24px;font-weight:800;margin:0" class="email-light-text">📊 Tu resumen diario</h1></td></tr>
<tr><td align="center" style="padding-bottom:32px" bgcolor="#0F172A"><p style="color:#94A3B8;font-family:'Inter',Arial,sans-serif;font-size:14px;margin:0;line-height:1.5" class="text-muted">así van tus pronósticos para este mundial</p></td></tr>
<tr><td bgcolor="#0F172A">${poolsHtml}</td></tr>
<tr><td align="center" style="padding-top:16px" bgcolor="#0F172A"><p style="color:#F8FAFC;font-family:'Inter',Arial,sans-serif;font-size:16px;font-weight:700;margin:0 0 12px 0;font-style:italic" class="email-light-text">"Menos chat, más juego."</p><p style="color:#94A3B8;font-family:'Inter',Arial,sans-serif;font-size:13px;line-height:1.5;margin:0" class="text-muted">Resumen diario de tus pollas en parti2.app<br>&copy; 2026 parti2.app</p></td></tr>
</table>
</td></tr></table>
</body></html>`;
}

async function resendSend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
      "X-Idempotency-Key": params.idempotencyKey,
    },
    body: JSON.stringify({
      from: params.from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      headers: {
        "X-Mailer": "Parti2",
        "X-Entity-Ref-ID": params.idempotencyKey,
        "List-Unsubscribe": "<https://parti2.app/settings/notifications>",
      },
    }),
  });

  if (!response.ok) {
    const body: Record<string, unknown> = await response.json().catch(() => ({}));
    const errPayload = body?.error as Record<string, unknown> | undefined;
    const errMsg = errPayload?.message as string | undefined;
    throw new Error(`Resend error ${response.status}: ${errMsg ?? response.statusText}`);
  }
}

serve(async (req) => {
  const startedAt = Date.now();

  try {
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const resendFrom = Deno.env.get("RESEND_FROM_EMAIL") ?? "Parti2 <noreply@parti2.co>";
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";

    if (!serviceRoleKey || !supabaseUrl || !resendApiKey) {
      return new Response(
        JSON.stringify({
          status: "error",
          message: `Missing required env vars (serviceRoleKey=${!!serviceRoleKey}, supabaseUrl=${!!supabaseUrl}, resendApiKey=${!!resendApiKey})`,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

    if (bearerToken !== cronSecret && bearerToken !== serviceRoleKey) {
      return new Response(
        JSON.stringify({ status: "error", message: "Unauthorized" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: pending, error: fetchError } = await supabase
      .from("bet_notification_queue")
      .select("*")
      .is("sent_at", null)
      .is("failed_at", null)
      .lte("send_at", new Date().toISOString())
      .lt("attempts", 5)
      .order("send_at", { ascending: true })
      .limit(50);

    if (fetchError) {
      throw new Error(`Failed to fetch pending notifications: ${fetchError.message}`);
    }

    const items = (pending ?? []) as NotificationQueueItem[];

    if (items.length === 0) {
      return new Response(
        JSON.stringify({
          status: "skipped",
          message: "No pending notifications",
          processed: 0,
          failed: 0,
          elapsed_ms: Date.now() - startedAt,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const item of items) {
      try {
        let subject: string;
        let html: string;

        if (item.notification_type === "last_chance") {
          const payload = item.payload as unknown as LastChancePayload;
          subject = `⏰ Queda poco tiempo — tenés ${payload.total_pending} partidos sin predecir`;
          html = renderLastChanceEmail(payload);
        } else if (item.notification_type === "daily_digest") {
          const payload = item.payload as unknown as DailyDigestPayload;
          const poolCount = payload.pools.length;
          subject = `📊 Tu resumen diario — ${poolCount} polla${poolCount !== 1 ? "s" : ""} activa${poolCount !== 1 ? "s" : ""}`;
          html = renderDailyDigestEmail(payload);
        } else if (item.notification_type === "tournament_results") {
          const payload = item.payload as unknown as { subject: string; html: string };
          subject = payload.subject;
          html = payload.html;
        } else {
          await supabase
            .from("bet_notification_queue")
            .update({
              failed_at: new Date().toISOString(),
              error_message: `Unknown notification_type: ${item.notification_type}`,
            })
            .eq("id", item.id);
          failed++;
          continue;
        }

        const { error: attemptError } = await supabase
          .from("bet_notification_queue")
          .update({
            attempts: item.attempts + 1,
          })
          .eq("id", item.id);

        if (attemptError) {
          errors.push(`Attempt tracking failed for ${item.id}: ${attemptError.message}`);
          failed++;
          continue;
        }

        await resendSend({
          apiKey: resendApiKey,
          from: resendFrom,
          to: item.email,
          subject,
          html,
          idempotencyKey: item.idempotency_key,
        });

        const { error: sentError } = await supabase
          .from("bet_notification_queue")
          .update({
            sent_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        if (sentError) {
          errors.push(`Sent but failed to update queue for ${item.id}: ${sentError.message}`);
        }
        sent++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Unknown error";

        const maxAttempts = item.max_attempts;
        const nextAttempt = item.attempts + 1;

        if (nextAttempt >= maxAttempts) {
          await supabase
            .from("bet_notification_queue")
            .update({
              failed_at: new Date().toISOString(),
              error_message: errMsg,
            })
            .eq("id", item.id);
        } else {
          const backoffMinutes = Math.pow(2, nextAttempt);
          const retryAt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString();
          await supabase
            .from("bet_notification_queue")
            .update({
              send_at: retryAt,
              error_message: errMsg,
            })
            .eq("id", item.id);
        }

        errors.push(`${item.idempotency_key}: ${errMsg}`);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({
        status: "success",
        processed: items.length,
        sent,
        failed,
        errors: errors.length > 0 ? errors.slice(0, 10) : [],
        elapsed_ms: Date.now() - startedAt,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ status: "error", message, elapsed_ms: Date.now() - startedAt }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
