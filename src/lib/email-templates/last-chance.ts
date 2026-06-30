export interface LastChancePoolData {
  pool_name: string
  pending_count: number
}

export interface LastChanceMatchData {
  home_team: string
  away_team: string
  home_flag_url: string
  away_flag_url: string
  kickoff_at: string
}

export interface LastChanceEmailData {
  match: LastChanceMatchData
  pool: LastChancePoolData
  predict_url: string
  other_pending_matches_html: string
}

function flagUrl(url: string): string {
  return url.replace('/w320/', '/w640/')
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

const PREHEADER = (home: string, away: string) =>
  `${home} 🆚 ${away} arranca en 1 hora — entra y deja tu predicción`

const BADGE = `<!--[if mso]><table cellpadding="0" cellspacing="0" border="0"><tr><td style="background-color:#1E293B;border-radius:100px;padding:12px 24px"><![endif]-->
<div style="display: inline-block; background-color: #1E293B; padding: 12px 24px; border-radius: 100px;">
  <span style="color: #22C55E; font-family: 'Inter', Arial, sans-serif; font-size: 14px; font-weight: 700; letter-spacing: 1px;">
    ⏰ ARRANCA EN 1 HORA
  </span>
</div>
<!--[if mso]></td></tr></table><![endif]-->`

const MATCH_INFO = (m: LastChanceMatchData) =>
  `<table cellpadding="0" cellspacing="0" border="0" style="margin: 0 auto;">
    <tr>
      <td style="text-align: right; padding-right: 12px; vertical-align: middle;">
        <img src="${flagUrl(m.home_flag_url)}" alt="${m.home_team}" width="48" height="48" style="width: 48px; height: 48px; border-radius: 8px; display: inline-block; vertical-align: middle;" class="flag-img">
        <span style="color: #F8FAFC; font-family: 'Inter', Arial, sans-serif; font-size: 20px; font-weight: 700; vertical-align: middle; padding-left: 8px;" class="team-name">${m.home_team}</span>
      </td>
      <td style="text-align: center; padding: 0 12px; vertical-align: middle;">
        <span style="color: #64748B; font-family: 'Inter', Arial, sans-serif; font-size: 18px; font-weight: 600;">VS</span>
      </td>
      <td style="text-align: left; padding-left: 12px; vertical-align: middle;">
        <span style="color: #F8FAFC; font-family: 'Inter', Arial, sans-serif; font-size: 20px; font-weight: 700; vertical-align: middle; padding-right: 8px;" class="team-name">${m.away_team}</span>
        <img src="${flagUrl(m.away_flag_url)}" alt="${m.away_team}" width="48" height="48" style="width: 48px; height: 48px; border-radius: 8px; display: inline-block; vertical-align: middle;" class="flag-img">
      </td>
    </tr>
  </table>`

const HEAD = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>${EMAIL_STYLES}
</head>`

const FOOTER = `<tr>
  <td align="center" style="padding-top: 32px;" bgcolor="transparent">
    <p style="color: #F8FAFC; font-family: 'Inter', Arial, sans-serif; font-size: 16px; font-weight: 700; margin: 0 0 12px 0; font-style: italic;" class="force-light-text">
      "Menos chat, más juego."
    </p>
    <p style="color: #94A3B8; font-family: 'Inter', Arial, sans-serif; font-size: 13px; line-height: 1.5; margin: 0;" class="text-muted">
      Si ya prediciste, ignorá este mensaje y segui tranqui.<br>
      &copy; 2026 parti2.app
    </p>
  </td>
</tr>`

export function renderLastChanceEmail(data: LastChanceEmailData): string {
  const { match, pool, predict_url, other_pending_matches_html } = data

  return `${HEAD}
<body style="background-color: #0F172A; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; font-family: 'Inter', Arial, Helvetica, sans-serif;" class="bg-dark">

  <div style="display: none; font-size: 0; color: #0F172A; line-height: 0; max-height: 0; max-width: 0; opacity: 0; overflow: hidden;">
    ${PREHEADER(match.home_team, match.away_team)}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0F172A;" bgcolor="#0F172A">
    <tr>
      <td align="center" style="background-color: #0F172A; padding: 40px 20px;" bgcolor="#0F172A" class="mobile-pad email-wrapper">
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
            <td align="center" style="padding-bottom: 24px;" bgcolor="transparent">
              ${BADGE}
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-bottom: 24px;" bgcolor="transparent">
              ${MATCH_INFO(match)}
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-bottom: 8px;" bgcolor="transparent">
              <p style="color: #94A3B8; font-family: 'Inter', Arial, sans-serif; font-size: 14px; margin: 0;" class="text-muted">
                Todavía no has dado tu pronóstico en
              </p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-bottom: 32px;" bgcolor="transparent">
              <span style="color: #22C55E; font-family: 'Inter', Arial, sans-serif; font-size: 16px; font-weight: 700;" class="text-green">
                🏆 ${pool.pool_name}
              </span>
              <span style="color: #64748B; font-family: 'Inter', Arial, sans-serif; font-size: 14px; margin-left: 8px;">
                • ${pool.pending_count} partidos sin predecir
              </span>
            </td>
          </tr>

          <tr>
            <td align="center" style="padding-bottom: 32px;" bgcolor="transparent">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${predict_url}" style="height:52px;v-text-anchor:middle;width:220px" arcsize="24%" strokecolor="#22C55E" fillcolor="#22C55E">
              <w:anchorlock/>
              <center style="color:#0F172A;font-family:'Inter',Arial,sans-serif;font-size:16px;font-weight:700">🔮 Predecir ahora</center>
              </v:roundrect>
              <![endif]-->
              <!--[if !mso]><!-->
              <table cellpadding="0" cellspacing="0" border="0" class="cta-wrap">
                <tr>
                  <td align="center" style="background-color: #22C55E; padding: 16px 40px; border-radius: 12px;" bgcolor="#22C55E">
                    <a href="${predict_url}" style="color: #0F172A; font-family: 'Inter', Arial, sans-serif; font-size: 16px; font-weight: 700; text-decoration: none; display: block;" class="cta-btn text-dark">
                      🔮 Predecir ahora
                    </a>
                  </td>
                </tr>
              </table>
              <!--<![endif]-->
            </td>
          </tr>

          <tr>
            <td style="padding: 24px 0; border-top: 1px solid #334155;" bgcolor="transparent">
              ${other_pending_matches_html ? `
              <p style="color: #94A3B8; font-family: 'Inter', Arial, sans-serif; font-size: 13px; font-weight: 600; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;" class="text-muted">
                También sin predecir en esta polla
              </p>
              ${other_pending_matches_html}` : ''}
            </td>
          </tr>

          ${FOOTER}

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
