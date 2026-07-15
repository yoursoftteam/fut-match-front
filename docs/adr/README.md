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
| #158 | Notificaciones push multi-plataforma | ⏳ Pendiente | Requiere ADR-001 |
| #159 | Umbrella: Evolución web + móvil | ⏳ Pendiente | Requiere todas |
| #160 | PR: Implementación PWA | 🔄 En review | Independiente |
