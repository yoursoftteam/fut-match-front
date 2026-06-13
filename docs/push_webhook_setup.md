# Push Webhook Setup (Secure)

This project now supports automatic push webhook dispatch on player registration using a DB trigger.

Use the latest migration path only:
- `20260606_push_webhook_secret_from_vault.sql`

Do not rely on older migration comments that suggest storing the secret value in `ALTER DATABASE ... cloudflare_push_webhook_secret`.

## 1) Apply migrations

Run your normal migration flow so the latest function/trigger is active.

## 2) Configure webhook URL in DB setting

```sql
ALTER DATABASE postgres
SET app.settings.cloudflare_push_webhook_url =
'https://parti2-push-webhook.bara1021.workers.dev/api/push/match-registration';
```

Optional secret name override (default already works):

```sql
ALTER DATABASE postgres
SET app.settings.cloudflare_push_webhook_secret_name =
'cloudflare_push_webhook_secret';
```

## 3) Store secret value in Supabase Vault (encrypted)

```sql
CREATE EXTENSION IF NOT EXISTS vault;

SELECT vault.create_secret(
  'TU_SECRETO_LARGO_Y_UNICO',
  'cloudflare_push_webhook_secret',
  'Secret used by DB trigger to call Cloudflare Worker webhook'
);
```

## 4) Set same secret in Cloudflare Worker

Worker secret variable:
- `WEBHOOK_SECRET = TU_SECRETO_LARGO_Y_UNICO`

Your worker must validate header:
- `x-parti2-webhook-secret`

## 5) Verify

1. Register a player in a match.
2. Check Worker logs for `match_registration_created` payload.
3. Confirm push provider call was executed by Worker.

## Troubleshooting

- If no calls arrive:
  - Check `app.settings.cloudflare_push_webhook_url` is set and starts with `https://`.
  - Check trigger `trg_notify_registration_cloudflare` exists.
  - Check secret name in DB setting matches Vault secret name.

- If Worker returns 401:
  - The value in Worker `WEBHOOK_SECRET` does not match the Vault secret value.
