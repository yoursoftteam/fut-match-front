import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

// Check if we're in development
const isDevelopment = process.env.NODE_ENV === 'development'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
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