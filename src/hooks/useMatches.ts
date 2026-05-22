'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

const MAX_SUBSTITUTE_SLOTS = 5

interface UseMatchesOptions {
  autoFetch?: boolean
  onlyOwnedByCurrentUser?: boolean
}

interface Match {
  id: string
  title: string
  location: string
  date: string
  created_at?: string
  updated_at?: string
  max_players: number
  created_by: string
  field_cost: number
  rental_cost: number
  has_rented_goalkeepers: boolean
  rented_goalkeepers_count: number
  players_per_team: number
}

export function useMatches({ autoFetch = false, onlyOwnedByCurrentUser = false }: UseMatchesOptions = {}) {
  const [matches, setMatches] = useState<Match[]>([])
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(autoFetch)

  useEffect(() => {
    if (!autoFetch) {
      setLoading(false)
      return
    }

    fetchMatches()
  }, [autoFetch])

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true)

      let userId: string | null = null
      if (onlyOwnedByCurrentUser) {
        const { data: { user } } = await supabase.auth.getUser()
        userId = user?.id ?? null

        if (!userId) {
          setMatches([])
          setRegistrationCounts({})
          return
        }
      }

      let query = supabase
        .from('matches')
        .select('id, title, location, date, max_players, created_by, field_cost, rental_cost, has_rented_goalkeepers, rented_goalkeepers_count, players_per_team, created_at, updated_at')
        .order('created_at', { ascending: false })

      if (userId) {
        query = query.eq('created_by', userId)
      }

      const { data, error } = await query

      if (error) throw error
      setMatches(data || [])

      // Fetch registration counts for all matches in one query
      if (data && data.length > 0) {
        const matchIds = data.map(({ id }) => id)
        const { data: countData } = await supabase
          .from('match_registrations')
          .select('match_id')
          .in('match_id', matchIds)

        if (countData) {
          const counts: Record<string, number> = {}
          countData.forEach(({ match_id }) => {
            counts[match_id] = (counts[match_id] || 0) + 1
          })
          setRegistrationCounts(counts)
        }
      } else {
        setRegistrationCounts({})
      }
    } catch (error) {
      console.error('Error fetching matches:', error)
    } finally {
      setLoading(false)
    }
  }, [onlyOwnedByCurrentUser])

  const createMatch = async (matchData: Omit<Match, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null, error: new Error('Debes iniciar sesión para crear un partido.') }
      }

      const { data, error } = await supabase
        .from('matches')
        .insert([matchData])
        .select('id, title, location, date, max_players, created_by, created_at, field_cost, rental_cost, has_rented_goalkeepers, rented_goalkeepers_count, players_per_team')
        .single()

      if (error) throw error
      setMatches(prev => [data, ...prev])
      return { data, error: null }
    } catch (error) {
      console.error('Error creating match:', error)
      return { data: null, error }
    }
  }

  const updateMatch = async (
    matchId: string,
    updates: Partial<Pick<Match, 'title' | 'location' | 'date' | 'max_players' | 'field_cost' | 'rental_cost' | 'has_rented_goalkeepers' | 'rented_goalkeepers_count' | 'players_per_team'>>,
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null, error: new Error('Debes iniciar sesión para editar un partido.') }
      }

      // Verify ownership before updating
      const { data: existing, error: fetchError } = await supabase
        .from('matches')
        .select('created_by')
        .eq('id', matchId)
        .single()

      if (fetchError) throw fetchError

      if (existing.created_by !== user.id) {
        return { data: null, error: new Error('No tienes permiso para editar este partido.') }
      }

      const { data, error } = await supabase
        .from('matches')
        .update(updates)
        .eq('id', matchId)
        .eq('created_by', user.id)
        .select('id, title, location, date, max_players, created_by, field_cost, rental_cost, has_rented_goalkeepers, rented_goalkeepers_count, players_per_team')
        .single()

      if (error) throw error

      setMatches(prev => prev.map((match) => (match.id === matchId ? data : match)))

      return { data, error: null }
    } catch (error) {
      console.error('Error updating match:', error)
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

  const getPublicMatchById = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_public_match_by_id', { p_match_id: id })
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error fetching public match:', error)
      return { data: null, error }
    }
  }, [])

  const getMatchRegistrations = useCallback(async (matchId: string) => {
    try {
      const { data, error } = await supabase
        .from('match_registrations')
        .select('id, name, is_goalkeeper, registered_at')
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
      // Validate inputs
      const trimmedName = name.trim()
      if (!trimmedName || trimmedName.length < 2) {
        throw new Error('El nombre debe tener al menos 2 caracteres.')
      }
      if (trimmedName.length > 100) {
        throw new Error('El nombre no puede superar los 100 caracteres.')
      }

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
      const isSubstituteSlot = registrations.length >= maxPlayers

      if (registrations.length >= maxPlayers + MAX_SUBSTITUTE_SLOTS) {
        throw new Error('No hay cupos disponibles, ni siquiera como suplente.')
      }

      if (!isSubstituteSlot) {
        if (isGoalkeeper) {
          if (currentGoalkeepers >= reservedGoalkeeperSlots) {
            throw new Error('Ya se completaron los cupos de arqueros (máximo 2).')
          }
        } else {
          if (currentFieldPlayers >= maxFieldPlayers) {
            throw new Error('Los cupos de jugadores de campo están completos. Se reservan 2 cupos para arqueros.')
          }
        }
      }

      const { data, error } = await supabase
        .from('match_registrations')
        .insert([{ match_id: matchId, name: trimmedName, is_goalkeeper: isGoalkeeper }])
        .select('id, name, is_goalkeeper, registered_at')
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error registering for match:', error)
      return { data: null, error }
    }
  }

  const unregisterFromMatch = async (registrationId: string) => {
    try {
      const { error } = await supabase
        .from('match_registrations')
        .delete()
        .eq('id', registrationId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error unregistering from match:', error)
      return { error }
    }
  }

  const deleteMatch = async (matchId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { error: new Error('Debes iniciar sesión para eliminar un partido.') }
      }

      await supabase
        .from('match_templates')
        .delete()
        .eq('match_id', matchId)
        .eq('user_id', user.id)

      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId)
        .eq('created_by', user.id)

      if (error) throw error

      setMatches(prev => prev.filter((match) => match.id !== matchId))
      setRegistrationCounts(prev => {
        const next = { ...prev }
        delete next[matchId]
        return next
      })

      return { error: null }
    } catch (error) {
      console.error('Error deleting match:', error)
      return { error }
    }
  }

  const registerRentedGoalkeepers = async (matchId: string, count: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { error: new Error('Debes iniciar sesión para realizar esta acción.') }
      }

      // Verify ownership
      const { data: existing, error: fetchError } = await supabase
        .from('matches')
        .select('created_by')
        .eq('id', matchId)
        .single()

      if (fetchError) throw fetchError

      if (existing.created_by !== user.id) {
        return { error: new Error('No tienes permiso para modificar este partido.') }
      }

      // Get existing rented goalkeeper registrations
      const { data: existingRegistrations, error: fetchRegError } = await supabase
        .from('match_registrations')
        .select('id')
        .eq('match_id', matchId)
        .ilike('name', 'Arquero Alquilado%')

      if (fetchRegError) throw fetchRegError

      const existingCount = existingRegistrations?.length || 0

      // If we need fewer, delete the extras
      if (existingCount > count) {
        const toDelete = existingRegistrations?.slice(count) || []
        for (const reg of toDelete) {
          await supabase
            .from('match_registrations')
            .delete()
            .eq('id', reg.id)
        }
      }

      // If we need more, add them
      if (existingCount < count) {
        const toAdd = count - existingCount
        const newRegistrations = Array.from({ length: toAdd }, (_, i) => ({
          match_id: matchId,
          name: `Arquero Alquilado ${existingCount + i + 1}`,
          is_goalkeeper: true,
        }))

        const { error: insertError } = await supabase
          .from('match_registrations')
          .insert(newRegistrations)

        if (insertError) throw insertError
      }

      return { error: null }
    } catch (error) {
      console.error('Error registering rented goalkeepers:', error)
      return { error }
    }
  }

  return {
    matches,
    loading,
    registrationCounts,
    createMatch,
    updateMatch,
    getMatchById,
    getPublicMatchById,
    getMatchRegistrations,
    registerForMatch,
    unregisterFromMatch,
    deleteMatch,
    registerRentedGoalkeepers,
    refetch: fetchMatches,
  }
}
