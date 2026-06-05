'use client'

import { useEffect, useState } from 'react'
import { hasSupabaseEnv, supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!hasSupabaseEnv) {
      const timer = setTimeout(() => {
        setUser(null)
        setLoading(false)
      }, 0)
      return () => clearTimeout(timer)
    }

    let mounted = true

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (mounted) {
        setUser(user)
        setLoading(false)
      }
    }

    init()

    return () => { mounted = false }
  }, [])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { data, error }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
  }

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
  }
}
