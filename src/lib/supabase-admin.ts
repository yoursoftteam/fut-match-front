import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function checkIsAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('admin_users')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) {
    return userId === (process.env.ADMIN_USER_ID || process.env.NEXT_PUBLIC_ADMIN_USER_ID)
  }
  return !!data
}

export async function requireAdmin(request: Request, supabase: SupabaseClient): Promise<{ success: true; userId: string } | { success: false; response: NextResponse }> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { success: false, response: NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 }) }
  }
  const token = authHeader.slice(7)
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)
  if (authError || !user) {
    return { success: false, response: NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 }) }
  }
  const isAdmin = await checkIsAdmin(supabase, user.id)
  if (!isAdmin) {
    return { success: false, response: NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 }) }
  }
  return { success: true, userId: user.id }
}

export function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export function getAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

export function getAuthenticatedClient(token: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}
