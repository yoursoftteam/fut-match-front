// Usage: node scripts/set-telegram-webhook.mjs <url>
// Example: node scripts/set-telegram-webhook.mjs https://parti2.app/api/v1/telegram/webhook

const url = process.argv[2]

if (!url) {
  console.error('Usage: node scripts/set-telegram-webhook.mjs <url>')
  console.error('Example: node scripts/set-telegram-webhook.mjs https://parti2.app/api/v1/telegram/webhook')
  process.exit(1)
}

const token = process.env.TELEGRAM_BOT_TOKEN

if (!token) {
  console.error('TELEGRAM_BOT_TOKEN environment variable is not set')
  console.error('Create a .env file or set it in your shell')
  process.exit(1)
}

async function main() {
  // Set webhook
  const setRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })

  const setData = await setRes.json()

  if (!setData.ok) {
    console.error('Failed to set webhook:', setData.description || JSON.stringify(setData))
    process.exit(1)
  }

  console.log(`✅ Webhook set to: ${url}`)

  // Verify webhook info
  const infoRes = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`)
  const infoData = await infoRes.json()

  if (infoData.ok) {
    console.log('\n📡 Webhook info:')
    console.log(`   URL: ${infoData.result.url}`)
    console.log(`   Pending updates: ${infoData.result.pending_update_count}`)
    console.log(`   Max connections: ${infoData.result.max_connections}`)
  }
}

main().catch(console.error)
