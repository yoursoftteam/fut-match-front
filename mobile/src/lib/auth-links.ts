import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { makeRedirectUri } from 'expo-auth-session'
import * as QueryParams from 'expo-auth-session/build/QueryParams'
import { supabase } from '@/lib/supabase'
import type { EmailOtpType } from '@supabase/supabase-js'

WebBrowser.maybeCompleteAuthSession()

export const AUTH_CALLBACK_PATH = 'auth/callback'

export function getAuthCallbackUri(): string {
  return makeRedirectUri({ path: AUTH_CALLBACK_PATH })
}

export interface AuthLinkResult {
  handled: boolean
  kind?: 'session' | 'email-confirm' | 'recovery'
  error?: string
}

export async function createSessionFromUrl(url: string): Promise<AuthLinkResult> {
  const { params, errorCode } = QueryParams.getQueryParams(url)
  if (errorCode) {
    return { handled: true, kind: 'session', error: errorCode }
  }

  const code = params.code
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return { handled: true, kind: 'session', error: error.message }
    }
    return { handled: true, kind: 'session' }
  }

  const { access_token, refresh_token } = params
  if (access_token && refresh_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token })
    if (error) {
      return { handled: true, kind: 'session', error: error.message }
    }
    return { handled: true, kind: 'session' }
  }

  return { handled: false }
}

export async function verifyOtpFromUrl(url: string): Promise<AuthLinkResult> {
  const { params } = QueryParams.getQueryParams(url)
  const token_hash = params.token_hash
  const type = params.type as EmailOtpType | undefined

  if (!token_hash || !type) {
    return { handled: false }
  }

  const kind = type === 'recovery' ? 'recovery' : 'email-confirm'
  const { error } = await supabase.auth.verifyOtp({ token_hash, type })
  if (error) {
    return { handled: true, kind, error: error.message }
  }
  return { handled: true, kind }
}

export async function signInWithGoogleBrowser(): Promise<{ error?: string }> {
  const redirectTo = getAuthCallbackUri()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  })

  if (error) return { error: error.message }
  if (!data.url) return { error: 'No se pudo iniciar con Google. Intenta de nuevo.' }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo)
  if (result.type !== 'success' || !result.url) {
    return { error: 'No se completó el inicio de sesión con Google.' }
  }

  const session = await createSessionFromUrl(result.url)
  if (session.error) return { error: session.error }
  if (!session.handled) return { error: 'No se pudo iniciar con Google. Intenta de nuevo.' }

  return {}
}

export function getInviteCodeFromUrl(url: string): string | null {
  const parsed = Linking.parse(url)
  const rawPath = parsed.path ?? ''
  const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`
  const prefix = '/join/'
  if (!path.startsWith(prefix)) return null
  const code = path.slice(prefix.length).trim()
  return code.length > 0 ? code : null
}
