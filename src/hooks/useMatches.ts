'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

interface Match {
  id: string
  title: string
  location: string
  date: string
  max_players: number
  created_by: string
}

interface MatchRegistration {
  id: string
  match_id: string
  name: string
  is_goalkeeper: boolean
  registered_at: string
}

export function useMatches() {
  const [matches, setMatches] = useState<Match[]>([])
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMatches()
  }, [])

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setMatches(data || [])

      // Fetch registration counts for all matches in one query
      if (data && data.length > 0) {
        const { data: countData } = await supabase
          .from('match_registrations')
          .select('match_id')

        if (countData) {
          const counts: Record<string, number> = {}
          countData.forEach(({ match_id }) => {
            counts[match_id] = (counts[match_id] || 0) + 1
          })
          setRegistrationCounts(counts)
        }
      }
    } catch (error) {
      console.error('Error fetching matches:', error)
    } finally {
      setLoading(false)
    }
  }

  const createMatch = async (matchData: Omit<Match, 'id'>) => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .insert([matchData])
        .select()
        .single()

      if (error) throw error
      setMatches(prev => [data, ...prev])
      return { data, error: null }
    } catch (error) {
      console.error('Error creating match:', error)
      return { data: null, error }
    }
  }

  const getMatchById = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching match:', error)
      return { data: null, error }
    }
  }, [])

  const getMatchRegistrations = useCallback(async (matchId: string) => {
    try {
      const { data, error } = await supabase
        .from('match_registrations')
        .select('*')
        .eq('match_id', matchId)
        .order('registered_at', { ascending: true })

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      console.error('Error fetching match registrations:', error)
      return { data: [], error }
    }
  }, [])

  const registerForMatch = async (matchId: string, name: string, isGoalkeeper: boolean) => {
    try {
      console.log('[DB] INSERT match_registrations:', { matchId, name, isGoalkeeper })

      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('max_players')
        .eq('id', matchId)
        .single()

      if (matchError) throw matchError

      const maxPlayers = match?.max_players ?? 0
      const reservedGoalkeeperSlots = Math.min(2, maxPlayers)
      const maxFieldPlayers = Math.max(0, maxPlayers - reservedGoalkeeperSlots)

      const { data: currentRegistrations, error: registrationsError } = await supabase
        .from('match_registrations')
        .select('is_goalkeeper')
        .eq('match_id', matchId)

      if (registrationsError) throw registrationsError

      const registrations = currentRegistrations || []
      const currentGoalkeepers = registrations.filter((registration) => registration.is_goalkeeper).length
      const currentFieldPlayers = registrations.length - currentGoalkeepers

      if (isGoalkeeper) {
        if (currentGoalkeepers >= reservedGoalkeeperSlots) {
          throw new Error('Ya se completaron los cupos de arqueros (máximo 2).')
        }
      } else {
        if (currentFieldPlayers >= maxFieldPlayers) {
          throw new Error('Los cupos de jugadores de campo están completos. Se reservan 2 cupos para arqueros.')
        }
      }

      if (registrations.length >= maxPlayers) {
        throw new Error('El partido ya está completo.')
      }

      const { data, error } = await supabase
        .from('match_registrations')
        .insert([{ match_id: matchId, name, is_goalkeeper: isGoalkeeper }])
        .select()
        .single()

      if (error) throw error
      console.log('[DB] ✅ INSERT exitoso:', data)
      return { data, error: null }
    } catch (error) {
      console.error('[DB] ❌ Error INSERT:', error)
      return { data: null, error }
    }
  }

  const unregisterFromMatch = async (registrationId: string) => {
    try {
      console.log('[DB] DELETE match_registrations ID:', registrationId)
      const { error } = await supabase
        .from('match_registrations')
        .delete()
        .eq('id', registrationId)

      if (error) throw error
      console.log('[DB] ✅ DELETE exitoso')
      return { error: null }
    } catch (error) {
      console.error('[DB] ❌ Error DELETE:', error)
      return { error }
    }
  }

  return {
    matches,
    loading,
    registrationCounts,
    createMatch,
    getMatchById,
    getMatchRegistrations,
    registerForMatch,
    unregisterFromMatch,
    refetch: fetchMatches,
  }
}