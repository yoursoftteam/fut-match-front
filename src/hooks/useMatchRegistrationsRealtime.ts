'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface PlayerRegistration {
  id: string
  name: string
  is_goalkeeper: boolean
  registered_at: string
  has_paid: boolean
  paid_at: string | null
  paid_by: string | null
  user_id: string | null
  position?: string | null
}

function dedupeRegistrationsById(items: PlayerRegistration[]): PlayerRegistration[] {
  const byId = new Map<string, PlayerRegistration>()
  for (const item of items) {
    byId.set(item.id, item)
  }
  return Array.from(byId.values()).sort((a, b) =>
    new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime()
  )
}

async function resolvePositions(registrations: PlayerRegistration[]): Promise<PlayerRegistration[]> {
  const userIds = registrations
    .filter((r) => r.user_id && !r.position)
    .map((r) => r.user_id)
    .filter(Boolean) as string[]

  if (userIds.length === 0) return registrations

  try {
    const { data, error } = await supabase
      .rpc('resolve_registration_positions', { p_user_ids: userIds })

    if (error || !data) return registrations

    const posMap = new Map<string, string>()
    const rows = data as Array<{ user_id: string; position: string }>
    for (const row of rows) {
      if (row.position) posMap.set(row.user_id, row.position)
    }

    return registrations.map((r) => {
      if (!r.position && r.user_id && posMap.has(r.user_id)) {
        return { ...r, position: posMap.get(r.user_id) }
      }
      return r
    })
  } catch {
    return registrations
  }
}

export function useMatchRegistrationsRealtime(matchId: string) {
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const { data, error: fetchError } = await supabase
        .from('match_registrations')
        .select('*')
        .eq('match_id', matchId)
        .order('registered_at', { ascending: true })

      if (fetchError) throw fetchError
      const resolved = await resolvePositions(data || [])
      setRegistrations(dedupeRegistrationsById(resolved))
    } catch (err) {
      console.error('[Realtime] Error loading registrations:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [matchId])

  useEffect(() => {
    loadInitialData()

    const channelName = `match_registrations:${matchId}`

    // Limpiar canales viejos del mismo match (evita CHANNEL_ERROR con HMR)
    const existingChannels = supabase
      .getChannels()
      .filter((ch) => ch.topic === `realtime:${channelName}`)

    existingChannels.forEach((ch) => {
      console.log('[Realtime] Removiendo canal previo:', ch.topic)
      supabase.removeChannel(ch)
    })

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_registrations',
          filter: `match_id=eq.${matchId}`,
        },
        (payload) => {
          const newData = payload.new as unknown
          const oldData = payload.old as unknown

          if (payload.eventType === 'INSERT') {
            const rawReg = newData as PlayerRegistration
            const resolveAndAdd = async () => {
              const resolved = (await resolvePositions([rawReg]))[0] ?? rawReg
              setRegistrations((prev) => {
                if (prev.some((reg) => reg.id === resolved.id)) {
                  return prev
                }
                return dedupeRegistrationsById([...prev, resolved])
              })
            }
            void resolveAndAdd()
          } else if (payload.eventType === 'DELETE') {
            const oldReg = oldData as PlayerRegistration
            if (oldReg?.id) {
              setRegistrations((prev) => prev.filter((reg) => reg.id !== oldReg.id))
            } else {
              void loadInitialData()
            }
          } else if (payload.eventType === 'UPDATE') {
            const rawUpdated = newData as PlayerRegistration
            const resolveAndUpdate = async () => {
              const resolved = (await resolvePositions([rawUpdated]))[0] ?? rawUpdated
              setRegistrations((prev) =>
                dedupeRegistrationsById(
                  prev.some((reg) => reg.id === resolved.id)
                    ? prev.map((reg) => (reg.id === resolved.id ? resolved : reg))
                    : [...prev, resolved]
                )
              )
            }
            void resolveAndUpdate()
          }
        }
      )
      .subscribe()

    // Limpiar suscripción
    return () => {
      supabase.removeChannel(channel)
    }
  }, [matchId, loadInitialData])

  return {
    registrations,
    loading,
    error,
    refreshRegistrations: loadInitialData,
  }
}
