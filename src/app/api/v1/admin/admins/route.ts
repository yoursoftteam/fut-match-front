import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient, requireAdmin } from '@/lib/supabase-admin'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Server config error' }, { status: 500 })
  }

  const auth1 = await requireAdmin(request, supabase)
  if (!auth1.success) return auth1.response

  const { data: adminEntries } = await supabase
    .from('admin_users')
    .select('user_id, created_at')
    .order('created_at', { ascending: true })

  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError) {
    return NextResponse.json({ success: false, error: usersError.message }, { status: 500 })
  }

  const userMap = new Map(
    (usersData?.users || []).map((u: any) => [u.id, u.email || ''])
  )

  const admins = (adminEntries || []).map((e: any) => ({
    user_id: e.user_id,
    email: userMap.get(e.user_id) || 'Desconocido',
    created_at: e.created_at,
  }))

  return NextResponse.json({ success: true, data: { admins } })
}

export async function POST(request: NextRequest) {
  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Server config error' }, { status: 500 })
  }

  const auth2 = await requireAdmin(request, supabase)
  if (!auth2.success) return auth2.response

  const { email } = await request.json()
  if (!email) {
    return NextResponse.json({ success: false, error: 'email requerido' }, { status: 400 })
  }

  const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError) {
    return NextResponse.json({ success: false, error: usersError.message }, { status: 500 })
  }

  const user = (usersData?.users || []).find(
    (u: any) => u.email?.toLowerCase() === email.toLowerCase()
  )
  if (!user) {
    return NextResponse.json({ success: false, error: 'Usuario no encontrado con ese email' }, { status: 404 })
  }

  const { error: insertError } = await supabase
    .from('admin_users')
    .insert({ user_id: user.id, created_by: auth2.userId })

  if (insertError) {
    if (insertError.message.includes('duplicate')) {
      return NextResponse.json({ success: false, error: 'El usuario ya es administrador' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, data: { user_id: user.id, email: user.email } })
}

export async function DELETE(request: NextRequest) {
  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Server config error' }, { status: 500 })
  }

  const auth3 = await requireAdmin(request, supabase)
  if (!auth3.success) return auth3.response

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id')
  if (!userId) {
    return NextResponse.json({ success: false, error: 'user_id requerido' }, { status: 400 })
  }

  const { error } = await supabase
    .from('admin_users')
    .delete()
    .eq('user_id', userId)

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
