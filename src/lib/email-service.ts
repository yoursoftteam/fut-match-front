import { renderLastChanceEmail, type LastChanceEmailData } from './email-templates/last-chance'
import { renderDailyDigestEmail, type DailyDigestEmailData } from './email-templates/daily-digest'

export type NotificationType = 'last_chance' | 'daily_digest'

export interface EmailPayload {
  to: string
  subject: string
  html: string
  idempotency_key: string
}

const RESEND_API_BASE = 'https://api.resend.com'

export class EmailService {
  private apiKey: string
  private from: string

  constructor(apiKey: string, from: string) {
    this.apiKey = apiKey
    this.from = from
  }

  async sendBatch(emails: EmailPayload[]): Promise<{ sent: number; failed: number; errors: string[] }> {
    if (emails.length === 0) {
      return { sent: 0, failed: 0, errors: [] }
    }

    const results = await Promise.allSettled(
      emails.map((email) => this.sendSingle(email))
    )

    let sent = 0
    let failed = 0
    const errors: string[] = []

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value) {
        sent++
      } else {
        failed++
        errors.push(result.status === 'rejected' ? result.reason?.message ?? 'Unknown error' : 'Failed to send')
      }
    }

    return { sent, failed, errors }
  }

  private async sendSingle(email: EmailPayload): Promise<boolean> {
    const response = await fetch(`${RESEND_API_BASE}/emails`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': email.idempotency_key,
      },
      body: JSON.stringify({
        from: this.from,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        headers: {
          'X-Mailer': 'Parti2',
          'X-Entity-Ref-ID': email.idempotency_key,
          'List-Unsubscribe': '<https://parti2.app/settings/notifications>',
        },
      }),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => ({}))
      throw new Error(`Resend error ${response.status}: ${body?.error?.message ?? response.statusText}`)
    }

    return true
  }

  static renderLastChance(data: LastChanceEmailData): { subject: string; html: string } {
    const match = data.match
    return {
      subject: `⏰ Queda poco tiempo — ${match.home_team} 🆚 ${match.away_team} en 1 hora`,
      html: renderLastChanceEmail(data),
    }
  }

  static renderDailyDigest(data: DailyDigestEmailData): { subject: string; html: string } {
    const pool = data.main_pool
    const subjects: Record<string, string> = {
      top3: `🏆 ¡Vas como avión en ${pool.pool_name}! 🔥`,
      mid: `📊 ${pool.pool_name} — todo puede pasar`,
      bottom2: `💪 Dale que se puede en ${pool.pool_name}`,
    }
    return {
      subject: subjects[pool.tier] ?? subjects.mid,
      html: renderDailyDigestEmail(data),
    }
  }
}
