'use client'

import { useEffect, useState } from 'react'
import { hasSupabaseEnv, supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [adminLoaded, setAdminLoaded] = useState(false)

  useEffect(() => {
    if (!hasSupabaseEnv()) {
      const timer = setTimeout(() => {
        setUser(null)
        setLoading(false)
        setIsAdmin(false)
        setAdminLoaded(true)
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (mounted) {
          setUser(session?.user ?? null)
          setLoading(false)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (!user) {
      setIsAdmin(false)
      setAdminLoaded(true)
      return
    }
    supabase
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          setIsAdmin(user.id === process.env.NEXT_PUBLIC_ADMIN_USER_ID)
        } else {
          setIsAdmin(!!data)
        }
        setAdminLoaded(true)
      })
  }, [user])

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
    isAdmin,
    adminLoaded,
    signIn,
    signUp,
    signOut,
  }
}
