import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey)

if (!hasSupabaseEnv) {
  console.warn('Supabase env vars are missing. Configure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your deployment environment.')
}

export const supabase = createClient(
  hasSupabaseEnv ? supabaseUrl! : 'https://placeholder.supabase.co',
  hasSupabaseEnv ? supabaseAnonKey! : 'placeholder-anon-key',
  {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // In development, we might want to disable email confirmation
    // This would need to be configured in Supabase dashboard
  },
  global: {
    headers: {
      'X-Client-Info': 'futmatch-app'
    }
  }
})