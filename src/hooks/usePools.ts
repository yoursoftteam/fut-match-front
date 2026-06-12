'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import type { Pool, PoolCompetitionType } from '@/types/bet'

const PAGE_SIZE = 20

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
  hasMore: boolean
  loadingMore: boolean
  totalCount: number
  loadMore: () => void
  joinByCode: (code: string) => Promise<{ success: boolean; error?: string }>
  joinLoading: boolean
  joinError: string | null
  clearJoinError: () => void
  refetch: () => void
}

function fetchPage(page: number, competitionType: PoolCompetitionType): Promise<{
  pools: PoolWithMemberCount[]
  total_count: number
}> {
  return supabase.auth.getSession().then((session) => {
    const token = session.data.session?.access_token
    if (!token) return { pools: [], total_count: 0 }

    const params = new URLSearchParams({
      competition_type: competitionType,
      page: String(page),
      limit: String(PAGE_SIZE),
    })
    return fetch(`/api/v1/bet/pools?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.ok ? res.json() : null)
      .then((payload) => payload?.success
        ? { pools: payload.data.pools ?? [], total_count: payload.data.total_count ?? 0 }
        : { pools: [], total_count: 0 }
      )
  })
}

export function usePools(options: UsePoolsOptions = {}): UsePoolsReturn {
  const { competitionType = 'pool', redirectOnUnauth = true } = options
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [pools, setPools] = useState<PoolWithMemberCount[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const clearJoinError = useCallback(() => setJoinError(null), [])

  const hasMore = page * PAGE_SIZE < totalCount

  const loadPage = useCallback(async (pageNum: number, append: boolean) => {
    const result = await fetchPage(pageNum, competitionType)

    if (append) {
      setPools((prev) => {
        const existing = new Set(prev.map((p) => p.id))
        const newPools = result.pools.filter((p) => !existing.has(p.id))
        return [...prev, ...newPools]
      })
    } else {
      setPools(result.pools)
    }
    setTotalCount(result.total_count)
    setPage(pageNum)
  }, [competitionType])

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

    setLoading(true)

    loadPage(1, false).finally(() => {
      setLoading(false)
    })
  }, [user, authLoading, router, loadPage, redirectOnUnauth])

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const nextPage = page + 1
    loadPage(nextPage, true).finally(() => {
      setLoadingMore(false)
    })
  }, [loadingMore, hasMore, page, loadPage])

  const refetch = useCallback(() => {
    if (!user) return

    setLoading(true)

    loadPage(1, false).finally(() => {
      setLoading(false)
    })
  }, [user, loadPage])

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
    hasMore,
    loadingMore,
    totalCount,
    loadMore,
    joinByCode,
    joinLoading,
    joinError,
    clearJoinError,
    refetch,
  }
}
