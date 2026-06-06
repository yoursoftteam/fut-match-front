'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Pool, PoolCompetitionType } from '@/types/bet'

interface PoolWithMemberCount extends Pool {
  member_count: number
}

interface UsePoolsOptions {
  competitionType?: PoolCompetitionType
  redirectOnUnauth?: boolean
}

interface UsePoolsReturn {
  pools: PoolWithMemberCount[]
  loading: boolean
  joinByCode: (code: string) => Promise<{ success: boolean; error?: string }>
  joinLoading: boolean
  joinError: string | null
  clearJoinError: () => void
  refetch: () => void
}

export function usePools(options: UsePoolsOptions = {}): UsePoolsReturn {
  const { competitionType = 'pool', redirectOnUnauth = true } = options
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [pools, setPools] = useState<PoolWithMemberCount[]>([])
  const [loading, setLoading] = useState(true)
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const clearJoinError = useCallback(() => setJoinError(null), [])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setLoading(false)
      if (redirectOnUnauth) {
        const returnTo = encodeURIComponent(window.location.pathname)
        router.replace(`/auth?mode=signin&redirect_to=${returnTo}`)
      }
      return
    }

    let cancelled = false

    setLoading(true)

    supabase.auth.getSession().then((session) => {
      if (cancelled) return
      const token = session.data.session?.access_token
      if (!token) {
        setLoading(false)
        return
      }

      const params = new URLSearchParams({ competition_type: competitionType })
      fetch(`/api/v1/bet/pools?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.ok ? res.json() : null)
        .then((payload) => {
          if (cancelled) return
          if (payload?.success) {
            setPools(payload.data.pools)
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    })

    return () => { cancelled = true }
  }, [user, authLoading, router, competitionType, redirectOnUnauth])

  const refetch = useCallback(() => {
    if (!user) return

    setLoading(true)

    supabase.auth.getSession().then((session) => {
      const token = session.data.session?.access_token
      if (!token) {
        setLoading(false)
        return
      }

      const params = new URLSearchParams({ competition_type: competitionType })
      fetch(`/api/v1/bet/pools?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.ok ? res.json() : null)
        .then((payload) => {
          if (payload?.success) {
            setPools(payload.data.pools)
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    })
  }, [user, competitionType])

  const joinByCode = useCallback(async (code: string) => {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length !== 10) {
      const msg = 'El código debe tener 10 caracteres'
      setJoinError(msg)
      return { success: false, error: msg }
    }

    setJoinLoading(true)
    setJoinError(null)

    try {
      const session = await supabase.auth.getSession()
      const token = session.data.session?.access_token

      if (!token) {
        const msg = 'Debes iniciar sesión'
        setJoinError(msg)
        return { success: false, error: msg }
      }

      const res = await fetch('/api/v1/bet/pools/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invite_code: trimmed }),
      })

      const payload = await res.json()

      if (!res.ok || !payload.success) {
        const msg =
          payload.error?.message === 'Pool not found'
            ? 'Código inválido. Verifica e intenta de nuevo.'
            : payload.error?.message === 'User is already a member of this pool'
            ? 'Ya eres miembro de esta polla'
            : payload.error?.message || 'Error al unirse'
        setJoinError(msg)
        return { success: false, error: msg }
      }

      router.push(payload.data.next)
      return { success: true }
    } catch {
      const msg = 'Error de conexión. Intenta de nuevo.'
      setJoinError(msg)
      return { success: false, error: msg }
    } finally {
      setJoinLoading(false)
    }
  }, [router])

  return {
    pools,
    loading,
    joinByCode,
    joinLoading,
    joinError,
    clearJoinError,
    refetch,
  }
}
