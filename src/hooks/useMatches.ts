'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

function generateSelfUnregisterToken(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '')
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`
}

function isRpcNotDeployedError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false

  if (error.code === '42883' || error.code === 'PGRST202') {
    return true
  }

  const message = (error.message || '').toLowerCase()
  return message.includes('could not find the function')
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

function normalizeError(error: unknown, fallbackMessage: string): Error {
  if (error instanceof Error) return error

  const candidate = error as {
    message?: string
    details?: string
    hint?: string
    error_description?: string
  } | null

  const message =
    candidate?.message ||
    candidate?.details ||
    candidate?.hint ||
    candidate?.error_description ||
    fallbackMessage

  return new Error(message)
}

function isExpectedRegistrationError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('cupos') ||
    normalized.includes('suplente') ||
    normalized.includes('arquero') ||
    normalized.includes('nombre debe tener') ||
    normalized.includes('no puede superar') ||
    normalized.includes('enlace del partido no es válido') ||
    normalized.includes('ya estás inscrito') ||
    normalized.includes('ya estas inscrito')
  )
}

interface UseMatchesOptions {
  autoFetch?: boolean
  onlyOwnedByCurrentUser?: boolean
}

export interface Match {
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
  source_template_id?: string | null
  source_template?: { id: string; name: string } | null
}

export function useMatches({ autoFetch = false, onlyOwnedByCurrentUser = false }: UseMatchesOptions = {}) {
  const [matches, setMatches] = useState<Match[]>([])
  const [registrationCounts, setRegistrationCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(autoFetch)

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
        .select('id, title, location, date, max_players, created_by, field_cost, rental_cost, has_rented_goalkeepers, rented_goalkeepers_count, players_per_team, created_at, updated_at, source_template_id, source_template:source_template_id(id, name)')
        .order('created_at', { ascending: false })

      if (userId) {
        query = query.eq('created_by', userId)
      }

      const { data, error } = await query

      if (error) throw error
      const transformed = (data || []).map((item) => {
        const raw = item.source_template
        const sourceTemplate = !raw ? null : Array.isArray(raw) ? (raw[0] ?? null) : raw
        return { ...item, source_template: sourceTemplate }
      })
      setMatches(transformed as Match[])

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

  useEffect(() => {
    if (!autoFetch) {
      setLoading(false)
      return
    }

    fetchMatches()
  }, [autoFetch, fetchMatches])

  useEffect(() => {
    if (!autoFetch) return

    const handler = () => {
      fetchMatches()
    }

    window.addEventListener("matches:changed", handler)
    return () => window.removeEventListener("matches:changed", handler)
  }, [autoFetch, fetchMatches])

  const createMatch = async (matchData: Omit<Match, 'id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null, error: new Error('Debes iniciar sesión para crear un partido.') }
      }

      const { data, error } = await supabase
        .from('matches')
        .insert([matchData])
        .select('id, title, location, date, max_players, created_by, created_at, field_cost, rental_cost, has_rented_goalkeepers, rented_goalkeepers_count, players_per_team, source_template_id')
        .single()

      if (error) throw error
      setMatches(prev => [data, ...prev])
      window.dispatchEvent(new CustomEvent("matches:changed"))
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
        .select('id, title, location, date, max_players, created_by, field_cost, rental_cost, has_rented_goalkeepers, rented_goalkeepers_count, players_per_team, source_template_id')
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
        .select('id, name, is_goalkeeper, registered_at, has_paid, paid_at, paid_by, user_id')
        .eq('match_id', matchId)
        .order('registered_at', { ascending: true })

      if (error) throw error
      return { data: data || [], error: null }
    } catch (error) {
      console.error('Error fetching match registrations:', error)
      return { data: [], error }
    }
  }, [])

  const registerForMatch = async (
    matchId: string,
    name: string,
    isGoalkeeper: boolean,
    options?: { trackCurrentUser?: boolean },
  ) => {
    try {
      // Validate inputs
      const normalizedMatchId = matchId.trim()
      if (!isValidUuid(normalizedMatchId)) {
        throw new Error('El enlace del partido no es válido. Verifica que lo copiaste completo.')
      }

      const trimmedName = name.trim()
      if (!trimmedName || trimmedName.length < 2) {
        throw new Error('El nombre debe tener al menos 2 caracteres.')
      }
      if (trimmedName.length > 100) {
        throw new Error('El nombre no puede superar los 100 caracteres.')
      }

      const { data: match, error: matchError } = await supabase
        .rpc('get_public_match_by_id', { p_match_id: normalizedMatchId })
        .maybeSingle()

      if (matchError) throw matchError
      if (!match) {
        throw new Error('Partido no encontrado.')
      }

      const trackCurrentUser = options?.trackCurrentUser ?? false
      const { data: { user } } = await supabase.auth.getUser()

      if (user && !trackCurrentUser) {
        const directInsertResult = await supabase
          .from('match_registrations')
          .insert([{
            match_id: normalizedMatchId,
            name: trimmedName,
            is_goalkeeper: isGoalkeeper,
            user_id: null,
          }])
          .select('id, name, is_goalkeeper, registered_at, has_paid, paid_at, paid_by, user_id')
          .single()

        if (directInsertResult.error) {
          throw directInsertResult.error
        }

        return {
          data: directInsertResult.data,
          error: null,
          selfUnregisterToken: null,
          selfUnregisterAvailable: false,
        }
      }

      // Capacity and role limits are enforced at DB level by trigger/rpc.
      // Avoid duplicating pre-checks in client to prevent stale-count mismatches.

      const selfUnregisterToken = generateSelfUnregisterToken()

      let data: {
        id: string
        name: string
        is_goalkeeper: boolean
        registered_at: string
        has_paid: boolean
        paid_at: string | null
        paid_by: string | null
        user_id: string | null
      } | null = null

      const rpcResult = await supabase
        .rpc('register_for_match_public', {
          p_match_id: normalizedMatchId,
          p_name: trimmedName,
          p_is_goalkeeper: isGoalkeeper,
          p_self_token: selfUnregisterToken,
        })

      if (rpcResult.error) {
        if (!isRpcNotDeployedError(rpcResult.error)) {
          throw rpcResult.error
        }

        // Keep registration working even if secure RPC is unavailable or misconfigured.
        const legacyResult = await supabase
          .from('match_registrations')
          .insert([{
            match_id: normalizedMatchId,
            name: trimmedName,
            is_goalkeeper: isGoalkeeper,
            user_id: trackCurrentUser ? (user?.id ?? null) : null,
          }])
          .select('id, name, is_goalkeeper, registered_at, has_paid, paid_at, paid_by, user_id')
          .single()

        if (legacyResult.error) {
          throw legacyResult.error
        }

        data = legacyResult.data
        return {
          data,
          error: null,
          selfUnregisterToken: null,
          selfUnregisterAvailable: false,
        }
      }

      const rpcData = Array.isArray(rpcResult.data)
        ? (rpcResult.data[0] ?? null)
        : rpcResult.data

      data = rpcData

      if (!data) {
        throw new Error('No se pudo crear la inscripción.')
      }

      return {
        data,
        error: null,
        selfUnregisterToken,
        selfUnregisterAvailable: true,
      }
    } catch (error) {
      const normalizedError = normalizeError(error, 'No se pudo completar la inscripción.')
      if (isExpectedRegistrationError(normalizedError.message)) {
        console.info('Registration rejected by business rules:', normalizedError.message)
      } else {
        console.error('Error registering for match:', normalizedError)
      }
      return {
        data: null,
        error: normalizedError,
        selfUnregisterToken: null,
        selfUnregisterAvailable: false,
      }
    }
  }

  const unregisterSelfFromMatch = async (
    registrationId: string,
    selfUnregisterToken: string,
  ) => {
    try {
      const { data, error } = await supabase.rpc('unregister_self_from_match', {
        p_registration_id: registrationId,
        p_self_token: selfUnregisterToken,
      })

      if (error) {
        if (isRpcNotDeployedError(error)) {
          throw new Error('La opción de auto-baja segura no está habilitada aún en la base de datos.')
        }

        throw error
      }

      if (data !== true) {
        throw new Error('No fue posible validar tu auto-baja. Verifica que uses el mismo dispositivo con el que te inscribiste.')
      }

      return { error: null }
    } catch (error) {
      console.error('Error unregistering self from match:', error)
      return { error }
    }
  }

  const unregisterFromMatch = async (registrationId: string) => {
    try {
      if (typeof registrationId !== 'string') {
        throw new Error('La inscripción no es válida para realizar la baja.')
      }

      const normalizedRegistrationId = registrationId.trim()
      if (!isValidUuid(normalizedRegistrationId)) {
        throw new Error('La inscripción no es válida para realizar la baja.')
      }

      const { data, error } = await supabase
        .from('match_registrations')
        .delete()
        .eq('id', normalizedRegistrationId)
        .select('id')
        .maybeSingle()

      if (error) throw error
      if (!data) {
        throw new Error('No se encontró la inscripción o ya fue eliminada.')
      }
      return { error: null }
    } catch (error) {
      const normalizedError = normalizeError(error, 'No se pudo completar la baja del partido.')
      console.warn('Unregister rejected:', normalizedError.message)
      return { error: normalizedError }
    }
  }

  const clearMatchRegistrations = async (matchId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { error: new Error('Debes iniciar sesión para realizar esta acción.') }
      }

      const { data: ownedMatch, error: ownedMatchError } = await supabase
        .from('matches')
        .select('id')
        .eq('id', matchId)
        .eq('created_by', user.id)
        .maybeSingle()

      if (ownedMatchError) throw ownedMatchError
      if (!ownedMatch) {
        return { error: new Error('No tienes permiso para eliminar los inscritos de este partido.') }
      }

      const { error } = await supabase
        .from('match_registrations')
        .delete()
        .eq('match_id', matchId)

      if (error) throw error
      return { error: null }
    } catch (error) {
      console.error('Error clearing match registrations:', error)
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

  const togglePaymentStatus = async (registrationId: string, hasPaid: boolean) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return { data: null, error: new Error('Debes iniciar sesión para realizar esta acción.') }
      }

      const { data, error } = await supabase
        .from('match_registrations')
        .update({
          has_paid: hasPaid,
          paid_at: hasPaid ? new Date().toISOString() : null,
          paid_by: hasPaid ? user.id : null,
        })
        .eq('id', registrationId)
        .select('id, name, is_goalkeeper, registered_at, has_paid, paid_at, paid_by')
        .single()

      if (error) throw error
      return { data, error: null }
    } catch (error) {
      console.error('Error updating payment status:', error)
      return { data: null, error }
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
    unregisterSelfFromMatch,
    unregisterFromMatch,
    clearMatchRegistrations,
    deleteMatch,
    registerRentedGoalkeepers,
    togglePaymentStatus,
    refetch: fetchMatches,
  }
}
