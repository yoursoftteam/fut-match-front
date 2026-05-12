import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey)

type SupabaseBrowserClient = SupabaseClient

let cachedClient: SupabaseBrowserClient | null = null

function createClient(): SupabaseBrowserClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
    global: {
      headers: {
        'X-Client-Info': 'parti2-app',
      },
    },
  })
}

export function getSupabaseClient(): SupabaseBrowserClient {
  if (!cachedClient) {
    cachedClient = createClient()
  }

  return cachedClient
}

export const supabase = new Proxy({} as SupabaseBrowserClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseClient(), prop, receiver)
  },
})
