# Architecture Decision Records

Los ADRs documentan las decisiones arquitectónicas clave del proyecto Parti2.

## Formato

Cada ADR sigue la plantilla de [Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions):

- **Estado**: Propuesto | Aceptado | Obsoleto | Reemplazado por [ADR-XXX](link)
- **Contexto**: Situación y fuerzas que motivan la decisión
- **Decisión**: Qué se decidió
- **Consecuencias**: Impacto positivo, negativo y neutro
- **Criterios de aceptación**: Qué validó que la decisión era correcta

## Índice

| ADR | Título | Estado | Issue |
|-----|--------|--------|-------|
| [001](ADR-001-mobile-technology.md) | Tecnología del cliente móvil | Aceptado | [#151](https://github.com/yoursoftteam/fut-match-front/issues/151) |
| [002](ADR-002-repository-structure.md) | Estructura de repositorio web + móvil | Aceptado | [#152](https://github.com/yoursoftteam/fut-match-front/issues/152), [#153](https://github.com/yoursoftteam/fut-match-front/issues/153) |
| [003](ADR-003-data-sync-offline.md) | Datos, sincronización, realtime y offline | Aceptado | [#154](https://github.com/yoursoftteam/fut-match-front/issues/154) |
| [004](ADR-004-cicd-web-mobile.md) | CI/CD web + móvil | Aceptado | [#155](https://github.com/yoursoftteam/fut-match-front/issues/155) |
| [005](ADR-005-testing-strategy.md) | Estrategia de testing web + móvil + Supabase | Aceptado | [#156](https://github.com/yoursoftteam/fut-match-front/issues/156) |
| [006](ADR-006-security-audit.md) | Auditoría seguridad Supabase/API | Aceptado | [#157](https://github.com/yoursoftteam/fut-match-front/issues/157) |
| [007](ADR-007-push-notifications.md) | Notificaciones push web + iOS + Android | Aceptado | [#158](https://github.com/yoursoftteam/fut-match-front/issues/158) |
| [008](ADR-008-umbrella-roadmap.md) | Evolución web + móvil — Umbrella roadmap | Aceptado | [#159](https://github.com/yoursoftteam/fut-match-front/issues/159) |
| [009](ADR-009-mobile-auth-ux.md) | UX nativa mobile-first en el auth | Aceptado | — |

## Issues de arquitectura (roadmap)

| Issue | Título | Estado | Dependencia |
|-------|--------|--------|-------------|
| #151 | Tecnología del cliente móvil | ✅ Cerrada (ADR-001) | — |
| #152 | Estructura de repositorio | ✅ Cerrada (ADR-002) | — |
| #153 | Extraer dominio, tipos, schemas | ✅ Completado | Requiere ADR-002 |
| #154 | Datos, sincronización, offline | ✅ Completada (ADR-003) | Requiere ADR-001 |
| #155 | CI/CD web + móvil | ✅ Completada (ADR-004) | Requiere ADR-002 |
| #156 | Estrategia de testing | ✅ Completada (ADR-005) | Requiere ADR-002 |
| #157 | Auditoría seguridad Supabase/API | ✅ Completada (ADR-006) | Independiente |
| #158 | Notificaciones push multi-plataforma | ✅ Completada (ADR-007) | Requiere ADR-001 |
| #159 | Umbrella: Evolución web + móvil | ✅ Completada (ADR-008) | Requiere todas |
| #160 | PR: Implementación PWA | 🔄 En review | Independiente |
| #169 | Implementar ADR-003 (caché/mutaciones/realtime) | 🔲 Pendiente | Requiere Fase 1 |

## Auth parity web → mobile (módulo auth)

| Capacidad | Web | Mobile | Estado |
|-----------|-----|--------|--------|
| Email/password login | ✅ | ✅ | ✅ |
| Signup (full_name + alias) | ✅ | ✅ | ✅ |
| Google OAuth | ✅ `signInWithOAuth` | ✅ `expo-auth-session` + deep link | ✅ |
| Forgot / reset password | ✅ | ✅ `forgot.tsx` + `reset.tsx` | ✅ |
| Detección de admin (`admin_users`) | ✅ | ✅ `isAdmin` en AuthContext | ✅ |
| Error messages compartidos | inline | ✅ `shared/lib/auth-errors.ts` | ✅ |
| Pending invite (pool join) | ✅ localStorage | ✅ AsyncStorage + `EXPO_PUBLIC_API_URL` | ✅ |
| Deep links `parti2://` | n/a | ✅ `auth/callback`, `auth/confirm`, `/join/<code>` | ✅ |
| Paridad visual (marca web) | tokens oklch + glow + card | ✅ `theme/tokens.ts` + `components/auth/*` (tokens hex, Space Grotesk/Outfit, glow, neon button) | ✅ |
| UX nativa mobile-first | card web centrada | ✅ [ADR-009](ADR-009-mobile-auth-ux.md): full-bleed, `FormGroup` iOS, glow gradiente + fallback, Reanimated v4, `worklets@0.5.1` | ✅ |

> Config de Supabase dashboard pendiente para mobile: agregar redirect URL del app (Expo Go/standalone) en Auth → URL Configuration, registrar OAuth client de Google para iOS/Android, y apuntar templates de email de confirmación/reset al deep link del app.

## Estado de Fase 1 (App móvil MVP)

| Tarea | Estado | Notas |
|-------|--------|-------|
| Scaffold Expo Router | ✅ | Expo SDK 54, Expo Router 6, src/app/ structure |
| Auth (login/signup/logout) | ✅ | AuthContext + AuthGate + SecureStore PKCE + Google OAuth (deep link), forgot/reset, isAdmin, invite bridge |
| Dashboard | 🔲 | Pendiente |
| Join partido vía invite code | 🔲 | Pendiente |
| Detalle partido + realtime | 🔲 | Pendiente |
| Crear partido (multi-step) | 🔲 | Pendiente |
| Pools | 🔲 | Pendiente |
| Predicciones | 🔲 | Pendiente |
| Leaderboard | 🔲 | Pendiente |
| Frecuentes (templates) | 🔲 | Pendiente |
| Perfil de usuario | 🔲 | Pendiente |
