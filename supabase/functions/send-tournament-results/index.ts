import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const EMAIL_STYLES = `<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
body,table,td,a{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
table{border-collapse:collapse!important}
body{height:100%!important;margin:0!important;padding:0!important;width:100%!important;font-family:'Inter',Arial,Helvetica,sans-serif}
.bg-dark{background-color:#0F172A!important}
.bg-card{background-color:#1E293B!important}
.text-white{color:#F8FAFC!important}
.text-muted{color:#94A3B8!important}
.text-green{color:#22C55E!important}
.text-dark{color:#0F172A!important}
@media only screen and (max-width:480px){
  .container{width:100%!important;max-width:100%!important}
  .mobile-pad{padding:24px 16px!important}
  .mobile-stack{display:block!important;width:100%!important;text-align:center!important;padding:8px 0!important}
  .stats-cell{padding:8px 12px!important}
  .stats-value{font-size:28px!important;line-height:1.2!important}
  .cta-btn{display:block!important;width:auto!important;padding:14px 24px!important;font-size:14px!important;text-align:center!important}
}
html[data-ogsc] .email-wrapper{background-color:#0F172A!important}
html[data-ogsb] .email-wrapper{background-color:#0F172A!important}
html[data-ogsc] .email-card-bg{background-color:#1E293B!important}
html[data-ogsb] .email-card-bg{background-color:#1E293B!important}
html[data-ogsc] .email-light-text{color:#F8FAFC!important}
html[data-ogsb] .email-light-text{color:#F8FAFC!important}
u + .body .email-wrapper{background-color:#0F172A!important}
</style>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->`;

const TIER_CONFIG: Record<string, { pill: string; title: string; body: string }> = {
  winner: {
    pill: '<span style="display:inline-block;background-color:#22C55E;color:#0F172A;padding:4px 14px;border-radius:100px;font-size:13px;font-weight:700">\uD83D\uDC51 CAMPE\u00D3N</span>',
    title: '\u00A1FELICIDADES, CAMPE\u00D3N(A)! \uD83D\uDC51\uD83C\uDFC6',
    body: '\u00A1Lo lograste! Con una estrategia impecable y los mejores pron\u00F3sticos, te has coronado como el gran ganador(a) de esta edici\u00F3n de la polla. Tu nombre queda grabado en la cima de la tabla. \u00A1Disfruta este triunfo y prep\u00E1rate para presumir tu corona!',
  },
  top3: {
    pill: '<span style="display:inline-block;background-color:#334155;color:#F8FAFC;padding:4px 14px;border-radius:100px;font-size:13px;font-weight:700">\uD83E\uDD47\uD83E\uDD48\uD83E\uDD49 PODIO</span>',
    title: '\u00A1EXCELENTE TRABAJO! EST\u00C1S EN EL PODIO \uD83E\uDD47\uD83E\uDD48',
    body: '\u00A1Felicitaciones! Has demostrado estar entre los mejores pronosticadores del torneo asegurando tu lugar en el Top 3 de la polla. Estuviste muy cerca de la gloria absoluta; gracias por la competencia tan re\u00F1ida y emocionante hasta el \u00FAltimo minuto.',
  },
  rest: {
    pill: '<span style="display:inline-block;background-color:#1E293B;color:#94A3B8;padding:4px 14px;border-radius:100px;font-size:13px;font-weight:700">\uD83C\uDFC5 PARTICIPANTE</span>',
    title: 'Gracias por competir',
    body: 'Gracias por competir y mantener la emoci\u00F3n viva hasta el final. Aunque esta vez el podio estuvo re\u00F1ido, cada acierto cont\u00F3 y la experiencia se disfrut\u00F3 de principio a fin. \u00A1Habr\u00E1 revancha en el pr\u00F3ximo torneo!',
  },
};

const FOOTER = `<tr>
  <td align="center" style="padding-top:32px" bgcolor="transparent">
    <p style="color:#F8FAFC;font-family:'Inter',Arial,sans-serif;font-size:16px;font-weight:700;margin:0 0 12px 0;font-style:italic" class="email-light-text">"Menos chat, m\u00E1s juego."</p>
    <p style="color:#94A3B8;font-family:'Inter',Arial,sans-serif;font-size:13px;line-height:1.5;margin:0" class="text-muted">Resultados finales de tu polla en parti2.app<br>&copy; 2026 parti2.app</p>
  </td>
</tr>`;

function renderTournamentResultsEmail(data: {
  user_name: string;
  pool_name: string;
  pool_url: string;
  rank: number;
  total_members: number;
  total_points: number;
  tournament_points: number;
  tier: string;
}): string {
  const tierConfig = TIER_CONFIG[data.tier] ?? TIER_CONFIG.rest;
  const greeting = data.user_name ? `Hola, ${data.user_name}` : 'Hola';

  const statsCard = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0F172A;border-radius:16px;margin-bottom:24px" bgcolor="#0F172A">
    <tr>
      <td align="center" style="padding:24px 16px" class="stats-cell" bgcolor="transparent">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="text-align:center;padding:0 12px" class="mobile-stack" bgcolor="transparent">
              <span style="color:#64748B;font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Posici\u00F3n</span>
              <p style="color:#F8FAFC;font-family:'Inter',Arial,sans-serif;font-size:36px;font-weight:800;margin:4px 0 0 0" class="stats-value email-light-text">${data.rank}<span style="color:#64748B;font-size:20px;font-weight:600">\u00B0</span><span style="color:#64748B;font-size:16px;font-weight:400"> / ${data.total_members}</span></p>
            </td>
            <td style="width:1px;background-color:#334155;padding:0;height:60px" bgcolor="#334155"></td>
            <td style="text-align:center;padding:0 12px" class="mobile-stack" bgcolor="transparent">
              <span style="color:#64748B;font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Puntaje Total</span>
              <p style="color:#22C55E;font-family:'Inter',Arial,sans-serif;font-size:36px;font-weight:800;margin:4px 0 0 0" class="stats-value text-green">${data.total_points}</p>
            </td>
            <td style="width:1px;background-color:#334155;padding:0;height:60px" bgcolor="#334155"></td>
            <td style="text-align:center;padding:0 12px" class="mobile-stack" bgcolor="transparent">
              <span style="color:#64748B;font-family:'Inter',Arial,sans-serif;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:1px">Campe\u00F3n/Podio</span>
              <p style="color:#F8FAFC;font-family:'Inter',Arial,sans-serif;font-size:36px;font-weight:800;margin:4px 0 0 0" class="stats-value email-light-text">${data.tournament_points}<span style="color:#64748B;font-size:16px;font-weight:400"> pts</span></p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>${EMAIL_STYLES}</head>
<body style="background-color:#0F172A;margin:0;padding:0;-webkit-font-smoothing:antialiased;font-family:'Inter',Arial,Helvetica,sans-serif" class="bg-dark">
<div style="display:none;font-size:0;color:#0F172A;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden">\u00A1Resultados finales de la polla! Descubr\u00ED c\u00F3mo te fue y qui\u00E9n se llev\u00F3 la corona \uD83C\uDFC6</div>
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#0F172A" bgcolor="#0F172A">
  <tr>
    <td align="center" style="background-color:#0F172A;padding:40px 20px" bgcolor="#0F172A" class="mobile-pad force-dark-bg">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%" class="container">
        <tr>
          <td align="center" style="padding-bottom:32px" bgcolor="transparent">
            <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto">
              <tr>
                <td style="padding-right:12px;vertical-align:middle" bgcolor="transparent"><img src="https://parti2.app/p2-logo.png" alt="parti2" width="140" style="width:140px;max-width:140px;height:auto;display:block;border:0"></td>
                <td style="padding-left:12px;vertical-align:middle" bgcolor="transparent"><img src="https://cdn.prod.website-files.com/68f550992570ca0322737dc2/69f4a82e3685731a3ab5086e_fifa-world-cup-2026-official-logo-footylogos-white.png" alt="FIFA World Cup 2026" width="80" style="width:80px;max-width:80px;height:auto;display:block;border:0"></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="left" style="background-color:#1E293B;padding:32px;border-radius:24px" bgcolor="#1E293B" class="mobile-pad force-card-bg">
            <div style="margin-bottom:20px">${tierConfig.pill}</div>
            <h1 style="color:#F8FAFC;font-family:'Inter',Arial,sans-serif;font-size:24px;font-weight:700;margin:0 0 8px 0" class="email-light-text">${tierConfig.title}</h1>
            <p style="color:#94A3B8;font-family:'Inter',Arial,sans-serif;font-size:15px;line-height:1.5;margin:0 0 8px 0" class="text-muted">${greeting}:</p>
            <p style="color:#94A3B8;font-family:'Inter',Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 20px 0" class="text-muted">\u00A1El torneo ha llegado a su fin y la emoci\u00F3n de la polla de Parti2 tambi\u00E9n! Queremos agradecerte por ser parte de esta gran experiencia, hacer tus pron\u00F3sticos fecha a fecha y vivir la pasi\u00F3n del f\u00FAtbol con nosotros.</p>
            <p style="color:#94A3B8;font-family:'Inter',Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 24px 0" class="text-muted">Te informamos que todos los puntos ya han sido calculados oficialmente, incluyendo los aciertos de los partidos de la fase final y las predicciones especiales de campe\u00F3n, subcampe\u00F3n y tercer puesto. El marcador total ha sido actualizado.</p>
            <p style="color:#F8FAFC;font-family:'Inter',Arial,sans-serif;font-size:16px;line-height:1.6;margin:0 0 24px 0" class="email-light-text">${tierConfig.body}</p>
            <p style="color:#64748B;font-family:'Inter',Arial,sans-serif;font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px 0">\uD83D\uDCCA Tu Resumen Final en la Polla</p>
            ${statsCard}
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${data.pool_url}" style="height:52px;v-text-anchor:middle;width:220px" arcsize="24%" strokecolor="#22C55E" fillcolor="#22C55E">
            <w:anchorlock/>
            <center style="color:#0F172A;font-family:'Inter',Arial,sans-serif;font-size:16px;font-weight:700">Ver tabla de posiciones</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <table width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td align="center" bgcolor="transparent">
                  <a href="${data.pool_url}" style="background-color:#22C55E;color:#0F172A;font-family:'Inter',Arial,sans-serif;font-size:16px;font-weight:700;text-decoration:none;padding:16px 32px;border-radius:12px;display:inline-block" class="cta-btn text-dark">\uD83D\uDE80 Ver tabla de posiciones completa</a>
                </td>
              </tr>
            </table>
            <!--<![endif]-->
          </td>
        </tr>
        ${FOOTER}
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
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
        JSON.stringify({ status: "error", message: "Missing env vars" }),
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

    const body = await req.json().catch(() => ({}));
    const tournamentId = body.tournament_id as string | undefined;
    const poolId = body.pool_id as string | undefined;

    if (!tournamentId && !poolId) {
      return new Response(
        JSON.stringify({ status: "error", message: "tournament_id or pool_id required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let poolIds: string[] = [];

    if (poolId) {
      poolIds = [poolId];
    } else {
      const { data: pools } = await supabase
        .from("bet_pools")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("competition_type", "pool");

      poolIds = (pools ?? []).map((p: { id: string }) => p.id);
    }

    if (poolIds.length === 0) {
      return new Response(
        JSON.stringify({ status: "error", message: "No pools found" }),
        { status: 404, headers: { "Content-Type": "application/json" } },
      );
    }

    let totalSent = 0;
    let totalFailed = 0;
    const results: Array<{ pool_id: string; pool_name: string; sent: number; failed: number; errors: string[] }> = [];

    for (const pid of poolIds) {
      const { data: pool } = await supabase
        .from("bet_pools")
        .select("id, name, tournament_id")
        .eq("id", pid)
        .single();

      if (!pool) continue;

      const { data: memberRows } = await supabase
        .from("bet_pool_members")
        .select("user_id")
        .eq("pool_id", pid);

      if (!memberRows || memberRows.length === 0) continue;

      const allUserIds = memberRows.map((r: { user_id: string }) => r.user_id);

      const { data: scores } = await supabase
        .from("bet_scores_aggregate")
        .select("user_id, points_total")
        .eq("pool_id", pid)
        .eq("mode", "pool");

      const scoreMap = new Map<string, number>();
      if (scores) {
        for (const s of scores) {
          scoreMap.set(s.user_id, s.points_total);
        }
      }

      const { data: tournamentScores } = await supabase
        .from("bet_scores_details")
        .select("user_id, points")
        .eq("pool_id", pid)
        .eq("mode", "pool")
        .eq("source_type", "tournament");

      const tournamentPointsMap = new Map<string, number>();
      if (tournamentScores) {
        for (const ts of tournamentScores) {
          tournamentPointsMap.set(ts.user_id, (tournamentPointsMap.get(ts.user_id) ?? 0) + ts.points);
        }
      }

      const sortedUsers = allUserIds
        .map((uid) => ({ uid, points: scoreMap.get(uid) ?? 0 }))
        .sort((a, b) => {
          const ptsDiff = b.points - a.points;
          if (ptsDiff !== 0) return ptsDiff;
          return a.uid.localeCompare(b.uid);
        });

      const totalMembers = sortedUsers.length;

      const userMetaMap = new Map<string, { email: string; fullName: string | null }>();
      for (const { uid } of sortedUsers) {
        const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(uid);
        if (userErr || !userData?.user) continue;
        const meta = userData.user.user_metadata as Record<string, unknown> | undefined;
        const fullName = (typeof meta?.full_name === "string" && (meta.full_name as string).trim())
          ? (meta.full_name as string).trim()
          : null;
        userMetaMap.set(userData.user.id, {
          email: userData.user.email ?? "",
          fullName,
        });
      }

      const poolUrl = `https://parti2.app/bet/pool/${pid}`;
      let poolSent = 0;
      let poolFailed = 0;
      const poolErrors: string[] = [];

      for (let i = 0; i < sortedUsers.length; i++) {
        const { uid, points } = sortedUsers[i];
        const rank = i + 1;
        const meta = userMetaMap.get(uid);
        if (!meta?.email) continue;

        let tier = "rest";
        if (rank === 1) tier = "winner";
        else if (rank <= 3) tier = "top3";

        const userName = meta.fullName
          ?? (meta.email.includes("@")
            ? meta.email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
            : "Jugador");

        const html = renderTournamentResultsEmail({
          user_name: userName,
          pool_name: pool.name,
          pool_url: poolUrl,
          rank,
          total_members: totalMembers,
          total_points: points,
          tournament_points: tournamentPointsMap.get(uid) ?? 0,
          tier,
        });

        const subject = "\u00A1Resultados finales de la polla! Descubr\u00ED c\u00F3mo te fue y qui\u00E9n se llev\u00F3 la corona \uD83C\uDFC6";
        const idempotencyKey = `tournament_results:${pid}:${uid}:${Date.now()}`;

        try {
          await resendSend({
            apiKey: resendApiKey,
            from: resendFrom,
            to: meta.email,
            subject,
            html,
            idempotencyKey,
          });
          poolSent++;
          totalSent++;
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : "Unknown error";
          poolErrors.push(`${uid}: ${errMsg}`);
          poolFailed++;
          totalFailed++;
        }
      }

      results.push({
        pool_id: pid,
        pool_name: pool.name,
        sent: poolSent,
        failed: poolFailed,
        errors: poolErrors,
      });
    }

    return new Response(
      JSON.stringify({
        status: "success",
        pools_processed: results.length,
        total_sent: totalSent,
        total_failed: totalFailed,
        results,
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
