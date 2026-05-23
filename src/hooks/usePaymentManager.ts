'use client'

import { useState, useCallback } from 'react'
import { useMatches } from '@/hooks/useMatches'
import { useMatchDetailsContext } from '@/contexts/MatchDetailsContext'

export interface PaymentState {
  registrationId: string
  hasPaid: boolean
  loading: boolean
  error: string | null
}

export function usePaymentManager() {
  const { togglePaymentStatus } = useMatches()
  const { isCreator } = useMatchDetailsContext()
  const [paymentStates, setPaymentStates] = useState<Record<string, PaymentState>>({})

  const updatePaymentStatus = useCallback(
    async (registrationId: string, currentHasPaid: boolean) => {
      if (!isCreator) {
        console.warn('Only match creator can update payment status')
        return
      }

      const newHasPaid = !currentHasPaid
      setPaymentStates((prev) => ({
        ...prev,
        [registrationId]: {
          registrationId,
          hasPaid: newHasPaid,
          loading: true,
          error: null,
        },
      }))

      try {
        const { error } = await togglePaymentStatus(registrationId, newHasPaid)

        if (error) {
          throw error
        }

        setPaymentStates((prev) => ({
          ...prev,
          [registrationId]: {
            registrationId,
            hasPaid: newHasPaid,
            loading: false,
            error: null,
          },
        }))
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error al actualizar el estado de pago'
        setPaymentStates((prev) => ({
          ...prev,
          [registrationId]: {
            registrationId,
            hasPaid: currentHasPaid,
            loading: false,
            error: errorMessage,
          },
        }))
      }
    },
    [isCreator, togglePaymentStatus]
  )

  const getPaymentState = useCallback(
    (registrationId: string): PaymentState => {
      return (
        paymentStates[registrationId] || {
          registrationId,
          hasPaid: false,
          loading: false,
          error: null,
        }
      )
    },
    [paymentStates]
  )

  return {
    updatePaymentStatus,
    getPaymentState,
  }
}
