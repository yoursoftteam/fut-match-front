# Push Migrations Status

This repository was cleaned to keep only the required June migrations.

## June migrations to keep

- `20260604_fix_pgcrypto_digest_resolution.sql`
- `20260606_push_webhook_secret_from_vault.sql`

Why:
- `20260604_fix_pgcrypto_digest_resolution.sql` fixes digest resolution in auth-related functions.
- `20260606_push_webhook_secret_from_vault.sql` is the final push webhook implementation:
  - automatic trigger-based dispatch,
  - URL from DB setting,
  - secret from Supabase Vault (encrypted).

## Runtime configuration to use

Set webhook URL:

```sql
ALTER DATABASE postgres
SET app.settings.cloudflare_push_webhook_url =
'https://parti2-push-webhook.bara1021.workers.dev/api/push/match-registration';
```

Optional secret name override (default is already correct):

```sql
ALTER DATABASE postgres
SET app.settings.cloudflare_push_webhook_secret_name =
'cloudflare_push_webhook_secret';
```

Create secret in Vault:

```sql
CREATE EXTENSION IF NOT EXISTS vault;

SELECT vault.create_secret(
  'TU_SECRETO_LARGO_Y_UNICO',
  'cloudflare_push_webhook_secret',
  'Secret used by notify_registration_cloudflare trigger'
);
```
