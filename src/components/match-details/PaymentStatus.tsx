'use client'

import { CircleCheckBig, Clock } from 'lucide-react'
import { usePaymentManager } from '@/hooks/usePaymentManager'
import { useMatchDetailsContext } from '@/contexts/MatchDetailsContext'

interface PaymentStatusProps {
  registrationId: string
  hasPaid: boolean
  name: string
  disabled?: boolean
}

export function PaymentStatus({
  registrationId,
  hasPaid,
  name,
  disabled = false,
}: PaymentStatusProps) {
  const { isCreator } = useMatchDetailsContext()
  const { updatePaymentStatus } = usePaymentManager()

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isCreator || disabled) return
    await updatePaymentStatus(registrationId, hasPaid)
  }

  if (!isCreator) {
    return hasPaid ? (
      <div
        className="flex items-center gap-1 rounded px-2 py-1 bg-green-900/30 text-green-400"
        title="Pagado"
      >
        <CircleCheckBig size={16} aria-hidden />
        <span className="text-xs font-medium">Pagado</span>
      </div>
    ) : null
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={disabled}
      className={`flex items-center gap-1 rounded px-2 py-1 transition ${
        hasPaid
          ? 'bg-green-900/40 text-green-400 hover:bg-green-900/50'
          : 'bg-muted text-muted-foreground hover:bg-muted border border-border'
      } ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      title={hasPaid ? `Marcar a ${name} como no pagado` : `Marcar a ${name} como pagado`}
      aria-label={`Estado de pago: ${hasPaid ? 'Pagado' : 'Pendiente'}`}
    >
      {hasPaid ? (
        <CircleCheckBig size={16} aria-hidden />
      ) : (
        <Clock size={16} aria-hidden />
      )}
      <span className="text-xs font-medium">
        {hasPaid ? 'Pagado' : 'Pendiente'}
      </span>
    </button>
  )
}
