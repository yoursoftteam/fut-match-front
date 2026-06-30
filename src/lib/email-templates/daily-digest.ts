export type Tier = 'top3' | 'mid' | 'bottom2'

export interface DailyDigestPoolData {
  pool_name: string
  pool_url: string
  points: number
  rank: number
  total_members: number
  tier: Tier
}

export interface LeaderboardEntry {
  rank: number
  user_email: string
  points: number
  is_current_user: boolean
}

export interface DailyDigestEmailData {
  main_pool: DailyDigestPoolData
  leaderboard: LeaderboardEntry[]
  other_pools_html: string
}

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
.bg-green{background-color:#22C55E!important}
.bg-divider{background-color:#334155!important}
.text-white{color:#F8FAFC!important}
.text-muted{color:#94A3B8!important}
.text-green{color:#22C55E!important}
.text-dark{color:#0F172A!important}
@media only screen and (max-width:480px){
  .container{width:100%!important;max-width:100%!important}
  .mobile-pad{padding:24px 16px!important}
  .mobile-stack{display:block!important;width:100%!important;text-align:center!important;padding:8px 0!important}
  .mobile-hide{display:none!important}
  .stats-cell{padding:8px 12px!important}
  .stats-value{font-size:28px!important;line-height:1.2!important}
  .flag-img{width:36px!important;height:36px!important}
  .team-name{font-size:16px!important}
  .cta-wrap{width:100%!important}
  .cta-btn{display:block!important;width:auto!important;padding:14px 24px!important;font-size:14px!important;text-align:center!important}
}
/* Gmail dark mode — forces our dark bg back when Gmail auto-inverts */
html[data-ogsc] .email-wrapper{background-color:#0F172A!important}
html[data-ogsc] .email-card-bg{background-color:#1E293B!important}
html[data-ogsb] .email-wrapper{background-color:#0F172A!important}
html[data-ogsb] .email-card-bg{background-color:#1E293B!important}
html[data-ogsc] .email-light-text{color:#F8FAFC!important}
html[data-ogsb] .email-light-text{color:#F8FAFC!important}
/* Fallback for older Gmail versions */
u + .body .email-wrapper{background-color:#0F172A!important}
</style>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->`

const TIER_CONFIG: Record<Tier, {
  pill: string
  title: string
  body: (d: DailyDigestPoolData) => string
  cta: string
}> = {
  top3: {
    pill: '<span style="display: inline-block; background-color: #22C55E; color: #0F172A; padding: 4px 14px; border-radius: 100px; font-size: 13px; font-weight: 700;">🏆 Top 3</span>',
    title: '¡Vas a Fuego! 🔥',
    body: (d) => `Vas ${d.rank}° en ${d.pool_name} con ${d.points} pts. Mantené el ritmo que la Copa no perdona.`,
    cta: 'Seguí así',
  },
  mid: {
    pill: '<span style="display: inline-block; background-color: #334155; color: #F8FAFC; padding: 4px 14px; border-radius: 100px; font-size: 13px; font-weight: 700;">📊 Zona media</span>',
    title: 'La lucha sigue',
    body: (d) => `Vas ${d.rank}° de ${d.total_members} en ${d.pool_name} con ${d.points} pts. Quedan partidos y todo puede pasar.`,
    cta: 'Metele que se puede',
  },
  bottom2: {
    pill: '<span style="display: inline-block; background-color: #7F1D1D; color: #FCA5A5; padding: 4px 14px; border-radius: 100px; font-size: 13px; font-weight: 700;">💪 Fondo de tabla</span>',
    title: 'Hay que remar',
    body: (d) => `Vas ${d.rank}° en ${d.pool_name} con ${d.points} pts. La buena: queda mucha tela para cortar.`,
    cta: 'Vamos a remar',
  },
}

const HEAD = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>${EMAIL_STYLES}
</head>`

const FOOTER = `<tr>
  <td align="center" style="padding-top: 32px;" bgcolor="transparent">
    <p style="color: #F8FAFC; font-family: 'Inter', Arial, sans-serif; font-size: 16px; font-weight: 700; margin: 0 0 12px 0; font-style: italic;" class="email-light-text">
      "Menos chat, más juego."
    </p>
    <p style="color: #94A3B8; font-family: 'Inter', Arial, sans-serif; font-size: 13px; line-height: 1.5; margin: 0;" class="text-muted">
      Resumen diario de tus pollas en parti2.app<br>
      &copy; 2026 parti2.app
    </p>
  </td>
</tr>`

function renderLeaderboardRow(entry: LeaderboardEntry): string {
  const medal = entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : ''
  const rankDisplay = medal ? `${medal}` : `${entry.rank}°`
  const rowBg = entry.is_current_user ? 'background-color: #22C55E20;' : ''
  const nameColor = entry.is_current_user ? '#22C55E' : '#F8FAFC'
  const fontWeight = entry.is_current_user ? '700' : '400'

  return `<tr style="${rowBg}">
    <td style="padding: 8px 12px; color: #94A3B8; font-family: 'Inter', Arial, sans-serif; font-size: 14px; font-weight: 600; width: 40px;" bgcolor="transparent">${rankDisplay}</td>
    <td style="padding: 8px 12px; color: ${nameColor}; font-family: 'Inter', Arial, sans-serif; font-size: 14px; font-weight: ${fontWeight};" bgcolor="transparent">${entry.user_email.split('@')[0]}</td>
    <td style="padding: 8px 12px; color: #22C55E; font-family: 'Inter', Arial, sans-serif; font-size: 14px; font-weight: 700; text-align: right;" bgcolor="transparent">${entry.points}p</td>
  </tr>`
}

export function renderDailyDigestEmail(data: DailyDigestEmailData): string {
  const { main_pool, leaderboard, other_pools_html } = data
  const tierConfig = TIER_CONFIG[main_pool.tier]

  const previewText = main_pool.tier === 'top3'
    ? `Vas ${main_pool.rank}° con ${main_pool.points} pts — aguantá la punta máquina 💪`
    : main_pool.tier === 'mid'
      ? `Vas ${main_pool.rank}° de ${main_pool.total_members} — metele que quedan partidos ⚡`
      : `Vas último en ${main_pool.pool_name} — hora de remar, esto no termina acá`

  const leaderboardHtml = leaderboard.length > 0
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0F172A; border-radius: 12px; margin-bottom: 24px;" bgcolor="#0F172A">
        ${leaderboard.map(renderLeaderboardRow).join('')}
       </table>`
    : ''

  const statsCard = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0F172A; border-radius: 16px; margin-bottom: 24px;" bgcolor="#0F172A">
    <tr>
      <td align="center" style="padding: 24px 16px;" class="stats-cell" bgcolor="transparent">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="text-align: center; padding: 0 12px;" class="mobile-stack" bgcolor="transparent">
              <span style="color: #64748B; font-family: 'Inter', Arial, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Posición</span>
              <p style="color: #F8FAFC; font-family: 'Inter', Arial, sans-serif; font-size: 36px; font-weight: 800; margin: 4px 0 0 0;" class="stats-value email-light-text">
                ${main_pool.rank}<span style="color: #64748B; font-size: 20px; font-weight: 600;">°</span>
              </p>
            </td>
            <td style="width: 1px; background-color: #334155; padding: 0; height: 60px;" bgcolor="#334155" class="bg-divider"></td>
            <td style="text-align: center; padding: 0 12px;" class="mobile-stack" bgcolor="transparent">
              <span style="color: #64748B; font-family: 'Inter', Arial, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Puntos</span>
              <p style="color: #22C55E; font-family: 'Inter', Arial, sans-serif; font-size: 36px; font-weight: 800; margin: 4px 0 0 0;" class="stats-value text-green">
                ${main_pool.points}
              </p>
            </td>
            <td style="width: 1px; background-color: #334155; padding: 0; height: 60px;" bgcolor="#334155" class="bg-divider"></td>
            <td style="text-align: center; padding: 0 12px;" class="mobile-stack" bgcolor="transparent">
              <span style="color: #64748B; font-family: 'Inter', Arial, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Participantes</span>
              <p style="color: #F8FAFC; font-family: 'Inter', Arial, sans-serif; font-size: 36px; font-weight: 800; margin: 4px 0 0 0;" class="stats-value email-light-text">
                ${main_pool.total_members}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`

  return `${HEAD}
<body style="background-color: #0F172A; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; font-family: 'Inter', Arial, Helvetica, sans-serif;" class="bg-dark">

  <div style="display: none; font-size: 0; color: #0F172A; line-height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
    ${previewText}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0F172A;" bgcolor="#0F172A">
    <tr>
      <td align="center" style="background-color: #0F172A; padding: 40px 20px;" bgcolor="#0F172A" class="mobile-pad force-dark-bg">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; width: 100%;" class="container">

          <tr>
            <td align="center" style="padding-bottom: 32px;" bgcolor="transparent">
              <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td style="padding-right: 12px; vertical-align: middle;" bgcolor="transparent">
                    <img src="https://parti2.app/p2-logo.png" alt="parti2" width="140" style="width: 140px; max-width: 140px; height: auto; display: block; border: 0;">
                  </td>
                  <td style="padding-left: 12px; vertical-align: middle;" bgcolor="transparent">
                    <img src="https://cdn.prod.website-files.com/68f550992570ca0322737dc2/69f4a82e3685731a3ab5086e_fifa-world-cup-2026-official-logo-footylogos-white.png" alt="FIFA World Cup 2026" width="80" style="width: 80px; max-width: 80px; height: auto; display: block; border: 0;">
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td align="left" style="background-color: #1E293B; padding: 32px; border-radius: 24px;" bgcolor="#1E293B" class="mobile-pad force-card-bg">

              <div style="margin-bottom: 20px;">
                ${tierConfig.pill}
              </div>

              <h1 style="color: #F8FAFC; font-family: 'Inter', Arial, sans-serif; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;" class="email-light-text">
                ${tierConfig.title}
              </h1>

              <p style="color: #94A3B8; font-family: 'Inter', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;" class="text-muted">
                ${tierConfig.body(main_pool)}
              </p>

              ${statsCard}

              ${leaderboardHtml}

              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${main_pool.pool_url}" style="height:52px;v-text-anchor:middle;width:220px" arcsize="24%" strokecolor="#22C55E" fillcolor="#22C55E">
              <w:anchorlock/>
              <center style="color:#0F172A;font-family:'Inter',Arial,sans-serif;font-size:16px;font-weight:700">${tierConfig.cta}</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" class="cta-wrap">
                <tr>
                  <td align="center" bgcolor="transparent">
                    <a href="${main_pool.pool_url}" style="background-color: #22C55E; color: #0F172A; font-family: 'Inter', Arial, sans-serif; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 12px; display: inline-block;" class="cta-btn text-dark">
                      ${tierConfig.cta}
                    </a>
                  </td>
                </tr>
              </table>
              <!--<![endif]-->

            </td>
          </tr>

          ${other_pools_html ? `<tr>
            <td style="padding-top: 24px;" bgcolor="transparent">
              ${other_pools_html}
            </td>
          </tr>` : ''}

          ${FOOTER}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
