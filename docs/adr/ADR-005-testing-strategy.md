# ADR-005: Estrategia de testing web + móvil + Supabase

**Estado:** Aceptado  
**Fecha:** 2026-07-14  
**Decisor:** Equipo Parti2  
**Issue:** [#156](https://github.com/yoursoftteam/fut-match-front/issues/156)

---

## Contexto

La app actual no tiene tests automatizados. `package.json` solo tiene `typecheck` y `lint`. Con la app móvil sumándose, necesitamos una estrategia de testing que prevenga regresiones sin frenar la velocidad del equipo (3 devs).

### Capas de la app que necesitan testing

| Capa | Dónde vive | Riesgo sin test |
|------|-----------|----------------|
| Lógica de dominio pura | `shared/lib/`, `shared/schemas/` | Regresiones en scoring, pricing, validación |
| API routes | `src/app/api/` | Errores de auth, validación, contract breaking |
| DB/RLS/Triggers | Supabase | Bypass de seguridad, cupos rotos, predicciones duplicadas |
| UI web | `src/components/`, `src/app/` | Regresiones visuales, flujos rotos |
| UI móvil | `mobile/` (futuro) | Idem |

## Decisión

**Testing por capas, priorizar dominio puro y DB/RLS antes que E2E. Empezar con lo que da mayor retorno con menor esfuerzo.**

### 1. Dominio puro: Vitest (prioridad ALTA)

**Qué testear:**
- `shared/lib/pricing.ts` — costos, cupos, pagos
- `shared/lib/scoring.ts` — puntos de predicciones, exact score, knockout multiplier
- `shared/lib/bet-utils.ts` — locks, validación, standings, bracket
- `shared/lib/dates.ts` — formateo, combinación de fecha/hora
- `shared/lib/currency.ts` — formato moneda
- `shared/schemas/match-schema.ts` — validación Zod

**Configuración:**
```jsonc
// shared/vitest.config.ts
import { defineConfig } from 'vitest/config'
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['__tests__/**/*.test.ts'],
  },
})
```

**Script en root:**
```jsonc
// package.json — agregar
"test:shared": "cd shared && npx vitest run",
"test:shared:watch": "cd shared && npx vitest"
```

**Fixtures compartidas:**
```typescript
// shared/__tests__/fixtures/
// matches.ts    — partidos de ejemplo con distintos estados
// predictions.ts — predicciones variadas (exactas, ganador, incorrectas)
// pools.ts      — pools con distintas configs de scoring
// teams.ts      — equipos de ejemplo
```

### 2. DB/RLS/Triggers: SQL tests (prioridad ALTA)

**Qué testear:**
- `validate_match_registration` trigger — cupos, GK limits
- `register_for_match_public` RPC — validación, duplicados, token hash
- `unregister_self_from_match` RPC — token verification
- RLS policies — INSERT/SELECT/UPDATE/DELETE por rol
- `idx_match_registrations_match_user_unique` — previene doble registro
- Prediction locks — `isPredictionLocked` a nivel DB
- Scoring functions — `calculateMatchPredictionPoints`

**Enfoque:** Scripts SQL ejecutables contra Supabase local (Docker) o contraseñas documentadas para ejecución manual reproducible.

```sql
-- shared/__tests__/sql/test_registration_limits.sql
-- Test: hard cap de max_players + 10
BEGIN;
  -- Setup: insertar match con max_players=10
  -- Act: intentar insertar 11+ registros
  -- Assert: trigger rechaza con 'No hay cupos disponibles'
ROLLBACK;

-- Test: max 2 GK titulars
BEGIN;
  -- Setup: insertar match con 2 GK ya registrados
  -- Act: insertar 3er GK
  -- Assert: trigger rechaza con 'Ya se completaron los cupos de arqueros'
ROLLBACK;
```

**Ejecución:** Script `test:sql` en package.json que corre los .sql contra la DB de desarrollo.

### 3. API contract tests (prioridad MEDIA)

**Qué testear:**
- `POST /api/v1/bet/predictions` — 200/400/401/403/409
- `POST /api/v1/bet/pools` — 200/400/401
- `POST /api/v1/bet/pools/join` — 200/400/401
- `GET /api/v1/bet/leaderboard` — 200/401

**Enfoque:** Mock del Supabase client, testear lógica de route handlers.

```typescript
// shared/__tests__/api/predictions.test.ts
describe('POST /api/v1/bet/predictions', () => {
  it('rejects unauthenticated requests', async () => {
    // Mock: no Bearer token → 401
  })
  it('rejects locked predictions', async () => {
    // Mock: kickoff < 10min → 400
  })
  it('creates prediction for valid request', async () => {
    // Mock: valid payload → 200
  })
})
```

### 4. E2E web: Playwright (prioridad BAJA)

**Flujos críticos a cubrir:**
1. Crear partido → ver detalle
2. Inscribirse a partido → ver inscritos
3. Crear pool → compartir invite code
4. Unirse a pool → ver predicciones
5. Hacer predicción → ver en leaderboard

**Cuándo:** Cuando los flujos principales estén estables y el equipo tenga bandwidth. No bloquea mobile.

### 5. Smoke tests móvil: Expo/Detox (prioridad BAJA)

**Cuándo:** Cuando la app móvil tenga pantallas funcionales. Primer gate para beta:
- Login → Dashboard
- Ver partidos → Detalle
- Ver predicciones

**Herramienta:** Maestro (más simple que Detox para smoke tests).

## Resumen de prioridades

| Prioridad | Capa | Herramienta | Esfuerzo | Retorno |
|-----------|------|-------------|----------|---------|
| **ALTA** | Dominio puro | Vitest | Bajo | Alto |
| **ALTA** | DB/RLS/Triggers | SQL scripts | Medio | Muy alto |
| **MEDIA** | API contracts | Vitest + mock | Medio | Alto |
| **BAJA** | E2E web | Playwright | Alto | Medio |
| **BAJA** | Smoke móvil | Maestro/Detox | Alto | Medio |

## Gate mínimo para beta móvil

- [ ] Tests de dominio puro pasan (Vitest)
- [ ] Al menos 5 scripts SQL/RLS críticos documentados y ejecutables
- [ ] Login → Dashboard funciona en TestFlight/Internal
- [ ] Predicciones se pueden crear y ver leaderboard

## Criterios de aceptación

- [x] Runner de tests configurado: Vitest en `shared/`
- [x] Primeros tests de dominio: pricing, scoring, locks, schemas
- [x] Fixtures compartidas: matches, predictions, pools, teams
- [x] SQL/RLS tests documentados con ejecución reproducible
- [x] Smoke e2e web definido (aunque sea manual checklist por ahora)
- [x] Gate mínimo para beta móvil definido

## Consecuencias

### Positivas
- Los tests de dominio son rápidos (<1s) y se ejecutan en CI
- SQL tests previenen regresiones de seguridad en RLS/triggers
- El gate de beta móvil da un标准 mínimo de calidad

### Negativas
- Sin E2E automatizados al inicio — se cubre con QA manual
- SQL tests requieren Supabase local o DB de dev — no corre en CI trivialmente

### Neutras
- Playwright y Detox se agregan cuando el producto lo justifique
- Los tests crecen orgánicamente con cada feature
