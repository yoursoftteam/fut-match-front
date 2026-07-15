interface MatchInfo {
  title: string
  date: string
  location: string
}

interface Participant {
  name: string
  hasPaid: boolean
}

const SUMMARY_SYMBOLS = {
  calendar: '\u{1F4C5}',
  stadium: '\u{1F3DF}\u{FE0F}',
  paid: '\u{1F4B8}',
  pending: '\u{23F3}',
  chart: '\u{1F4CA}',
} as const

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function formatSummaryDateTime(date: Date): string {
  const parts = new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
  }).formatToParts(date)

  const weekday = parts.find((p) => p.type === 'weekday')?.value ?? ''
  const day = parts.find((p) => p.type === 'day')?.value ?? ''
  const month = parts.find((p) => p.type === 'month')?.value ?? ''
  const time = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date)

  return `${capitalize(weekday)} ${day} ${capitalize(month)}, ${time}`
}

/**
 * Genera un resumen de participantes y su estado de pago
 * con formato WhatsApp-friendly
 *
 * @param matchInfo Información del partido (título, fecha, ubicación)
 * @param participants Lista de participantes con estado de pago
 * @returns String formateado para copiar/compartir
 */
export function generatePaymentSummary(
  matchInfo: MatchInfo,
  participants: Participant[]
): string {
  try {
    const matchDate = new Date(matchInfo.date)

    const header = [
      `${SUMMARY_SYMBOLS.calendar} ${formatSummaryDateTime(matchDate)}`,
      `${SUMMARY_SYMBOLS.stadium} ${matchInfo.location || 'Por definir'}`,
      '',
      '',
    ].join('\n')

    const participantsList = participants
      .map((p, index) => {
        const paymentStatus = p.hasPaid ? SUMMARY_SYMBOLS.paid : SUMMARY_SYMBOLS.pending
        return `${index + 1}. ${p.name} ${paymentStatus}`
      })
      .join('\n')

    const paidCount = participants.filter((p) => p.hasPaid).length
    const totalCount = participants.length
    const unpaidCount = totalCount - paidCount
    const paidLabel = paidCount === 1 ? 'Pagado' : 'Pagados'
    const unpaidLabel = unpaidCount === 1 ? 'Pendiente' : 'Pendientes'

    const footer = [
      '',
      `${SUMMARY_SYMBOLS.chart} Resumen: ${paidCount} ${paidLabel} | ${unpaidCount} ${unpaidLabel}`,
    ].join('\n')

    return `${header}${participantsList}\n${footer}`
  } catch (error) {
    console.error('Error generating payment summary:', error)
    return 'Error al generar el resumen'
  }
}

/**
 * Genera URL de WhatsApp con el resumen
 */
export function getWhatsAppUrl(text: string): string {
  const whatsappUrl = new URL('https://api.whatsapp.com/send')
  whatsappUrl.searchParams.set('text', text)
  return whatsappUrl.toString()
}
