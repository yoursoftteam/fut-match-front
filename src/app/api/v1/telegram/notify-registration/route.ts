import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendMessage } from '@/lib/telegram'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const notifySecret = process.env.TELEGRAM_NOTIFY_SECRET

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

interface NotifyPayload {
  match_id: string
  name: string
  is_goalkeeper: boolean
  type: 'register' | 'unregister'
  registered_at?: string
}

interface Registration {
  name: string
  is_goalkeeper: boolean
  has_paid: boolean
  registered_at: string
}

async function fetchMatch(matchId: string) {
  const { data } = await supabase
    .rpc('get_public_match_by_id', { p_match_id: matchId })
    .single()

  if (!data) return null
  const d = data as Record<string, unknown>
  return {
    title: String(d.title ?? ''),
    max_players: Number(d.max_players ?? 0),
  }
}

function buildListMessage(
  registrations: Registration[],
  maxPlayers: number,
  subjectName: string,
  isGoalkeeper: boolean,
  type: 'register' | 'unregister',
): string {
  const sorted = [...registrations].sort(
    (a, b) => new Date(a.registered_at).getTime() - new Date(b.registered_at).getTime(),
  )

  const total = sorted.length
  const titulars = sorted.slice(0, maxPlayers)
  const suplentes = sorted.slice(maxPlayers)

  const gkIcon = isGoalkeeper ? '🧤 ' : ''
  const header = type === 'register'
    ? `🆕 *${gkIcon}${subjectName}* se inscribió\n`
    : `🚫 *${gkIcon}${subjectName}* se dio de baja\n`

  const lines: string[] = [
    header,
    `📋 *Lista actualizada (${total}/${maxPlayers + 10}):*\n`,
  ]

  if (titulars.length > 0) {
    lines.push(`*Titulares (${titulars.length}/${maxPlayers}):*`)
    titulars.forEach((r, i) => {
      const prefix = r.is_goalkeeper ? '🧤 ' : ''
      const paid = r.has_paid ? ' ✅' : ''
      lines.push(`  ${i + 1}. ${prefix}${r.name}${paid}`)
    })
    lines.push('')
  }

  if (suplentes.length > 0) {
    lines.push(`*Suplentes (${suplentes.length}):*`)
    suplentes.forEach((r, i) => {
      const prefix = r.is_goalkeeper ? '🧤 ' : ''
      const paid = r.has_paid ? ' ✅' : ''
      lines.push(`  ${i + 1}. ${prefix}${r.name}${paid}`)
    })
    lines.push('')
  }

  return lines.join('\n')
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    if (notifySecret) {
      const headerSecret = request.headers.get('x-notify-secret')
      if (!headerSecret || headerSecret !== notifySecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const payload: NotifyPayload = await request.json()

    if (!payload.match_id || !payload.name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: links } = await supabase
      .from('match_telegram_groups')
      .select('chat_id')
      .eq('match_id', payload.match_id)

    if (!links || links.length === 0) {
      return NextResponse.json({ notified: 0 })
    }

    const match = await fetchMatch(payload.match_id)
    if (!match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    const { data: registrations } = await supabase
      .from('match_registrations')
      .select('name, is_goalkeeper, has_paid, registered_at')
      .eq('match_id', payload.match_id)

    const message = buildListMessage(
      registrations ?? [],
      match.max_players,
      payload.name,
      payload.is_goalkeeper,
      payload.type,
    )

    let notified = 0
    for (const link of links) {
      const ok = await sendMessage({
        chat_id: link.chat_id,
        text: message,
        parse_mode: 'Markdown',
      })
      if (ok) notified++
    }

    return NextResponse.json({ notified })
  } catch (error) {
    console.error('Notify registration error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
