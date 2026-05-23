'use client'

import { useMemo } from 'react'
import { useMatchDetailsContext } from '@/contexts/MatchDetailsContext'
import { generatePaymentSummary } from '@/lib/payment-summary'
import { ShareActions } from '@/components/ShareLink'

export function PaymentSummary() {
  const { matchData, registrations } = useMatchDetailsContext()

  const summary = useMemo(() => {
    if (!matchData) return ''

    const participants = registrations.map((reg) => ({
      name: reg.name,
      hasPaid: reg.has_paid,
    }))

    return generatePaymentSummary(
      {
        title: matchData.title,
        date: matchData.date,
        location: matchData.location,
      },
      participants
    )
  }, [matchData, registrations])

  if (!matchData || registrations.length === 0) {
    return null
  }

  return (
    <ShareActions
      title="Compartir resumen de pagos"
      copyText={summary}
      copyTooltip="Copiar resumen"
      copiedStatusText="Resumen de pagos copiado al portapapeles"
      whatsappText={summary}
      emailSubject={`Resumen de pagos - ${matchData.title}`}
      emailBody={summary}
      nativeShare={{
        title: 'Resumen de pagos',
        text: summary,
      }}
    />
  )
}
