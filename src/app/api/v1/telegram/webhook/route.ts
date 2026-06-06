import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { TelegramUpdate, TelegramMessage } from '@/lib/telegram'
import { sendMessage, extractCommand } from '@/lib/telegram'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

const BOT_USERNAME = process.env.TELEGRAM_BOT_USERNAME || ''

interface MatchInfo {
  id: string
  title: string
  location: string
  date: string
  max_players: number
  created_by: string
  field_cost: number
  rental_cost: number
  players_per_team: number
}

async function fetchMatch(matchId: string): Promise<MatchInfo | null> {
  const { data } = await supabase
    .rpc('get_public_match_by_id', { p_match_id: matchId })
    .single()

  if (!data) return null

  const d = data as Record<string, unknown>
  return {
    id: String(d.id ?? ''),
    title: String(d.title ?? ''),
    location: String(d.location ?? ''),
    date: String(d.date ?? ''),
    max_players: Number(d.max_players ?? 0),
    created_by: String(d.created_by ?? ''),
    field_cost: Number(d.field_cost ?? 0),
    rental_cost: Number(d.rental_cost ?? 0),
    players_per_team: Number(d.players_per_team ?? 0),
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(amount)
}

async function handleStart(msg: TelegramMessage): Promise<void> {
  const text =
    '👋 *Hola! Soy el bot de Parti2*\n\n' +
    'Puedes agregarme a un grupo y vincularlo con un partido para consultar los inscritos.\n\n' +
    'Comandos disponibles:\n' +
    '• `/vincular ID` — Vincular este grupo con un partido\n' +
    '• `/desvincular` — Desvincular este grupo del partido\n' +
    '• `/lista` — Lista de jugadores inscritos\n' +
    '• `/cuantos` — Cantidad de inscritos\n' +
    '• `/info` — Información del partido\n' +
    '• `/partidos` — Lista todos los partidos vinculados\n' +
    '• `/ayuda` — Esta ayuda'

  await sendMessage({
    chat_id: msg.chat.id,
    text,
    parse_mode: 'Markdown',
  })
}

async function handleAyuda(msg: TelegramMessage): Promise<void> {
  await handleStart(msg)
}

async function handleVincular(msg: TelegramMessage, args: string[]): Promise<void> {
  const chatId = msg.chat.id
  const chatType = msg.chat.type

  if (chatType === 'private') {
    await sendMessage({
      chat_id: chatId,
      text: '❌ Este comando solo funciona en un grupo. Agrégame a un grupo y ejecútalo allí.',
    })
    return
  }

  const matchId = args[0]

  if (!matchId) {
    await sendMessage({
      chat_id: chatId,
      text: '⚠️ Debes indicar el ID del partido.\n\nEjemplo:\n`/vincular 550e8400-e29b-41d4-a716-446655440000`',
      parse_mode: 'Markdown',
    })
    return
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(matchId)) {
    await sendMessage({
      chat_id: chatId,
      text: '❌ El ID del partido no es válido. Debe ser un UUID.\n\nPuedes encontrar el ID en la URL del partido: `/match/ID`',
      parse_mode: 'Markdown',
    })
    return
  }

  const match = await fetchMatch(matchId)

  if (!match) {
    await sendMessage({
      chat_id: chatId,
      text: '❌ No encontré un partido con ese ID. Verifica que el ID sea correcto.',
    })
    return
  }

  const { error: insertError } = await supabase
    .from('match_telegram_groups')
    .insert({
      match_id: matchId,
      chat_id: chatId,
    })

  if (insertError) {
    if (insertError.code === '23505') {
      await sendMessage({
        chat_id: chatId,
        text: '✅ Este grupo ya está vinculado a un partido.',
      })
      return
    }

    await sendMessage({
      chat_id: chatId,
      text: '❌ Ocurrió un error al vincular el grupo. Intenta de nuevo.',
    })
    return
  }

  await sendMessage({
    chat_id: chatId,
    text: `✅ *Grupo vinculado exitosamente!*\n\nPartido: *${match.title}*\nFecha: ${formatDate(match.date)}\n\nUsa /lista para ver los inscritos, /cuantos para contar, o /info para más detalles.`,
    parse_mode: 'Markdown',
  })
}

async function handleDesvincular(msg: TelegramMessage): Promise<void> {
  const chatId = msg.chat.id

  const { data: link } = await supabase
    .from('match_telegram_groups')
    .delete()
    .eq('chat_id', chatId)
    .select()
    .maybeSingle()

  if (!link) {
    await sendMessage({
      chat_id: chatId,
      text: '⚠️ Este grupo no está vinculado a ningún partido.',
    })
    return
  }

  await sendMessage({
    chat_id: chatId,
    text: '✅ Grupo desvinculado del partido.',
  })
}

async function getLinkedMatchId(chatId: number): Promise<string | null> {
  const { data: links } = await supabase
    .from('match_telegram_groups')
    .select('match_id, linked_at')
    .eq('chat_id', chatId)
    .order('linked_at', { ascending: false })
    .limit(1)

  return links?.[0]?.match_id ?? null
}

async function handleLista(msg: TelegramMessage): Promise<void> {
  const chatId = msg.chat.id

  const matchId = await getLinkedMatchId(chatId)
  if (!matchId) {
    await sendMessage({
      chat_id: chatId,
      text: '⚠️ Este grupo no está vinculado a ningún partido. Usa `/vincular ID` para vincularlo.',
      parse_mode: 'Markdown',
    })
    return
  }

  const { data: registrations, error } = await supabase
    .from('match_registrations')
    .select('name, is_goalkeeper, has_paid, registered_at')
    .eq('match_id', matchId)
    .order('registered_at', { ascending: true })

  if (error) {
    await sendMessage({
      chat_id: chatId,
      text: '❌ Error al consultar los inscritos.',
    })
    return
  }

  if (!registrations || registrations.length === 0) {
    await sendMessage({
      chat_id: chatId,
      text: '📋 No hay jugadores inscritos en este partido aún.',
    })
    return
  }

  const fieldPlayers = registrations.filter(r => !r.is_goalkeeper)
  const goalkeepers = registrations.filter(r => r.is_goalkeeper)

  const lines: string[] = ['📋 *Lista de inscritos:*\n']

  if (fieldPlayers.length > 0) {
    lines.push(`*Jugadores de campo (${fieldPlayers.length}):*`)
    fieldPlayers.forEach((r, i) => {
      const paid = r.has_paid ? '✅' : ''
      lines.push(`  ${i + 1}. ${r.name} ${paid}`)
    })
    lines.push('')
  }

  if (goalkeepers.length > 0) {
    lines.push(`*Arqueros (${goalkeepers.length}):*`)
    goalkeepers.forEach((r, i) => {
      const paid = r.has_paid ? '✅' : ''
      lines.push(`  ${i + 1}. 🧤 ${r.name} ${paid}`)
    })
    lines.push('')
  }

  lines.push(`Total: *${registrations.length}* jugadores`)

  await sendMessage({
    chat_id: chatId,
    text: lines.join('\n'),
    parse_mode: 'Markdown',
  })
}

async function handleCuantos(msg: TelegramMessage): Promise<void> {
  const chatId = msg.chat.id

  const matchId = await getLinkedMatchId(chatId)
  if (!matchId) {
    await sendMessage({
      chat_id: chatId,
      text: '⚠️ Este grupo no está vinculado a ningún partido. Usa `/vincular ID` para vincularlo.',
      parse_mode: 'Markdown',
    })
    return
  }

  const match = await fetchMatch(matchId)

  if (!match) {
    await sendMessage({
      chat_id: chatId,
      text: '❌ No se encontró el partido.',
    })
    return
  }

  const { data: registrations } = await supabase
    .from('match_registrations')
    .select('is_goalkeeper, has_paid')
    .eq('match_id', matchId)

  const total = registrations?.length ?? 0
  const goalkeepers = registrations?.filter(r => r.is_goalkeeper).length ?? 0
  const fieldPlayers = total - goalkeepers
  const paid = registrations?.filter(r => r.has_paid).length ?? 0
  const maxPlayers = match.max_players
  const substitutes = Math.max(0, total - maxPlayers)
  const titularSlots = Math.min(total, maxPlayers)
  const remaining = Math.max(0, maxPlayers - titularSlots)

  const lines: string[] = [
    `📊 *Resumen de inscritos:*\n`,
    `👥 Total: *${total}* / ${maxPlayers + 10}`,
    `⚽ Titulares: *${titularSlots}* / ${maxPlayers}`,
    `🔄 Suplentes: *${substitutes}* / 10`,
    `🧤 Arqueros: *${goalkeepers}*`,
    `🏃 Campo: *${fieldPlayers}*`,
    `💰 Pagos: *${paid}* / ${total}`,
  ]

  if (remaining > 0) {
    lines.push(`\nQuedan *${remaining}* cupos de titular.`)
  }

  await sendMessage({
    chat_id: chatId,
    text: lines.join('\n'),
    parse_mode: 'Markdown',
  })
}

async function handleInfo(msg: TelegramMessage): Promise<void> {
  const chatId = msg.chat.id

  const matchId = await getLinkedMatchId(chatId)
  if (!matchId) {
    await sendMessage({
      chat_id: chatId,
      text: '⚠️ Este grupo no está vinculado a ningún partido. Usa `/vincular ID` para vincularlo.',
      parse_mode: 'Markdown',
    })
    return
  }

  const match = await fetchMatch(matchId)

  if (!match) {
    await sendMessage({
      chat_id: chatId,
      text: '❌ No se encontró el partido.',
    })
    return
  }

  const { count: totalPlayers } = await supabase
    .from('match_registrations')
    .select('id', { count: 'exact', head: true })
    .eq('match_id', matchId)
  const costPerPlayer = match.max_players > 0
    ? (Number(match.field_cost) + Number(match.rental_cost)) / match.max_players
    : 0

  const lines: string[] = [
    `📌 *${match.title}*\n`,
    `📍 *Ubicación:* ${match.location}`,
    `📅 *Fecha:* ${formatDate(match.date)}`,
    `👥 *Jugadores por equipo:* ${match.players_per_team}`,
    `🏟️ *Capacidad:* ${match.max_players} titulares + 10 suplentes`,
    `📋 *Inscritos:* ${totalPlayers}`,
  ]

  if (costPerPlayer > 0) {
    lines.push(`💰 *Costo por jugador:* ${formatCurrency(costPerPlayer)}`)
  }

  lines.push(
    `\n🔗 Enlace: https://parti2.app/match/${matchId}`
  )

  await sendMessage({
    chat_id: chatId,
    text: lines.join('\n'),
    parse_mode: 'Markdown',
    disable_web_page_preview: true,
  })
}

async function handlePartidos(msg: TelegramMessage): Promise<void> {
  const chatId = msg.chat.id

  const { data: links } = await supabase
    .from('match_telegram_groups')
    .select('match_id, linked_at')
    .eq('chat_id', chatId)
    .order('linked_at', { ascending: false })

  if (!links || links.length === 0) {
    await sendMessage({
      chat_id: chatId,
      text: '⚠️ Este grupo no tiene partidos vinculados.',
    })
    return
  }

  const lines: string[] = ['📌 *Partidos vinculados:*\n']

  for (const link of links) {
    const match = await fetchMatch(link.match_id)
    if (!match) continue
    lines.push(
      `• *${match.title}* — ${formatDate(match.date)}`,
      `  ID: \`${match.id}\``,
      ''
    )
  }

  if (lines.length === 1) {
    lines.push('(no se encontraron partidos válidos)')
  }

  await sendMessage({
    chat_id: chatId,
    text: lines.join('\n').trim(),
    parse_mode: 'Markdown',
  })
}

async function dispatchCommand(msg: TelegramMessage): Promise<void> {
  const parsed = extractCommand(msg.text ?? '', BOT_USERNAME)
  if (!parsed) return

  const { command, args } = parsed

  switch (command) {
    case '/start':
      await handleStart(msg)
      break
    case '/ayuda':
    case '/help':
      await handleAyuda(msg)
      break
    case '/vincular':
    case '/link':
      await handleVincular(msg, args)
      break
    case '/desvincular':
    case '/unlink':
      await handleDesvincular(msg)
      break
    case '/lista':
    case '/list':
      await handleLista(msg)
      break
    case '/cuantos':
    case '/count':
      await handleCuantos(msg)
      break
    case '/info':
      await handleInfo(msg)
      break
    case '/partidos':
    case '/matches':
      await handlePartidos(msg)
      break
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const update: TelegramUpdate = await request.json()

    const msg = update.message
    if (!msg?.text || !msg.chat) {
      return NextResponse.json({ ok: true })
    }

    const isCommand = msg.entities?.some(e => e.type === 'bot_command')
    if (!isCommand) {
      return NextResponse.json({ ok: true })
    }

    await dispatchCommand(msg)

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ ok: true })
  }
}
