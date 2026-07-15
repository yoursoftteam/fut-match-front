# ADR-002: Estructura de repositorio web + móvil

**Estado:** Aceptado  
**Fecha:** 2026-07-14  
**Actualizado:** 2026-07-14 (implementación issue #153)  
**Decisor:** Equipo Parti2  
**Issues:** [#152](https://github.com/yoursoftteam/fut-match-front/issues/152), [#153](https://github.com/yoursoftteam/fut-match-front/issues/153)

---

## Contexto

Con la decisión de React Native + Expo (ADR-001), surge la pregunta de cómo organizar el código. El repo actual es una app Next.js única con `package.json`, `tsconfig.json` y alias `@/* -> ./src/*` que mezclan dominio, UI, hooks y rutas en una sola estructura.

El equipo tiene 3 desarrolladores sin experiencia en monorepo. Las fuerzas en juego son:

- **Drift entre web y móvil**: si los tipos y validaciones se duplican, divergen rápidamente
- **Mantenibilidad**: cambios en un lado no deben romper el otro
- **Testeable**: la lógica de negocio debe ser testeable independientemente
- **Escalable**: la estructura debe crecer sin reescrituras
- **Velocidad**: la fase inicial necesita ser ágil

## Análisis de portabilidad del código actual

| Archivo | Dependencias externas | DOM/APIs browser | Portable |
|---------|----------------------|------------------|----------|
| `types/bet.ts` | Ninguna | No | ✅ Total |
| `lib/match-pricing.ts` | Ninguna | No | ✅ Total |
| `lib/currency.ts` | Ninguna | No (usa `Intl`) | ✅ Total |
| `lib/date-utils.ts` | Ninguna | No (usa `Date`, `Intl`) | ✅ Total |
| `lib/match-title.ts` | Ninguna | No | ✅ Total |
| `lib/match-schema.ts` | `zod` | No | ✅ Total |
| `lib/bet-scoring.ts` | Solo `types/bet` | No | ✅ Total |
| `lib/bet-utils.ts` | `types/bet`, `bet-scoring` | No | ✅ Total |
| `lib/bet-result-utils.ts` | Ninguna | No | ✅ Total |
| `lib/sanitize.ts` | Ninguna | No | ✅ Total |
| `lib/positions.ts` | `lucide-react` | No | ⚠️ Parcial |
| `lib/payment-summary.ts` | Ninguna | `navigator.clipboard`, `window.open` | ⚠️ Parcial |

**Cadena de dependencias interna:**
```
bet-utils → bet-scoring → types/bet
```
Los demás 9 archivos son hojas puras sin dependencias cruzadas.

## Opciones evaluadas

### 1. Monorepo formal (Turborepo/nx)

```
fut-match-front/
├── apps/web/
├── apps/mobile/
├── packages/contracts/
├── packages/domain/
├── packages/api-client/
├── turbo.json
└── package.json (workspaces)
```

| Pros | Contras |
|------|---------|
| Build caching, remote cache | Over-engineering para 3 devs y ~15 archivos compartidos |
| Task orchestration | Curva de aprendizaje: workspace protocol, project references |
| Escalable a 5+ apps | Migración toma 1-2 semanas |
| | Riesgo de romper deploy actual (wrangler paths) |

### 2. Repos separados

| Pros | Contras |
|------|---------|
| Aislamiento completo | Duplicación garantizada de tipos y schemas |
| Deploy independiente | Sincronización manual constante |
| | Alto costo para 3 devs |

### 3. Directorio `shared/` con path aliases (seleccionada)

```
fut-match-front/
├── src/              ← Next.js (sin cambios)
├── mobile/           ← Expo (nuevo)
├── shared/           ← Lógica compartida (solo .ts)
├── package.json      ← Root (el actual)
└── tsconfig.json     ← Con paths: "@shared/*"
```

| Pros | Contras |
|------|---------|
| Zero risk al deploy actual | Sin build caching |
| Migración en 2-3 horas | Sin versionado de paquetes |
| Path aliases = cero config | Requiere metro.config.js watchFolders |
| Testeable independientemente | |
| Escalable: si crece, se migra a Turborepo trivialmente | |

## Decisión

**Aceptada: Directorio `shared/` con path aliases TypeScript**

### Estructura completa

```
fut-match-front/
│
├── src/                          ← Web Next.js (SIN CAMBIOS estructurales)
│   ├── app/
│   ├── components/
│   ├── hooks/
│   ├── lib/                      ← Solo lo web-específico
│   │   ├── supabase.ts           ← @supabase/ssr (Cloudflare)
│   │   ├── supabase-admin.ts
│   │   ├── fonts.ts
│   │   ├── fcm.ts
│   │   └── email-service.ts
│   ├── types/                    ← Solo tipos web-específicos
│   └── ...
│
├── shared/                       ← LÓGICA DE NEGOCIO PURA
│   ├── types/
│   │   ├── bet.ts                ← Movido desde src/types/bet.ts
│   │   └── index.ts              ← Barrel export
│   ├── schemas/
│   │   ├── match-schema.ts       ← Movido desde src/lib/match-schema.ts
│   │   └── index.ts
│   ├── lib/
│   │   ├── pricing.ts            ← match-pricing.ts
│   │   ├── currency.ts
│   │   ├── dates.ts              ← date-utils.ts
│   │   ├── match-title.ts
│   │   ├── scoring.ts            ← bet-scoring.ts
│   │   ├── bet-utils.ts
│   │   ├── bet-result-utils.ts   ← Solo lógica, sin clases Tailwind
│   │   ├── sanitize.ts
│   │   └── index.ts
│   ├── hooks/
│   │   └── use-currency-formatter.ts
│   ├── __tests__/                ← Tests unitarios (Vitest)
│   │   ├── pricing.test.ts
│   │   ├── currency.test.ts
│   │   ├── dates.test.ts
│   │   ├── scoring.test.ts
│   │   └── schemas.test.ts
│   ├── tsconfig.json             ← Config TS dedicada para shared/
│   └── package.json              ← Solo para scripts de test
│
├── mobile/                       ← Expo App (nuevo)
│   ├── app/                      ← Expo Router (file-based)
│   ├── src/
│   │   ├── lib/
│   │   │   └── supabase.ts       ← @supabase/supabase-js + expo-secure-store
│   │   ├── hooks/
│   │   ├── components/
│   │   └── types/
│   ├── __tests__/
│   ├── metro.config.js           ← watchFolders: [../shared]
│   ├── tsconfig.json             ← paths: "@shared/*": ["../shared/*"]
│   ├── package.json
│   ├── app.json
│   └── eas.json
│
├── package.json                  ← Root (sin workspaces)
├── tsconfig.json                 ← paths: { "@/*", "@shared/*" }
└── .github/workflows/ci.yml
```

### Reglas de aislamiento

| Regla | Enforcement |
|-------|-------------|
| `shared/` NO importa de `src/` ni `mobile/` | `shared/tsconfig.json` no incluye `../src/**` ni `../mobile/**` |
| `src/` NO importa de `mobile/` y viceversa | No hay path alias cruzado |
| Cada app es autocontenida | Cada una tiene su propio `package.json`, `node_modules`, build |
| Los shared son funciones puras | Si necesitás DOM o React, no va en `shared/` |
| `shared/` no tiene dependencias UI | Los iconos de `positions.ts` se resuelven en cada app |

### Configuración TypeScript

**Root `tsconfig.json`** (el actual, con una línea nueva):
```jsonc
{
  "compilerOptions": {
    // ... existente sin cambios ...
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["./shared/*"]    // ← NUEVO
    }
  }
}
```

**`shared/tsconfig.json`** (nuevo — aislamiento):
```jsonc
{
  "compilerOptions": {
    "target": "ES2017",
    "module": "esnext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "paths": {
      "@shared/*": ["./src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "__tests__"]
}
```

**`mobile/tsconfig.json`** (nuevo):
```jsonc
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../shared/src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "app/**/*.ts", "app/**/*.tsx"],
  "exclude": ["node_modules"]
}
```

**`mobile/metro.config.js`** (nuevo):
```js
const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const sharedRoot = path.resolve(projectRoot, "../shared");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [sharedRoot];
config.resolver.extraNodeModules = {
  "@shared": sharedRoot,
};

module.exports = config;
```

### Archivos que requieren adaptación

| Archivo | Problema | Solución |
|---------|----------|----------|
| `positions.ts` | Importa `lucide-react` | Exporta solo strings/enum. Cada app resuelve iconos: `lucide-react` (web) / `lucide-react-native` (mobile) |
| `payment-summary.ts` | `navigator.clipboard`, `window.open` | Solo se comparte `generatePaymentSummary()` y `getWhatsAppUrl()`. `copyToClipboard()` y `openWhatsApp()` quedan en cada app |
| `bet-result-utils.ts` | Exporta clases Tailwind (`ACCURACY_THEMES`) | Solo se comparte `evaluatePrediction()`. Los estilos quedan en cada app |

### Flujo de desarrollo

```
Cambiar pricing:
  1. Editar shared/lib/pricing.ts
  2. npm run test:shared         → tests pasan
  3. npm run typecheck           → web typea
  4. cd mobile && npx tsc --noEmit → mobile typea
  5. Commit → CI verifica todo

Cambiar UI web:
  1. Editar src/components/...
  2. npm run typecheck && npm run lint
  3. shared/ y mobile/ no se enteran

Cambiar UI mobile:
  1. Editar mobile/src/components/...
  2. cd mobile && npx tsc --noEmit
  3. src/ y shared/ no se enteran
```

### CI/CD actualizado

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  shared-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: cd shared && npm install && npm run test
      - run: cd shared && npx tsc --noEmit

  web-check:
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
    needs: [shared-check, web-check]
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
```

### Diagrama de aislamiento

```
┌─────────────────────────────────────────────────┐
│                  shared/                         │
│  ┌─────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │ types/  │ │ schemas/ │ │      lib/        │  │
│  │ (pure)  │ │  (zod)   │ │ (pure functions) │  │
│  └─────────┘ └──────────┘ └──────────────────┘  │
│  ┌─────────────────┐  ┌──────────────────────┐  │
│  │   __tests__/    │  │     hooks/           │  │
│  │   (vitest)      │  │ (useCurrency only)   │  │
│  └─────────────────┘  └──────────────────────┘  │
└──────────────────────┬──────────────────────────┘
                       │ importa
          ┌────────────┴────────────┐
          ▼                         ▼
┌──────────────────┐     ┌──────────────────┐
│     src/ (web)   │     │   mobile/ (expo) │
│                  │     │                  │
│  hooks/ (web)    │     │  hooks/ (mobile) │
│  lib/ (web)      │     │  lib/ (mobile)   │
│  components/     │     │  components/     │
│  app/ (routes)   │     │  app/ (routes)   │
│  types/ (web)    │     │  types/ (mobile) │
└──────────────────┘     └──────────────────┘

Flecha: shared/ → src/ y shared/ → mobile/
NUNCA al revés. NUNCA cruzado entre apps.
```

## Consecuencias

### Positivas
- 1 fuente de verdad para tipos, validaciones y reglas de negocio
- Zero riesgo al deploy actual — `npm run deploy` funciona idéntico
- Migración en 2-3 horas (no semanas)
- La lógica compartida es testeable independientemente con Vitest
- Si el proyecto crece a 5+ apps, se migra trivialmente a Turborepo

### Negativas
- Sin build caching (Turborepo lo daría)
- Sin versionado de paquetes (no se necesita en fase actual)
- Requiere `metro.config.js` watchFolders en el mobile

### Neutras
- Turborepo se puede agregar después si el build se vuelve lento
- La estructura `shared/` se convierte a `packages/` trivialmente

## Cuándo reconsiderar Turborepo

| Señal | Estado actual |
|-------|---------------|
| Build time >3 min por app | ❌ |
| >5 apps consumiendo shared | ❌ (serán 2) |
| >8 devs haciendo commits | ❌ |
| CI time >10 min bloqueando PRs | ❌ |
| Múltiples paquetes con dependencias circulares | ❌ |

Si alguna señal se materializa: agregar `turbo.json`, convertir `shared/` a workspace package con `package.json`. Son ~30 minutos de migración.

## Criterios de aceptación

- [x] Se decide estructura: directorio `shared/` con path aliases
- [x] Se define estructura completa de directorios
- [x] Se definen reglas de aislamiento
- [x] Se identifican archivos portables y los que requieren adaptación
- [x] Se diseña configuración TypeScript para web, shared y mobile
- [x] Se diseña configuración de Metro para Expo
- [x] Se define flujo de desarrollo y CI/CD
- [x] Se establece regla: UI no se comparte
- [x] Se ejecuta la migración de archivos a `shared/` — completado (issue #153)
- [ ] Se configuran tests en `shared/__tests__/` — pendiente (issue #156)

## Notas de implementación (issue #153)

### Estrategia de re-exports

Para evitar editar los 97 imports existentes en `src/`, los archivos originales en `src/lib/` y `src/types/` ahora son re-exports thin:

```ts
// src/lib/match-pricing.ts
export * from '@shared/lib/pricing'
```

Esto garantiza **zero breaking changes**: todos los imports `@/lib/*` y `@/types/bet` existentes siguen funcionando. Los componentes, hooks y API routes no necesitan modificarse.

### Adaptaciones realizadas

| Archivo shared | Adaptación | Detalle |
|---------------|-----------|---------|
| `lib/positions.ts` | Sin `lucide-react` | Solo exporta data strings/enum. Web agrega iconos via wrapper en `src/lib/positions.ts` |
| `lib/payment-summary.ts` | Sin browser APIs | Solo `generatePaymentSummary()` y `getWhatsAppUrl()`. El clipboard y window.open quedan en cada app |
| `lib/bet-result-utils.ts` | Sin cambios | `ACCURACY_THEMES` (clases Tailwind) se exporta igual — no afecta a mobile porque no lo importará |
| `lib/scoring.ts` | Importa `@shared/types/bet` | Antes era `bet-scoring.ts` con import `@/types/bet` |
| `lib/bet-utils.ts` | Imports a `@shared/*` | Cadena: bet-utils → scoring → types |

### Verificación

- `npm run typecheck`: 0 errores nuevos. Los 9 errores existentes son de `@tiptap` y `firebase` no instalados (preexistentes en develop)
- `npm run lint`: Error circular de ESLint preexistente
- `npm run build`: Falla por `@tiptap` y `firebase` — idéntico en develop sin cambios

### Directorio resultante

```
shared/
├── types/
│   ├── bet.ts              ← 534 líneas (tipos, interfaces, constantes)
│   └── index.ts
├── schemas/
│   ├── match-schema.ts     ← Zod schemas + interfaces
│   └── index.ts
├── lib/
│   ├── pricing.ts          ← match-pricing.ts
│   ├── currency.ts         ← formatCurrency
│   ├── dates.ts            ← date-utils.ts
│   ├── match-title.ts      ← getMatchTitleFromLocation
│   ├── scoring.ts          ← bet-scoring.ts
│   ├── bet-utils.ts        ← scoring, time, bracket, leaderboard
│   ├── bet-result-utils.ts ← evaluatePrediction, ACCURACY_THEMES
│   ├── sanitize.ts         ← sanitizeText
│   ├── positions.ts        ← POSITIONS (sin iconos)
│   ├── payment-summary.ts  ← generatePaymentSummary (sin browser APIs)
│   └── index.ts
├── hooks/                  ← Vacío (pendiente issue #154)
├── __tests__/              ← Vacío (pendiente issue #156)
├── tsconfig.json
└── package.json
```
