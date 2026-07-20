export type UserTier = 'winner' | 'top3' | 'rest'

export interface TournamentResultsEmailData {
  user_name: string
  pool_name: string
  pool_url: string
  rank: number
  total_members: number
  total_points: number
  tournament_points: number
  tier: UserTier
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
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]-->`

const TIER_CONFIG: Record<UserTier, {
  pill: string
  title: string
  body: string
}> = {
  winner: {
    pill: '<span style="display: inline-block; background-color: #22C55E; color: #0F172A; padding: 4px 14px; border-radius: 100px; font-size: 13px; font-weight: 700;">👑 CAMPEÓN</span>',
    title: '¡FELICIDADES, CAMPEÓN(A)! 👑🏆',
    body: '¡Lo lograste! Con una estrategia impecable y los mejores pronósticos, te has coronado como el gran ganador(a) de esta edición de la polla. Tu nombre queda grabado en la cima de la tabla. ¡Disfruta este triunfo y prepárate para presumir tu corona!',
  },
  top3: {
    pill: '<span style="display: inline-block; background-color: #334155; color: #F8FAFC; padding: 4px 14px; border-radius: 100px; font-size: 13px; font-weight: 700;">🥇🥈🥉 PODIO</span>',
    title: '¡EXCELENTE TRABAJO! ESTÁS EN EL PODIO 🥇🥈',
    body: '¡Felicitaciones! Has demostrado estar entre los mejores pronosticadores del torneo asegurando tu lugar en el Top 3 de la polla. Estuviste muy cerca de la gloria absoluta; gracias por la competencia tan reñida y emocionante hasta el último minuto.',
  },
  rest: {
    pill: '<span style="display: inline-block; background-color: #1E293B; color: #94A3B8; padding: 4px 14px; border-radius: 100px; font-size: 13px; font-weight: 700;">🏅 PARTICIPANTE</span>',
    title: 'Gracias por competir',
    body: 'Gracias por competir y mantener la emoción viva hasta el final. Aunque esta vez el podio estuvo reñido, cada acierto contó y la experiencia se disfrutó de principio a fin. ¡Habrá revancha en el próximo torneo!',
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
      Resultados finales de tu polla en parti2.app<br>
      &copy; 2026 parti2.app
    </p>
  </td>
</tr>`

export function renderTournamentResultsEmail(data: TournamentResultsEmailData): string {
  const tierConfig = TIER_CONFIG[data.tier]
  const greeting = data.user_name ? `Hola, ${data.user_name}` : 'Hola'

  const statsCard = `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #0F172A; border-radius: 16px; margin-bottom: 24px;" bgcolor="#0F172A">
    <tr>
      <td align="center" style="padding: 24px 16px;" class="stats-cell" bgcolor="transparent">
        <table cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="text-align: center; padding: 0 12px;" class="mobile-stack" bgcolor="transparent">
              <span style="color: #64748B; font-family: 'Inter', Arial, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Posición</span>
              <p style="color: #F8FAFC; font-family: 'Inter', Arial, sans-serif; font-size: 36px; font-weight: 800; margin: 4px 0 0 0;" class="stats-value email-light-text">
                ${data.rank}<span style="color: #64748B; font-size: 20px; font-weight: 600;">°</span>
                <span style="color: #64748B; font-size: 16px; font-weight: 400;"> / ${data.total_members}</span>
              </p>
            </td>
            <td style="width: 1px; background-color: #334155; padding: 0; height: 60px;" bgcolor="#334155"></td>
            <td style="text-align: center; padding: 0 12px;" class="mobile-stack" bgcolor="transparent">
              <span style="color: #64748B; font-family: 'Inter', Arial, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Puntaje Total</span>
              <p style="color: #22C55E; font-family: 'Inter', Arial, sans-serif; font-size: 36px; font-weight: 800; margin: 4px 0 0 0;" class="stats-value text-green">
                ${data.total_points}
              </p>
            </td>
            <td style="width: 1px; background-color: #334155; padding: 0; height: 60px;" bgcolor="#334155"></td>
            <td style="text-align: center; padding: 0 12px;" class="mobile-stack" bgcolor="transparent">
              <span style="color: #64748B; font-family: 'Inter', Arial, sans-serif; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Campeón/Podio</span>
              <p style="color: #F8FAFC; font-family: 'Inter', Arial, sans-serif; font-size: 36px; font-weight: 800; margin: 4px 0 0 0;" class="stats-value email-light-text">
                ${data.tournament_points}<span style="color: #64748B; font-size: 16px; font-weight: 400;"> pts</span>
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
    ¡Resultados finales de la polla! Descubre cómo te fue y quién se llevó la corona 🏆
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

              <p style="color: #94A3B8; font-family: 'Inter', Arial, sans-serif; font-size: 15px; line-height: 1.5; margin: 0 0 8px 0;" class="text-muted">
                ${greeting}:
              </p>

              <p style="color: #94A3B8; font-family: 'Inter', Arial, sans-serif; font-size: 15px; line-height: 1.6; margin: 0 0 20px 0;" class="text-muted">
                ¡El torneo ha llegado a su fin y la emoción de la polla de Parti2 también! Queremos agradecerte por ser parte de esta gran experiencia, hacer tus pronósticos fecha a fecha y vivir la pasión del fútbol con nosotros.
              </p>

              <p style="color: #94A3B8; font-family: 'Inter', Arial, sans-serif; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;" class="text-muted">
                Te informamos que todos los puntos ya han sido calculados oficialmente, incluyendo los aciertos de los partidos de la fase final y las predicciones especiales de campeón, subcampeón y tercer puesto. El marcador total ha sido actualizado.
              </p>

              <p style="color: #F8FAFC; font-family: 'Inter', Arial, sans-serif; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;" class="email-light-text">
                ${tierConfig.body}
              </p>

              <p style="color: #64748B; font-family: 'Inter', Arial, sans-serif; font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin: 0 0 8px 0;">
                📊 Tu Resumen Final en la Polla
              </p>

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
                    <a href="${data.pool_url}" style="background-color: #22C55E; color: #0F172A; font-family: 'Inter', Arial, sans-serif; font-size: 16px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 12px; display: inline-block;" class="cta-btn text-dark">
                      🚀 Ver tabla de posiciones completa
                    </a>
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
</html>`
}
