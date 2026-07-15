# ADR-008: Evolución web + móvil — Umbrella roadmap

**Estado:** Aceptado  
**Fecha:** 2026-07-14  
**Actualizado:** 2026-07-15 (scaffold mobile + auth flow)  
**Decisor:** Equipo Parti2  
**Issue:** [#159](https://github.com/yoursoftteam/fut-match-front/issues/159)

---

## Contexto

Este issue consolida todas las decisiones de arquitectura para la evolución web + móvil de Parti2. Es el mapa maestro que enlaza los ADRs anteriores y define el roadmap de ejecución.

## Stack consolidado

| Capa | Web | Mobile |
|------|-----|--------|
| **Framework** | Next.js 16 (App Router) | React Native + Expo SDK 54 (Expo Router) |
| **Language** | TypeScript strict | TypeScript strict (shared) |
| **UI** | Tailwind CSS 4 + shadcn/ui | NativeWind o componentes nativos |
| **Auth** | `@supabase/ssr` (PKCE, Cloudflare) | `@supabase/supabase-js` + `expo-secure-store` |
| **Data** | Direct Supabase queries + API routes | Online-first cache + mutation queue |
| **Realtime** | `supabase.channel()` | `supabase.channel()` + AppState handling |
| **Push** | Firebase Messaging (FCM) | Expo Notifications (APNs + FCM) |
| **Deploy** | Cloudflare Pages | EAS Build + Submit + Update |
| **Testing** | Vitest (domain) + Playwright (E2E) | Vitest (shared) + Maestro (smoke) |

## ADRs del proyecto

| ADR | Decisión | Estado |
|-----|----------|--------|
| [ADR-001](ADR-001-mobile-technology.md) | React Native + Expo | ✅ |
| [ADR-002](ADR-002-repository-structure.md) | shared/ directory con path aliases | ✅ |
| [ADR-003](ADR-003-data-sync-offline.md) | Online-first, caché, idempotencia | ✅ |
| [ADR-004](ADR-004-cicd-web-mobile.md) | Cloudflare Pages + EAS | ✅ |
| [ADR-005](ADR-005-testing-strategy.md) | Vitest + SQL + API contracts | ✅ |
| [ADR-006](ADR-006-security-audit.md) | Service role en BFF, checklist mobile | ✅ |
| [ADR-007](ADR-007-push-notifications.md) | Expo Notifications + tabla unificada | ✅ |

## Roadmap de ejecución

### Fase 0: Base ✅ (completada)

| Tarea | Issue | Estado |
|-------|-------|--------|
| Decidir tecnología móvil | #151 | ✅ ADR-001 |
| Decidir estructura de repo | #152 | ✅ ADR-002 |
| Extraer dominio a shared/ | #153 | ✅ Implementado |
| Diseñar datos/offline | #154 | ✅ ADR-003 |
| Alinear CI/CD | #155 | ✅ ADR-004 |
| Definir testing | #156 | ✅ ADR-005 |
| Auditar seguridad | #157 | ✅ ADR-006 |
| Diseñar push notifications | #158 | ✅ ADR-007 |

### Fase 1: App móvil MVP

| Tarea | Dependencia | Prioridad | Estado |
|-------|-------------|-----------|--------|
| Scaffold Expo Router | Fase 0 ✅ | ALTA | ✅ Expo SDK 54, Expo Router 6, src/app/ structure |
| Auth (login/signup/logout) | Scaffold | ALTA | ✅ AuthContext + AuthGate + SecureStore |
| Dashboard — mis partidos | Auth | ALTA | |
| Join partido vía invite code | Auth | ALTA | |
| Detalle partido + inscritos (realtime) | Auth | ALTA | |
| Crear partido (flujo multi-step) | Auth | ALTA | |
| Pools — crear/unirse | Auth | MEDIA | |
| Predicciones — crear/editar | Pools | MEDIA | |
| Leaderboard + realtime | Predicciones | MEDIA | |
| Frecuentes (templates) | Auth | MEDIA | |
| Perfil de usuario | Auth | BAJA | |

### Fase 2: Hardening

| Tarea | Dependencia |
|-------|-------------|
| Tests de dominio (Vitest en shared/) | Fase 0 ✅ |
| API contract tests | Fase 0 ✅ |
| SQL/RLS tests | Fase 0 ✅ |
| Cola de mutaciones offline | Fase 1 |
| Cache layer (AsyncStorage) | Fase 1 |
| Push notifications (Expo) | Fase 1 |
| E2E web (Playwright) | Fase 1 |
| Smoke tests móvil (Maestro) | Fase 1 |

### Fase 3: Nativizar y escalar

| Tarea | Dependencia |
|-------|-------------|
| UX nativa: gesture, haptics, animations | Fase 2 |
| Geolocalización (canchas cercanas) | Fase 2 |
| Cámara (compartir cancha) | Fase 2 |
| Offline selectivo por flujo | Fase 2 |
| EAS Submit a App Store / Play Store | Fase 2 |
| Evaluar separar API si es necesario | Fase 3 |

## Qué se comparte vs qué no

| Se comparte (shared/) | No se comparte |
|----------------------|---------------|
| Tipos y schemas (bet.ts, match-schema.ts) | UI components |
| Lógica de dominio (pricing, scoring, dates) | Hooks (web usa DOM, mobile usa nativo) |
| Constantes (POSITIONS, POOL_CONFIG) | Routing (Next.js vs Expo Router) |
| Utilidades puras (currency, sanitize) | Auth client (@supabase/ssr vs @supabase/supabase-js) |
| Validación (zod schemas) | Storage (localStorage vs AsyncStorage) |

## Riesgos mitigados

| Riesgo | Mitigación (ADR) |
|--------|-----------------|
| Drift web/mobile | ADR-002: shared/ con path aliases |
| Seguridad inconsistente | ADR-006: service role en BFF |
| Offline subestimado | ADR-003: online-first, mutaciones seguras |
| Push trivial | ADR-007: Expo Notifications + tabla unificada |
| Sin tests | ADR-005: Vitest + SQL tests |
| CI roto | ADR-004: solo agrega, no modifica |

## Criterios de cierre

- [x] Todas las subissues tienen ADR o implementación
- [x] MVP móvil definido (Fase 1)
- [x] Estructura de repo decidida
- [x] Qué se comparte definido
- [x] Estrategia de datos/offline/realtime definida
- [x] CI/CD alineado
- [x] Gate de testing definido

## Consecuencias

### Positivas
- El equipo tiene un mapa claro de qué construir y en qué orden
- Cada fase tiene dependencias explícitas — no se salta nada
- Los ADRs documentan el por qué de cada decisión

### Negativas
- El roadmap es una estimación — puede cambiar prioridades según feedback de usuario
- La Fase 1 (MVP) es el trabajo pesado — requiere 2-3 semanas de desarrollo

### Neutras
- Las fases son guías, no bloques rígidos
- Se puede trabajar en Fase 2 (tests) en paralelo con Fase 1 (features)
