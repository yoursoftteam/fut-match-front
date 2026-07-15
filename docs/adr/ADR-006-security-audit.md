# ADR-006: Auditoría de seguridad Supabase/API para multi-cliente

**Estado:** Aceptado  
**Fecha:** 2026-07-14  
**Decisor:** Equipo Parti2  
**Issue:** [#157](https://github.com/yoursoftteam/fut-match-front/issues/157)

---

## Contexto

Con la app móvil, la superficie de acceso crece: Supabase directo (browser), API routes (service role), push tokens, deep links y storage local. Antes de duplicar clientes, conviene auditar el estado actual de seguridad.

### Hallazgos del análisis del código

#### Uso de clientes Supabase

| Cliente | Dónde se usa | RLS |
|---------|-------------|-----|
| `supabase` (browser, `createBrowserClient`) | Hooks de React: `useMatches`, `useFrecuentes`, `useAuth`, `useMatchRegistrationsRealtime` | **Respeta RLS** |
| `getServiceClient()` (service role) | API routes: pools, leaderboard, predictions, admin, push | **BYPASS RLS** |
| `getAnonClient()` | API routes de lectura pública | **Respeta RLS** |
| `getAuthenticatedClient(token)` | Pocos usos | **Respeta RLS** |

#### Tablas con acceso público (INSERT/SELECT)

| Tabla | INSERT | SELECT | Protección |
|-------|--------|--------|-----------|
| `matches` | Solo auth (RLS) | Owner (RLS) | RLS |
| `match_registrations` | Cualquiera (RLS) | Cualquiera (RLS) | Trigger + RPC + unique index |
| `match_templates` | Owner (RLS) | Owner (RLS) | RLS |
| `bet_pools` | Via API (service role) | Via API (service role) | API route auth |
| `bet_match_predictions` | Via API (service role) | Via API (service role) | API route auth |
| `push_subscribers` | Público (INSERT/DELETE) | Service role only | **Sin RLS explícito** |

#### Funciones SECURITY DEFINER

| Función | Propósito | Riesgo |
|---------|-----------|--------|
| `register_for_match_public` | Registro anónimo con validación | Bypass RLS intencional — validación en la función |
| `unregister_self_from_match` | Auto-desinscripción con token hash | Bypass RLS intencional — verificación en la función |
| `get_public_match_by_id` | Exponer datos de partido sin RLS | Bypass RLS intencional — solo lectura |

#### API routes con service role

| Ruta | service role? | auth check | Riesgo |
|------|--------------|-----------|--------|
| `POST /api/v1/bet/pools` | Sí | Bearer token + getUser | Bypass RLS — crea pool directo |
| `GET /api/v1/bet/pools` | Sí | Bearer token + getUser | Bypass RLS — lee pools del usuario |
| `POST /api/v1/bet/pools/join` | Sí | Bearer token + getUser | Bypass RLS — upsert member |
| `POST /api/v1/bet/predictions` | Sí | Bearer token + getUser | Bypass RLS — upsert prediction |
| `GET /api/v1/bet/leaderboard` | Sí | Bearer token + getUser | Bypass RLS — lee scores |
| `POST /api/v1/bet/matches/[id]/predictions` | Sí | Bearer token + getUser | Bypass RLS — lee predicciones de pool |
| `POST /api/push/subscribe-topic` | Sí | Ninguno explícito | **Riesgo:任何人 puede suscribir tokens push** |

## Decisión

**Política clara: service role solo en BFF (Backend For Frontend) revisados; cliente móvil usa API typed para operaciones sensibles; Supabase directo solo cuando RLS esté auditado.**

### 1. Política de clientes Supabase

| Cliente | Uso permitido | Uso prohibido |
|---------|--------------|--------------|
| **Browser/Mobile client** (respeta RLS) | Lecturas directas: matches, templates, registrations | Escrituras sensibles sin API route |
| **API routes** (service role) | Operaciones que bypass RLS por diseño | Nunca exponer service role al cliente |
| **getAnonClient** | Solo lecturas públicas | Escrituras |

### 2. Inventario de seguridad (checklist vivo)

#### API Routes — auth por ruta

| Ruta | Método | Auth | Service role | Notas |
|------|--------|------|-------------|-------|
| `/api/v1/bet/pools` | GET | Bearer ✅ | Sí | Lee pools del usuario |
| `/api/v1/bet/pools` | POST | Bearer ✅ | Sí | Crea pool + invite code |
| `/api/v1/bet/pools/join` | POST | Bearer ✅ | Sí | Upsert member |
| `/api/v1/bet/predictions` | GET | Bearer ✅ | Sí | Lee predicciones del usuario |
| `/api/v1/bet/predictions` | POST | Bearer ✅ | Sí | Upsert prediction |
| `/api/v1/bet/leaderboard` | GET | Bearer ✅ | Sí | Lee leaderboard |
| `/api/v1/bet/matches` | GET | Bearer ✅ | Sí | Lista matches de torneo |
| `/api/v1/bet/matches/[id]` | GET | Bearer ✅ | Sí | Detalle de match |
| `/api/v1/bet/matches/[id]/predictions` | GET | Bearer ✅ | Sí | Predicciones de un match |
| `/api/v1/bet/teams` | GET | Bearer ✅ | Sí | Lista equipos |
| `/api/v1/bet/tournament-predictions` | GET/POST | Bearer ✅ | Sí | Predicciones de torneo |
| `/api/v1/bet/simulate-results` | POST | Admin ✅ | Sí | Solo admin |
| `/api/push/subscribe-topic` | POST | **Ninguno** ⚠️ | Sí | **Revisar** |
| `/api/push/subscribe-topic` | DELETE | **Ninguno** ⚠️ | Sí | **Revisar** |

#### Riesgos identificados y mitigaciones

| Riesgo | Severidad | Mitigación |
|--------|-----------|-----------|
| Push subscriptions sin auth | **Alta** | Agregar validación: el token push debe pertenecer al usuario autenticado, o hacer el endpoint público con rate limiting |
| Service role en API routes | **Media** | Aceptado: son BFF. Cada ruta valida Bearer token. Documentar por qué se bypass RLS |
| `vw_bet_pools_with_stats` con security_invoker bypass | **Media** | Aceptado: necesario para conteo. Monitorear que no exponga datos sensibles |
| Self-unregister tokens en localStorage/AsyncStorage | **Baja** | Tokens se hashean en server. exposure local requiere acceso físico al device |
| Deep links con pending invites | **Baja** | El código de invite es público (se comparte). El riesgo es que alguien se una a un pool — aceptable |

### 3. Storage local móvil — revisión

| Dato | Riesgo | Mitigación |
|------|--------|-----------|
| Self-unregister tokens | Bajo — se hashean en server | AsyncStorage suficiente |
| Pending invite code | Bajo — es un código público | AsyncStorage suficiente |
| Session token Supabase | **Medio** — permite impersonación | `expo-secure-store` (Keychain/Keystore) |
| Team builder state | Nulo — es UI local | AsyncStorage |

### 4. Checklist de seguridad para mobile

Antes de lanzar beta:

- [ ] Revisar `/api/push/subscribe-topic` — ¿necesita auth?
- [ ] Verificar que mobile client NO usa service role nunca
- [ ] Verificar que session token de Supabase se almacena en `expo-secure-store`, no AsyncStorage
- [ ] Verificar que self-unregister flow funciona igual en mobile (RPC + token hash)
- [ ] Rate limiting en API routes sensibles (predictions, pools)
- [ ] Revisar deep links: ¿pueden crear estados inconsistentes?
- [ ] Verificar que `expo-secure-store` se limpia en signOut

## Criterios de aceptación

- [x] Inventario de endpoints que usan service role y razón
- [x] Inventario de tablas/RPC expuestas a anon/authenticated
- [x] Checklist de 401/403 para rutas críticas
- [x] Revisión de storage local para tokens y sesión
- [x] Revisión de push subscriptions y permisos

## Consecuencias

### Positivas
- El equipo tiene un referencia clara de qué es seguro y qué necesita revisión
- El checklist de mobile previene errores comunes (exponer service role, storage inseguro)
- El inventario de API routes facilita auditorías futuras

### Negativas
- Algunos riesgos identificados no se Mitigan inmediatamente (push sin auth) — se Mitigan antes de beta
- El inventario es un documento vivo que necesita actualizarse

### Neutras
- La política de service role en BFF es estándar en la industria — no es un compromiso
- `expo-secure-store` es el estándar de Expo para secrets — no hay alternativa mejor
