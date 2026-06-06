const TELEGRAM_API = 'https://api.telegram.org'

export interface TelegramUser {
  id: number
  first_name: string
  is_bot?: boolean
  last_name?: string
  username?: string
  language_code?: string
}

export interface TelegramChat {
  id: number
  title?: string
  type: 'private' | 'group' | 'supergroup' | 'channel'
  username?: string
  first_name?: string
  last_name?: string
}

export interface TelegramMessage {
  message_id: number
  from?: TelegramUser
  chat: TelegramChat
  date: number
  text?: string
  entities?: Array<{
    offset: number
    length: number
    type: 'bot_command' | 'mention' | 'hashtag' | 'url' | 'email' | 'bold' | 'italic' | 'code' | 'pre' | 'text_link' | 'text_mention'
  }>
  reply_to_message?: TelegramMessage
}

export interface TelegramUpdate {
  update_id: number
  message?: TelegramMessage
}

export interface SendMessageParams {
  chat_id: number | string
  text: string
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2'
  reply_to_message_id?: number
  disable_web_page_preview?: boolean
}

export function getBotToken(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN environment variable is not set')
  }
  return token
}

export async function sendMessage(params: SendMessageParams): Promise<boolean> {
  const token = getBotToken()
  const url = `${TELEGRAM_API}/bot${token}/sendMessage`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`Telegram API error (${res.status}): ${body}`)
    return false
  }

  return true
}

export async function setWebhook(url: string): Promise<boolean> {
  const token = getBotToken()
  const res = await fetch(`${TELEGRAM_API}/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })

  if (!res.ok) {
    const body = await res.text()
    console.error(`Telegram setWebhook error (${res.status}): ${body}`)
    return false
  }

  return true
}

export function extractCommand(text: string, botUsername?: string): { command: string; args: string[] } | null {
  if (!text) return null

  const parts = text.trim().split(/\s+/)
  const first = parts[0].toLowerCase()

  let command: string

  if (first.includes('@')) {
    const [cmd, username] = first.split('@')
    if (botUsername && username.toLowerCase() !== botUsername.toLowerCase()) {
      return null
    }
    command = cmd
  } else {
    command = first
  }

  return {
    command,
    args: parts.slice(1),
  }
}
