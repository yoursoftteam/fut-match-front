# Spec Técnico: Campañas de Email para Pollas & Predicciones (Issue #94)

**Versión:** v1.0  
**Estado:** Aprobado para Desarrollo  
**Stack involucrado:** Next.js 16 + Supabase (PostgreSQL, pg_cron) + Cloudflare Workers (Cron Triggers) + Resend

---

## 1. Resumen

Dos campañas transaccionales vía **Resend.com** targeting GenZ/Millennials, usando la identidad de marca parti2 (`#0F172A` fondo, `#22C55E` accent, tipografía Inter):

| Campaña | Disparo | Propósito |
|---|---|---|
| **Last Chance (T-1h)** | 1h antes de cada partido | Recordar predicciones no diligenciadas por pool/global |
| **Daily Digest (9AM COL)** | Diario 9:00 AM hora Colombia | Reporte de puntos + posición con tono según ranking |

---

## 2. Arquitectura Técnica

### 2.1 Stack objetivo

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCHEDULING LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Campaign 1 (T-1h Alert):                                        │
│  - Supabase PG Cron: `fn_enqueue_last_chance_alerts()`           │
│    Runs every 15 minutes                                         │
│  - Queries bet_matches with kickoff_at in [now+55m, now+65m]     │
│  - Finds missing predictions per user×pool×match                 │
│  - Inserts into bet_notification_queue                           │
│                                                                  │
│  Campaign 2 (Daily Digest 9AM COL):                              │
│  - Supabase PG Cron: `fn_enqueue_daily_digests()`                │
│  - Runs at '0 14 * * *' (14:00 UTC = 9:00 AM COL)               │
│  - Queries bet_scores_aggregate per pool per user with ranking   │
│  - Determines position tier (top3, mid, bottom2)                 │
│  - Inserts into bet_notification_queue                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    QUEUE PROCESSOR                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Cloudflare Cron Trigger (every 1-2 min):                        │
│  - HITS GET /api/v1/bet/notifications/process                    │
│     (with Bearer token auth)                                     │
│                                                                  │
│  Next.js API Route Handler:                                      │
│  - Validates cron secret                                         │
│  - SELECTs pending items with FOR UPDATE SKIP LOCKED             │
│  - Batch sends via Resend /emails/batch (max 100)                │
│  - Marks as sent/failed with error_message                       │
│  - Returns { processed, failed, remaining }                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    EMAIL SENDING (Resend)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Resend Batch API: POST https://api.resend.com/emails/batch      │
│  - X-Idempotency-Key per item (handled by queue table)           │
│  - Each email rendered from HTML template with dynamic data      │
│  - From: "parti2" <equipo@parti2.app>                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Componentes a crear/modificar

| Archivo | Tipo | Propósito |
|---|---|---|
| `src/lib/email-service.ts` | Server utility | Inicializar Resend client, método `sendEmailBatch()` |
| `src/lib/email-templates/last-chance.ts` | Template | Render HTML Campaign 1 |
| `src/lib/email-templates/daily-digest.ts` | Template | Render HTML Campaign 2 |
| `src/app/api/v1/bet/notifications/process/route.ts` | API Route | Procesar cola y enviar vía Resend |
| `supabase/migrations/XXXXXX_create_fn_enqueue_last_chance.sql` | Migration | PG function para encolar alertas T-1h |
| `supabase/migrations/XXXXXX_create_fn_enqueue_daily_digest.sql` | Migration | PG function para encolar digest diario |
| `supabase/migrations/XXXXXX_create_pg_cron_jobs.sql` | Migration | Registrar jobs en `pg_cron` |
| `cloudflare-worker/cron-trigger.js` | Worker aparte | Cron trigger cada 2 min → llama al process endpoint |

### 2.3 Secuencia de datos (Campaign 1 - Last Chance)

```sql
-- Encuentra partidos que arrancan en ~60 minutos
-- y usuarios que NO han predicho en cada pool donde son miembros
WITH upcoming_matches AS (
  SELECT id, home_team_id, away_team_id, kickoff_at
  FROM bet_matches
  WHERE status = 'scheduled'
    AND kickoff_at BETWEEN NOW() + INTERVAL '55 minutes'
                      AND NOW() + INTERVAL '65 minutes'
),
user_pools AS (
  SELECT bpm.user_id, bpm.pool_id, bp.name AS pool_name, bp.competition_type
  FROM bet_pool_members bpm
  JOIN bet_pools bp ON bp.id = bpm.pool_id
  WHERE bp.tournament_id = (SELECT id FROM bet_tournaments WHERE status = 'active' LIMIT 1)
)
SELECT up.user_id, up.pool_id, up.pool_name, um.id AS match_id,
       um.home_team_id, um.away_team_id, um.kickoff_at
FROM user_pools up
CROSS JOIN upcoming_matches um
WHERE NOT EXISTS (
  SELECT 1 FROM bet_match_predictions bmp
  WHERE bmp.user_id = up.user_id
    AND bmp.match_id = um.id
    AND bmp.mode = 'pool'
    AND (bmp.pool_id = up.pool_id OR (bmp.pool_id IS NULL AND up.pool_id IS NULL))
)
AND up.competition_type = 'pool'
```

### 2.4 Secuencia de datos (Campaign 2 - Daily Digest)

```sql
-- Para cada usuario en cada pool: puntos, ranking, total participantes
WITH ranked AS (
  SELECT 
    bsa.user_id,
    bsa.pool_id,
    bsa.points_total,
    bp.name AS pool_name,
    ROW_NUMBER() OVER (PARTITION BY bsa.pool_id ORDER BY bsa.points_total DESC) AS rank_pos,
    COUNT(*) OVER (PARTITION BY bsa.pool_id) AS total_members
  FROM bet_scores_aggregate bsa
  JOIN bet_pools bp ON bp.id = bsa.pool_id
  WHERE bsa.mode = 'pool'
    AND bp.tournament_id = (SELECT id FROM bet_tournaments WHERE status = 'active' LIMIT 1)
)
SELECT 
  user_id,
  pool_id,
  pool_name,
  points_total,
  rank_pos,
  total_members,
  CASE 
    WHEN rank_pos <= 3 THEN 'top3'
    WHEN rank_pos > total_members - 2 THEN 'bottom2'
    ELSE 'mid'
  END AS tier
FROM ranked;
```

---

## 3. Diseño de Plantillas Email

### 3.1 Campaign 1: "Last Chance" — T-1h antes del partido

**Subject:** `⏰ Quedó poco — [EquipoLocal] 🆚 [EquipoVisitante] en 1 hora`

**Preview text:** `En [PoolName] nadie espera. Marca tu predicción antes del pitazo. ⚡`

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Última chance parti2</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: 'Inter', Arial, sans-serif; background-color: #0F172A; }
  </style>
</head>
<body style="background-color: #0F172A; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">

  <div style="display: none; font-size: 0; color: #0F172A; line-height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
    ⏰ [EquipoLocal] 🆚 [EquipoVisitante] arranca en 1 hora — entra y deja tu predicción
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0F172A; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <img src="https://parti2.app/p2-logo.png" alt="parti2" style="max-width: 140px; height: auto; display: block; margin: 0 auto;">
            </td>
          </tr>

          <!-- Match Badge / Countdown -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <div style="display: inline-block; background-color: #1E293B; padding: 12px 24px; border-radius: 100px;">
                <span style="color: #22C55E; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 1px;">
                  ⏰ ARRANCA EN 1 HORA
                </span>
              </div>
            </td>
          </tr>

          <!-- Match Info -->
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="text-align: right; padding-right: 16px;">
                    <img src="[FLAG_HOME_URL]" alt="[HOME_TEAM]" style="width: 48px; height: 48px; border-radius: 8px; display: inline-block; vertical-align: middle;">
                    <span style="color: #F8FAFC; font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 700; margin-left: 8px; vertical-align: middle;">[HOME_TEAM]</span>
                  </td>
                  <td style="text-align: center; padding: 0 12px;">
                    <span style="color: #64748B; font-family: 'Inter', sans-serif; font-size: 18px; font-weight: 600;">VS</span>
                  </td>
                  <td style="text-align: left; padding-left: 16px;">
                    <span style="color: #F8FAFC; font-family: 'Inter', sans-serif; font-size: 20px; font-weight: 700; vertical-align: middle;">[AWAY_TEAM]</span>
                    <img src="[FLAG_AWAY_URL]" alt="[AWAY_TEAM]" style="width: 48px; height: 48px; border-radius: 8px; display: inline-block; vertical-align: middle; margin-left: 8px;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Pool Context -->
          <tr>
            <td align="center" style="padding-bottom: 8px;">
              <p style="color: #94A3B8; font-family: 'Inter', sans-serif; font-size: 14px; margin: 0;">
                Todavía no has predicado este partido en
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <span style="color: #22C55E; font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 700;">
                🏆 [POOL_NAME]
              </span>
              <span style="color: #64748B; font-family: 'Inter', sans-serif; font-size: 14px; margin-left: 8px;">
                • [PENDING_COUNT] partidos sin predecir
              </span>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background-color: #22C55E; padding: 16px 40px; border-radius: 12px;">
                    <a href="[PREDICT_URL]" style="color: #0F172A; font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 700; text-decoration: none; display: block;">
                      🔮 Predecir ahora
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Other pending matches -->
          <tr>
            <td style="padding: 24px 0; border-top: 1px solid #334155;">
              <p style="color: #94A3B8; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 600; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                También sin predecir en esta polla
              </p>
              [OTHER_PENDING_MATCHES]
              <!-- Dynamic list of other matches in this pool without prediction -->
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="color: #F8FAFC; font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 700; margin: 0 0 12px 0; font-style: italic;">
                "Menos chat, más juego."
              </p>
              <p style="color: #64748B; font-family: 'Inter', sans-serif; font-size: 13px; line-height: 1.5; margin: 0;">
                Si ya prediciste, ignorá este mensaje y segui tranqui.<br>
                © 2026 parti2.app
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Variables dinámicas:**

| Variable | Fuente |
|---|---|
| `[HOME_TEAM]`, `[AWAY_TEAM]` | `bet_teams.name` |
| `[FLAG_HOME_URL]`, `[FLAG_AWAY_URL]` | `bet_teams.flag_svg_url` |
| `[POOL_NAME]` | `bet_pools.name` |
| `[PREDICT_URL]` | `https://parti2.app/bet/pools/{pool_id}?match={match_id}` |
| `[PENDING_COUNT]` | COUNT de matches sin predecir en esa pool |
| `[OTHER_PENDING_MATCHES]` | Lista de otros partidos del torneo que el usuario no ha predicho en esa pool |

---

### 3.2 Campaign 2: "Daily Digest" — 9:00 AM COL

**Subject (Top 3):** `🏆 ¡Vas como avión en [POOL_NAME]! 🔥`
**Subject (Mid):** `📊 [POOL_NAME] — todo puede pasar`
**Subject (Bottom 2):** `💪 Dale que se puede en [POOL_NAME]`

**Preview (Top 3):** `Vas [RANK]° con [POINTS] pts — aguantá la punta máquina 💪`
**Preview (Mid):** `Vas [RANK]° de [TOTAL] — metele que quedan partidos ⚡`
**Preview (Bottom 2):** `Vas último en [POOL_NAME] — hora de remar, esto no termina acá`

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Tu resumen parti2</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; font-family: 'Inter', Arial, sans-serif; background-color: #0F172A; }
    .pill-top3 { display: inline-block; background-color: #22C55E; color: #0F172A; padding: 4px 14px; border-radius: 100px; font-size: 13px; font-weight: 700; }
    .pill-mid { display: inline-block; background-color: #334155; color: #F8FAFC; padding: 4px 14px; border-radius: 100px; font-size: 13px; font-weight: 700; }
    .pill-bottom2 { display: inline-block; background-color: #7F1D1D; color: #FCA5A5; padding: 4px 14px; border-radius: 100px; font-size: 13px; font-weight: 700; }
  </style>
</head>
<body style="background-color: #0F172A; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">

  <div style="display: none; font-size: 0; color: #0F172A; line-height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
    [TIER_PREVIEW_TEXT]
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0F172A; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;">

          <!-- Header / Logo -->
          <tr>
            <td align="center" style="padding-bottom: 32px;">
              <img src="https://parti2.app/p2-logo.png" alt="parti2" style="max-width: 140px; height: auto; display: block; margin: 0 auto;">
            </td>
          </tr>

          <!-- Greeting with Tier Pill -->
          <tr>
            <td align="left" style="background-color: #1E293B; padding: 32px; border-radius: 24px;">

              <!-- Header based on tier -->
              <div style="margin-bottom: 20px;">
                [TIER_PILL]
              </div>

              <h1 style="color: #F8FAFC; font-family: 'Inter', sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
                [GREETING_TITLE]
              </h1>

              <p style="color: #94A3B8; font-family: 'Inter', sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                [GREETING_BODY]
              </p>

              <!-- Position / Points Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0F172A; border-radius: 16px; margin-bottom: 24px;">
                <tr>
                  <td align="center" style="padding: 24px 16px;">
                    <table cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td style="text-align: center; padding: 0 24px;">
                          <span style="color: #64748B; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Posición</span>
                          <p style="color: #F8FAFC; font-family: 'Inter', sans-serif; font-size: 36px; font-weight: 800; margin: 4px 0 0 0;">
                            [RANK]<span style="color: #64748B; font-size: 20px; font-weight: 600;">°</span>
                          </p>
                        </td>
                        <td style="width: 1px; background-color: #334155; padding: 0;"></td>
                        <td style="text-align: center; padding: 0 24px;">
                          <span style="color: #64748B; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Puntos</span>
                          <p style="color: #22C55E; font-family: 'Inter', sans-serif; font-size: 36px; font-weight: 800; margin: 4px 0 0 0;">
                            [POINTS]
                          </p>
                        </td>
                        <td style="width: 1px; background-color: #334155; padding: 0;"></td>
                        <td style="text-align: center; padding: 0 24px;">
                          <span style="color: #64748B; font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Participantes</span>
                          <p style="color: #F8FAFC; font-family: 'Inter', sans-serif; font-size: 36px; font-weight: 800; margin: 4px 0 0 0;">
                            [TOTAL]
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Leaderboard snippet -->
              [LEADERBOARD_SNIPPET]

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center">
                    <a href="[POOL_URL]" style="background-color: #22C55E; color: #0F172A; font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 12px; display: block; text-align: center; width: 100%; box-sizing: border-box;">
                      [CTA_TEXT]
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Multiple pools section -->
          [OTHER_POOLS_SECTION]

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top: 32px;">
              <p style="color: #F8FAFC; font-family: 'Inter', sans-serif; font-size: 16px; font-weight: 700; margin: 0 0 12px 0; font-style: italic;">
                "Menos chat, más juego."
              </p>
              <p style="color: #64748B; font-family: 'Inter', sans-serif; font-size: 13px; line-height: 1.5; margin: 0;">
                Resumen diario de tus pollas en parti2.app<br>
                © 2026 parti2.app
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
```

**Matriz de contenido por tier:**

| Tier | Condición | Pill | Título | Cuerpo | CTA | Leaderboard highlight |
|---|---|---|---|---|---|---|
| 🏆 **Top 3** | `rank <= 3` | `bg-[#22C55E] text-[#0F172A]` "🏆 Top 3" | "¡Vas al horno! 🔥" | "Vas [RANK]° en [POOL] con [PTS] pts. Mantené el ritmo que la Copa no perdona." | "Seguí así" | Fila del usuario en verde |
| 📊 **Mid** | `rank > 3 AND rank <= total - 2` | `bg-[#334155] text-[#F8FAFC]` "📊 Zona media" | "La lucha sigue" | "Vas [RANK]° de [TOTAL] en [POOL] con [PTS] pts. Quedan partidos y todo puede pasar." | "Metele que se puede" | Fila del usuario normal |
| 💪 **Bottom 2** | `rank > total - 2` | `bg-[#7F1D1D] text-[#FCA5A5]` "💪 Fondo de tabla" | "Hay que remar" | "Vas [RANK]° en [POOL] con [PTS] pts. La buena: queda mucha tela para cortar." | "Vamos a remar" | Fila del usuario en rojo |

---

## 4. Plan de Implementación

### Fase 1 — Base (Día 1-2)

| Paso | Archivo | Acción |
|---|---|---|
| 1.1 | `src/lib/email-service.ts` | Implementar clase `EmailService` con método `sendBatch(emails: EmailPayload[])` usando Resend SDK + `X-Idempotency-Key` |
| 1.2 | `src/lib/email-templates/last-chance.ts` | Función `renderLastChanceEmail(data)` → string HTML |
| 1.3 | `src/lib/email-templates/daily-digest.ts` | Función `renderDailyDigestEmail(data)` → string HTML |
| 1.4 | `package.json` | Agregar dependencia `resend` |

### Fase 2 — API & Queue (Día 3-4)

| Paso | Archivo | Acción |
|---|---|---|
| 2.1 | `src/app/api/v1/bet/notifications/process/route.ts` | GET handler: `SELECT ... FROM bet_notification_queue WHERE sent_at IS NULL AND failed_at IS NULL AND send_at <= NOW() ORDER BY send_at LIMIT 50 FOR UPDATE SKIP LOCKED` → batch send via Resend → mark sent/failed |

### Fase 3 — PG Functions + Cron (Día 5)

| Paso | Archivo | Acción |
|---|---|---|
| 3.1 | Migration `_fn_enqueue_last_chance.sql` | PG function con query de missing predictions + INSERT en queue con `idempotency_key` |
| 3.2 | Migration `_fn_enqueue_daily_digest.sql` | PG function con query de ranking + INSERT con `idempotency_key` |
| 3.3 | Migration `_create_pg_cron_jobs.sql` | `cron.schedule('last-chance', '*/15 * * * *', ...)` y `cron.schedule('daily-digest', '0 14 * * *', ...)` |

### Fase 4 — Cloudflare Cron Worker (Día 6)

| Paso | Archivo | Acción |
|---|---|---|
| 4.1 | `cloudflare-worker/cron-trigger.js` | Worker independiente con scheduled handler que llama al process endpoint |
| 4.2 | `wrangler.jsonc` del worker | `triggers: { crons: ["*/2 * * * *"] }` |

---

## 5. Variables de Entorno Nuevas

| Variable | Dónde se usa |
|---|---|
| `RESEND_API_KEY` | `email-service.ts` — Resend API key |
| `RESEND_FROM_EMAIL` | `email-service.ts` — "equipo@parti2.app" |
| `CRON_SECRET` | Valida que el caller es el cron worker |
| `NEXT_PUBLIC_APP_URL` | Ya existe — para construir URLs absolutas |

---

## 6. Idempotencia & Anti-duplicados

| Estrategia | Detalle |
|---|---|
| **Unique constraint** | `bet_notification_queue.idempotency_key` tiene UNIQUE |
| **PG Function ON CONFLICT DO NOTHING** | El INSERT ignora si ya existe la key |
| **Resend Idempotency-Key** | Cada request a Resend lleva `X-Idempotency-Key: {idempotency_key}` |
| **FOR UPDATE SKIP LOCKED** | El process endpoint evita que dos workers procesen el mismo item |

---

## 7. Pendientes / Preguntas Abiertas

1. **¿pg_cron extension habilitada en Supabase?** Verificar `SELECT * FROM pg_extension WHERE extname = 'pg_cron'` — requiere plan Pro.
2. **¿Resend API key lista?** Agregar a GitHub Actions secrets y Cloudflare vars.
3. **¿Dominio parti2.app verificado en Resend?** DKIM/SPF obligatorios.
4. **¿Cron worker separado o integrado en el mismo wrangler.jsonc?**
5. **¿Considerar react-email para desarrollo local de templates?**
