# ADR-003: Datos, sincronización, realtime y offline para móvil

**Estado:** Aceptado  
**Fecha:** 2026-07-14  
**Decisor:** Equipo Parti2  
**Issue:** [#154](https://github.com/yoursoftteam/fut-match-front/issues/154)  
**Implementación:** [#169](https://github.com/yoursoftteam/fut-match-front/issues/169)

---

## Contexto

La app móvil necesita manejar datos en escenarios de conectividad variable (canchas de fútbol, transporte, zonas sin señal). El issue plantea definir qué datos se cachean, qué mutaciones pueden ser offline, cómo se manejan reintentos duplicados, y qué reemplaza a `localStorage` en React Native.

### Estado actual (web)

La app web es 100% online-first con cero caché:
- Queries directas a Supabase desde el browser (sin SWR, React Query, ni cache)
- Realtime para registros de partido y leaderboard
- Self-unregister tokens y equipos en `localStorage`
- Mutaciones sensibles (cupos, predicciones) con validación server-side
- Service worker solo para push (FCM), no para caché

### Superficie de mutaciones analizada

| Entidad | Operaciones | Idempotente | Seguro offline |
|---------|------------|-------------|----------------|
| **matches** | CREATE, UPDATE, DELETE | CREATE: NO, resto: SÍ | Solo UPDATE/DELETE |
| **match_registrations** | REGISTER (3 paths), UNREGISTER, TOGGLE PAY, UPDATE POSITION | Logged-in: SÍ (unique index), Anonymous: NO | NO — cupos son recurso compartido |
| **match_templates** | CREATE, UPDATE, DELETE, USAGE_COUNT | CREATE con match_id: SÍ (upsert), sin match_id: NO | Parcialmente |
| **bet_pools** | CREATE, JOIN | CREATE: NO, JOIN: SÍ (upsert) | Solo JOIN |
| **bet_match_predictions** | CREATE/UPDATE | SÍ (unique constraint) | SÍ — recurso privado del usuario |

### Reglas de negocio en DB que protegen integridad

| Mecanismo | Tabla | Qué protege |
|-----------|-------|-------------|
| Trigger `validate_match_registration` | match_registrations | Cap duro `max_players + 10`. Max 2 GK titulars |
| Partial unique index | match_registrations | `(match_id, user_id) WHERE user_id IS NOT NULL` |
| RPC `register_for_match_public` | match_registrations | Validación nombre, token, duplicado user_id |
| RPC `unregister_self_from_match` | match_registrations | Hash token antes de DELETE |
| UNIQUE constraints | bet_pools, bet_pool_members, bet_match_predictions | Previene duplicados exactos |

## Decisión

**Online-first con caché tolerante + cola de mutaciones con idempotencia para operaciones sensibles.**

### 1. Estrategia de caché por tipo de dato

| Dato | Caché | TTL | Invalidación | Razonamiento |
|------|-------|-----|-------------|-------------|
| **Partidos del usuario** (`matches`) | Sí, AsyncStorage | 5 min | Realtime o pull-to-refresh | Lee frecuentemente, cambia poco |
| **Inscritos de un partido** (`match_registrations`) | Sí, solo en memoria | 30s | Realtime (ya existe) | Cambia rápido, pero caché corta evita flash de carga |
| **Frecuentes** (`match_templates`) | Sí, AsyncStorage | 10 min | CRUD local invalida | Datos estables del usuario |
| **Pools** (`bet_pools`) | Sí, AsyncStorage | 5 min | Realtime o pull-to-refresh | Lectura frecuente |
| **Predicciones del usuario** (`bet_match_predictions`) | Sí, AsyncStorage | 1 min | Mutación local invalida | Privadas, cambian cuando el usuario edita |
| **Partidos de torneo** (`bet_matches`) | Sí, AsyncStorage | 10 min | Manual refresh | Datos estáticos del torneo |
| **Equipos** (`bet_teams`) | Sí, AsyncStorage | 24h | Nunca (datos maestros) | Catálogo estático |
| **Leaderboard** | Solo memoria | Nada | Realtime (ya existe) | Tiene realtime dedicado |
| **Cupos en vivo** | **NO caché** | — | Realtime | Recurso compartido, stale data = conflictos |

#### Implementación de caché

```typescript
// mobile/src/lib/cache.ts — capa de caché genérica
interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

async function getCached<T>(key: string): Promise<T | null>
async function setCache<T>(key: string, data: T, ttlMs: number): Promise<void>
async function invalidateCache(pattern: string): Promise<void>
```

- **Storage**: `expo-file-system` o `@react-native-async-storage/async-storage` (no expo-secure-store — eso es para secrets)
- **Keys**:_prefijo por dominio: `cache:matches:{userId}`, `cache:predictions:{userId}:{poolId}`
- **Fallback**: si el cache falla, la app funciona online normalmente

### 2. Mutaciones offline vs online

| Operación | Modo | Estrategia |
|-----------|------|-----------|
| **Registrar a un partido** | ONLINE ONLY | Rechazar offline con toast: "Necesitás conexión para inscribirte" |
| **Auto-desinscribirse** | ONLINE ONLY | Requiere RPC con token hash |
| **Crear partido** | OFFLINE OK (borrador) | Guardar localmente, sincronizar al reconnectear. **NO publicar** hasta online |
| **Editar partido** | OFFLINE OK | Actualizar caché local, sync al reconectar |
| **Eliminar partido** | ONLINE ONLY | Operación destructiva, requiere confirmación + conexión |
| **Crear/editar predicción** | OFFLINE OK | Guardar localmente, upsert al reconectar (unique constraint previene duplicados) |
| **Unirse a pool** | ONLINE ONLY | Requiere invite_code validation server-side |
| **Crear pool** | ONLINE ONLY | Genera invite_code único server-side |
| **CRUD Templates** | OFFLINE OK | Datos privados del usuario, sync al reconectar |
| **Toggle pago** | ONLINE ONLY | Afecta estado financiero de otros |
| **Actualizar posición** | ONLINE ONLY | Afecta composición del equipo |

#### Cola de mutaciones offline

```typescript
// mobile/src/lib/mutation-queue.ts
interface PendingMutation {
  id: string                    // UUID local
  entity: string                // 'match' | 'prediction' | 'template'
  operation: 'create' | 'update' | 'delete'
  payload: Record<string, unknown>
  clientRequestId: string       // Para idempotencia server-side
  createdAt: number
  retryCount: number
  status: 'pending' | 'syncing' | 'failed'
}
```

- **Almacenada en**: AsyncStorage (no es dato sensible, solo borradores)
- **Al reconectar**: procesar cola en orden FIFO, con retry exponencial (1s, 2s, 4s, max 3 retries)
- **Si falla después de 3 retries**: marcar como `failed`, mostrar badge de alerta al usuario
- **Conflicto**: si el server retorna 409 o 400, descartar la mutación y refrescar datos del servidor

### 3. Idempotencia para mutaciones sensibles

#### Patrón `client_request_id`

Cada mutación que **no es inherentemente idempotente** debe enviar un `client_request_id` (UUID v4 generado en el cliente). El server lo usa para prevenir procesamiento duplicado.

**Mutaciones que necesitan `client_request_id`:**

| Mutación | Por qué | Cómo se usa en server |
|----------|---------|---------------------|
| Registrar a partido (anonymous) | Sin unique index en `(match_id, name)` | Guardar en tabla `idempotency_keys` con TTL 24h. Si ya existe, retornar la registración previa |
| Crear partido | Retry crea duplicado | Guardar en `idempotency_keys`. Si ya existe, retornar el match previo |
| Crear pool | Retry crea pool duplicado con distinto invite_code | Guardar en `idempotency_keys`. Si ya existe, retornar el pool previo |

**Mutaciones que NO necesitan `client_request_id` (ya son idempotentes):**

| Mutación | Razón |
|----------|-------|
| Registrar (logged-in) | Partial unique index en DB |
| Predicciones | Unique constraint `(user_id, match_id, mode, pool_id)` |
| Unirse a pool | Upsert con `onConflict` |
| Cualquier UPDATE | Aplicar el mismo update 2x es harmless |
| Cualquier DELETE | Segundo DELETE es no-op |

#### Tabla `idempotency_keys` (nueva, en Supabase)

```sql
CREATE TABLE idempotency_keys (
  key TEXT PRIMARY KEY,           -- client_request_id (UUID)
  user_id UUID REFERENCES auth.users(id),
  entity TEXT NOT NULL,
  operation TEXT NOT NULL,
  response JSONB,                 -- Respuesta cacheada (200)
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL  -- created_at + 24h
);

-- Auto-limpieza
SELECT cron.schedule(
  'cleanup-idempotency-keys',
  '0 3 * * *',
  $$DELETE FROM idempotency_keys WHERE expires_at < now()$$
);
```

### 4. Supabase Realtime en móvil

#### Foreground

```typescript
// Patrón similar al web, con manejo de reconexión
const channel = supabase
  .channel(`match-${matchId}`)
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'match_registrations',
    filter: `match_id=eq.${matchId}`,
  }, handleRealtimeUpdate)
  .subscribe((status) => {
    if (status === 'CHANNEL_ERROR') {
      // Exponential backoff reconnect
      setTimeout(() => reconnect(), 2000)
    }
  })
```

#### Background ( AppState)

```typescript
import { AppState } from 'react-native'

// Cuando la app pasa a background:
// - Desuscribir canales de realtime (ahorra batería)
// - No procesar la cola de mutaciones

// Cuando la app vuelve a foreground:
// - Re-suscribir canales
// - Procesar cola de mutaciones pendientes
// - Forzar refresh de datos stale

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    resubscribeRealtimeChannels()
    processMutationQueue()
    refreshStaleData()
  } else if (state === 'background') {
    unsubscribeRealtimeChannels()
  }
})
```

#### Datos con vs sin realtime

| Dato | Realtime en móvil | Razón |
|------|-------------------|-------|
| match_registrations (detalle partido) | SÍ | El usuario está viendo la lista de inscritos |
| bet_scores_aggregate (leaderboard) | SÍ | Competencia en vivo |
| match_registrations (dashboard) | NO | Pull-to-refresh es suficiente |
| matches del usuario | NO | Pull-to-refresh es suficiente |
| bet_matches (torneo) | NO | Datos estáticos del fixture |

### 5. Storage móvil (reemplazo de localStorage)

| localStorage actual | Reemplazo en móvil | Razón |
|--------------------|--------------------|-------|
| `parti2:self-unregister:{matchId}` | **AsyncStorage** | Tokens de autodesinscripción, no son secrets (se hashean en server) |
| `teams-{matchId}` | **AsyncStorage** | Estado UI local del team builder |
| `p2:pendingInvite` | **AsyncStorage** | Código de invitación temporal |
| `dashboard-alias-dismissed` | **AsyncStorage** | Flags de UI |
| `dashboard-position-dismissed` | **AsyncStorage** | Flags de UI |

**No se usa `expo-secure-store`** para ninguno de estos porque:
- No son secrets (el token se hashea en server antes de almacenar)
- `expo-secure-store` tiene límite de 2KB por valor
- AsyncStorage es más simple y suficiente

**`expo-secure-store`** se reservará para:
- Session token de Supabase (si `@supabase/ssr` no lo maneja via Keychain)
- Cualquier API key futura que necesite persistencia segura

### 6. Resolución de conflictos

| Escenario | Resolución |
|-----------|-----------|
| 2 usuarios toman el último cupo simultáneamente | Server rejected: trigger `validate_match_registration` retorna error. El segundo usuario recibe "No hay cupos disponibles" |
| Predicción editada offline y en otro device | Al sync, el último写入 gana (upsert por unique constraint). El usuario ve el valor más reciente al refrescar |
| Match editado offline y eliminado por otro | Sync recibe 404. La mutación se descarta, se refrescan datos del servidor |
| Template creado offline y ya existe | Upsert por `(user_id, match_id)` resuelve. Si no hay match_id, se crea duplicado (aceptable en fase 1) |

## Criterios de aceptación

- [x] Se define qué datos se cachean: fixtures, pools, partidos, registrations (solo lectura), predicciones, ranking
- [x] Se define qué mutaciones pueden ser offline/draft: predicciones y templates sí; inscripciones, pagos, pool creation no
- [x] Se diseña `client_request_id` / idempotencia para: registro anónimo, creación de partido, creación de pool
- [x] Se define estrategia de Supabase Realtime en foreground/background (suscribir/desuscribir con AppState)
- [x] Se define storage móvil: AsyncStorage para todo, expo-secure-store solo para secrets
- [x] Se define resolución de conflictos para cada escenario

## Consecuencias

### Positivas
- La app funciona con conectividad intermitente (canchas, transporte)
- Las predicciones no se pierden por mala conexión
- Los cupos se protegen server-side — no hay sobreventa
- El patrón de caché es genérico y reutilizable

### Negativas
- La tabla `idempotency_keys` necesita una migración en Supabase
- La cola de mutaciones agrega complejidad en mobile
- Los usuarios anónimos que se registran offline no tienen protección contra duplicados (aceptable: es edge case)

### Neutras
- Web no se ve afectada — la estrategia es solo para mobile
- Fase 2 puede agregar offline completo para más operaciones si el producto lo requiere
- La caché se invalida agresivamente — priorizamos freshness sobre performance

## Archivos compartidos relevantes

Los siguientes archivos en `shared/` son consumidos por la lógica de datos mobile:
- `shared/lib/bet-utils.ts` — `isPredictionLocked()`, `validatePredictionScores()`
- `shared/schemas/match-schema.ts` — Validación de formularios
- `shared/types/bet.ts` — Tipos de entidades

## Próximos pasos (fuera de este issue)

1. Migración SQL: crear tabla `idempotency_keys` + cron de limpieza
2. Implementar `cache.ts` genérico en `mobile/src/lib/`
3. Implementar `mutation-queue.ts` en `mobile/src/lib/`
4. Implementar manejo de `AppState` para realtime
5. Migrar hooks de datos a patrón con caché
