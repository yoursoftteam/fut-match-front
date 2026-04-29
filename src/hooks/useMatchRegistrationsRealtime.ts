'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface PlayerRegistration {
  id: string
  name: string
  is_goalkeeper: boolean
  registered_at: string
}

export function useMatchRegistrationsRealtime(matchId: string) {
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('[Realtime] Inicializando hook para matchId:', matchId)

    // Cargar datos iniciales
    const loadInitialData = async () => {
      try {
        setLoading(true)
        setError(null)
        console.log('[Realtime] Cargando datos iniciales...')
        const { data, error: fetchError } = await supabase
          .from('match_registrations')
          .select('*')
          .eq('match_id', matchId)
          .order('registered_at', { ascending: true })

        if (fetchError) throw fetchError
        console.log('[Realtime] Datos iniciales cargados:', data?.length || 0, 'registros')
        setRegistrations(data || [])
      } catch (err) {
        console.error('[Realtime] Error loading registrations:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }

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

    // Suscripción realtime
    console.log('[Realtime] Creando canal:', channelName)
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

          console.log('[Realtime] 🎉 EVENTO RECIBIDO!', payload.eventType)
          console.log('[Realtime] Payload completo:', payload)

          if (payload.eventType === 'INSERT') {
            const newReg = newData as PlayerRegistration
            console.log('[Realtime] ➕ Agregando nuevo jugador:', newReg.name)
            setRegistrations((prev) => [...prev, newReg])
          } else if (payload.eventType === 'DELETE') {
            const oldReg = oldData as PlayerRegistration
            console.log('[Realtime] ➖ Eliminando jugador ID:', oldReg.id)
            setRegistrations((prev) => prev.filter((reg) => reg.id !== oldReg.id))
          } else if (payload.eventType === 'UPDATE') {
            const updatedReg = newData as PlayerRegistration
            console.log('[Realtime] ✏️ Actualizando jugador:', updatedReg.name)
            setRegistrations((prev) =>
              prev.map((reg) => (reg.id === updatedReg.id ? updatedReg : reg))
            )
          }
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Estado de suscripción:', status)
      })

    // Limpiar suscripción
    return () => {
      console.log('[Realtime] Limpiando suscripción para:', matchId)
      supabase.removeChannel(channel)
    }
  }, [matchId])

  return {
    registrations,
    loading,
    error
  }
}
