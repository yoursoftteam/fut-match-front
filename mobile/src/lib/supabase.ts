import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://iajkipugoylzmjsrnflh.supabase.co'
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'sb_publishable_Or_fzc3a-0yPu4vXiyiAEw_azITUHnc'

const ExpoSecureStoreAdapter = {
  getItem: async (key: string) => {
    const value = await SecureStore.getItemAsync(key)
    return value ?? null
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value)
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key)
  },
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: ExpoSecureStoreAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
