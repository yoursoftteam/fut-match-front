import { useEffect, useRef } from 'react'
import { useRouter } from 'expo-router'
import { supabase } from '@/lib/supabase'
import { getPendingInvite, clearPendingInvite } from '@/lib/storage'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? ''

export function usePendingInviteBridge() {
  const router = useRouter()
  const processedRef = useRef(false)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        processedRef.current = false
        return
      }

      if (event !== 'SIGNED_IN' || !session || processedRef.current) return
      processedRef.current = true

      const inviteCode = await getPendingInvite()
      if (!inviteCode) return

      if (!API_URL) return

      try {
        const response = await fetch(`${API_URL}/api/v1/bet/pools/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ invite_code: inviteCode }),
        })
        const payload = await response.json()
        if (payload.success) {
          await clearPendingInvite()
          router.replace(payload.data.next)
        }
      } catch {
        /* ignore */
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])
}
