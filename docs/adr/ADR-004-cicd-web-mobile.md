# ADR-004: CI/CD web + móvil

**Estado:** Aceptado  
**Fecha:** 2026-07-14  
**Decisor:** Equipo Parti2  
**Issue:** [#155](https://github.com/yoursoftteam/fut-match-front/issues/155)

---

## Contexto

El CI actual funciona para web: `typecheck` + `lint` en PRs, `deploy` a Cloudflare Pages en push a `main`. Con la app móvil (Expo) necesitamos agregar builds, testing y releases sin romper nada existente.

### Estado actual

```yaml
# .github/workflows/ci.yml (existente — NO se modifica)
on:
  pull_request: [main]
  push: [main]

jobs:
  check:    # typecheck + lint (web)
  deploy:   # wrangler pages deploy (solo push a main)
```

### Hallazgos

- Deploy web usa `@cloudflare/next-on-pages` + `wrangler pages deploy` (Cloudflare Pages)
- `wrangler.jsonc` tiene config para Workers (`.open-next/worker.js`) pero no se usa — el deploy real es Pages
- No hay `open-next.config.ts` ni `@opennextjs/cloudflare` en dependencies
- No hay pipeline móvil ni perfiles de release

## Decisión

**Mantener Cloudflare Pages para web. Agregar EAS (Expo Application Services) para móvil. CI solo agrega jobs, no modifica los existentes.**

### 1. Deploy web: Cloudflare Pages (sin cambios)

Se mantiene tal como está:
- `npm run deploy` → `wrangler pages deploy .vercel/output/static`
- Variables de entorno en `wrangler.jsonc` (ya configurado)
- Deploy automático en push a `main`

### 2. Deploy móvil: EAS Build + Submit

| Concepto | Decisión |
|----------|----------|
| **Plataforma de build** | EAS Build ( Expo) |
| **Canal `development`** | Builds internos, solo para el equipo |
| **Canal `preview`** | TestFlight (iOS) + Google Play Internal (Android) |
| **Canal `production`** | App Store + Google Play |
| **OTA updates** | EAS Update para hotfixes sin rebuild |
| **Versionado** | `app.json` → `version` (semver). Build number auto-incrementado |

#### Configuración EAS (`eas.json`)

```jsonc
{
  "cli": { "version": ">= 3.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "env": { "SUPABASE_URL": "...", "SUPABASE_ANON_KEY": "..." }
    },
    "preview": {
      "distribution": "internal",
      "env": { "SUPABASE_URL": "...", "SUPABASE_ANON_KEY": "..." }
    },
    "production": {
      "autoIncrement": true,
      "env": { "SUPABASE_URL": "...", "SUPABASE_ANON_KEY": "..." }
    }
  },
  "submit": {
    "production": {
      "ios": { "appleId": "...", "ascAppId": "..." },
      "android": { "serviceAccountKeyPath": "..." }
    }
  }
}
```

### 3. Variables y secrets

#### Web (ya existentes — no se modifican)

| Secret | Dónde se usa |
|--------|-------------|
| `CLOUDFLARE_API_TOKEN` | `ci.yml` → `npm run deploy` |
| `NEXT_PUBLIC_SUPABASE_URL` | `wrangler.jsonc` vars |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `wrangler.jsonc` vars |

#### Móvil (nuevos — no afectan web)

| Secret | Dónde se usa | Ambiente |
|--------|-------------|----------|
| `EXPO_TOKEN` | EAS Build en CI | Todos |
| `SUPABASE_URL` | `app.json` env | Todos |
| `SUPABASE_ANON_KEY` | `app.json` env | Todos |
| `APPLE_APP_STORE_CONNECT_KEY_ID` | EAS Submit (iOS) | Production |
| `APPLE_APP_STORE_CONNECT_ISSUER_ID` | EAS Submit (iOS) | Production |
| `APPLE_APP_STORE_CONNECT_API_KEY` | EAS Submit (iOS) | Production |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | EAS Submit (Android) | Production |

### 4. CI: solo agrega jobs

```yaml
# .github/workflows/ci.yml — SE AGREGA, NO se modifica lo existente

name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  # === EXISTENTE (sin cambios) ===
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint

  deploy:
    if: github.event_name == 'push'
    needs: check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run deploy
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}

  # === NUEVO (mobile) ===
  mobile-check:
    if: contains(github.event.head_commit.modified, 'mobile/') || contains(github.event.head_commit.modified, 'shared/')
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: cd mobile && npm ci
      - run: cd mobile && npx tsc --noEmit

  mobile-preview:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: [check, mobile-check]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}
      - run: cd mobile && npm ci
      - run: cd mobile && eas build --platform all --profile preview --non-interactive
```

### 5. Proceso de release App Store / Google Play

#### iOS (TestFlight → App Store)

```bash
# 1. Build production
cd mobile && eas build --platform ios --profile production

# 2. Submit a TestFlight
eas submit --platform ios --profile production

# 3. En App Store Connect: 
#    - Agregar screenshot, descripción, etc.
#    - Enviar a revisión

# 4. OTA updates (sin rebuild)
eas update --channel production --message "Bugfix: ..."
```

#### Android (Internal → Play Store)

```bash
# 1. Build production
cd mobile && eas build --platform android --profile production

# 2. Submit a Play Internal
eas submit --platform android --profile production

# 3. En Play Console:
#    - Agregar listing, screenshots, etc.
#    - Enviar a revisión

# 4. OTA updates
eas update --channel production --message "Bugfix: ..."
```

### 6. Flujos de trabajo

| Evento | Qué corre |
|--------|-----------|
| PR a main (solo toca `mobile/` o `shared/`) | `check` + `mobile-check` |
| PR a main (solo toca `src/`) | `check` |
| PR a main (toca ambos) | `check` + `mobile-check` |
| Push a main | `check` + `deploy` + `mobile-check` + `mobile-preview` |
| Release manual | `eas build --profile production` + `eas submit` |

## Criterios de aceptación

- [x] Decisión: Cloudflare Pages para web (sin cambios)
- [x] Decisión: EAS Build/Submit/Update para móvil
- [x] Variables/secrets definidos por ambiente
- [x] Canal de preview móvil: TestFlight + Google Play Internal
- [x] CI: web check + deploy intactos, mobile-check y mobile-preview agregados
- [x] Documentado: proceso de release App Store y Google Play

## Consecuencias

### Positivas
- Web no se toca — zero riesgo de regresión
- EAS es el estándar para Expo — bien documentado, amplia comunidad
- OTA updates permiten hotfixes sin pasar por store review
- CI crece orgánicamente sin romper lo existente

### Negativas
- Dos plataformas de deploy (Cloudflare + EAS) — requiere coordinar secrets
- EAS tiene tier gratuito limitado (30 builds/mes)
- Requiere cuentas de developer en Apple ($99/año) y Google ($25 one-time)

### Neutras
- La config de Workers en `wrangler.jsonc` queda como tech debt (no se usa, pero no molesta)
- Si en el futuro se migra web a Workers, se actualiza `deploy` script y se quita Pages
