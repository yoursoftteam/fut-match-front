import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

type SupabaseBrowserClient = SupabaseClient

let cachedClient: SupabaseBrowserClient | null = null

const cloudflareContextSymbol = Symbol.for('__cloudflare-context__')

function getCloudflareEnv(name: string): string | undefined {
  try {
    const ctx = (globalThis as Record<symbol, unknown>)[cloudflareContextSymbol] as
      | { env: Record<string, string> }
      | undefined
    return ctx?.env?.[name]
  } catch {
    return undefined
  }
}

function getSupabaseUrl(): string {
  const cfUrl = getCloudflareEnv('NEXT_PUBLIC_SUPABASE_URL')
  if (cfUrl) return cfUrl
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL
  }
  return ''
}

function getSupabaseAnonKey(): string {
  const cfKey = getCloudflareEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  if (cfKey) return cfKey
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  }
  return ''
}

export const hasSupabaseEnv = (): boolean => {
  const url = getSupabaseUrl()
  const key = getSupabaseAnonKey()
  return Boolean(url && key)
}

function createClient(): SupabaseBrowserClient {
  const supabaseUrl = getSupabaseUrl()
  const supabaseAnonKey = getSupabaseAnonKey()

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
