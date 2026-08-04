import { useEffect, useRef } from 'react'
import * as Linking from 'expo-linking'
import { useRouter } from 'expo-router'
import { createSessionFromUrl, verifyOtpFromUrl, getInviteCodeFromUrl } from '@/lib/auth-links'
import { setPendingInvite } from '@/lib/storage'

export function useAuthLinks() {
  const router = useRouter()
  const processedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const handleUrl = async (url: string) => {
      const inviteCode = getInviteCodeFromUrl(url)
      if (inviteCode) {
        await setPendingInvite(inviteCode.toUpperCase())
        router.replace('/(auth)/login')
        return
      }

      if (processedRef.current.has(url)) return
      processedRef.current.add(url)

      const sessionResult = await createSessionFromUrl(url)
      if (sessionResult.handled) {
        router.replace(sessionResult.error ? '/(auth)/login' : '/(app)')
        return
      }

      const otpResult = await verifyOtpFromUrl(url)
      if (otpResult.handled) {
        if (otpResult.error) {
          router.replace('/(auth)/login')
        } else if (otpResult.kind === 'recovery') {
          router.replace('/(auth)/reset')
        } else {
          router.replace('/(app)')
        }
      }
    }

    Linking.getInitialURL().then((url) => {
      if (url) handleUrl(url)
    })

    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleUrl(url)
    })

    return () => subscription.remove()
  }, [router])
}
