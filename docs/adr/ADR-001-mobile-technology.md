# ADR-001: Tecnología del cliente móvil

**Estado:** Aceptado  
**Fecha:** 2026-07-14  
**Decisor:** Equipo Parti2  
**Issue:** [#151](https://github.com/yoursoftteam/fut-match-front/issues/151)

---

## Contexto

Parti2 necesita publicar en App Store y Google Play. El equipo conoce Next.js/Supabase/TypeScript y no tiene experiencia móvil previa. Las prioridades declaradas son:

1. **Mantenibilidad y escalabilidad** a largo plazo
2. **Velocidad** de desarrollo
3. **Experiencia nativa** óptima

La web actual usa Next.js App Router, React 19, TypeScript strict, Supabase, Tailwind/shadcn y Firebase FCM. Muchas pantallas son client-side y dependen de DOM APIs, localStorage, service workers y navegación Next.js.

## Opciones evaluadas

### 1. React Native + Expo

| Aspecto | Detalle |
|---------|---------|
| **Reutiliza** | TypeScript, lógica de dominio, Supabase JS, zod, mentalidad React |
| **No reutiliza** | UI web (shadcn/Tailwind), navegación Next.js, service worker |
| **Capacidades** | App Store/Google Play, deep links, push nativo, cámara/geolocalización, OTA updates |
| **Curva de aprendizaje** | React → React Native (moderada) |
| **Mantenibilidad** | 1 codebase de lógica, UI nativa separada |

### 2. PWA mejorada

| Aspecto | Detalle |
|---------|---------|
| **Reutiliza** | Todo el codebase web existente |
| **Capacidades** | Push web limitado, sin offline robusto, sin App Store nativo |
| **Restricciones** | No satisface requisito de tiendas; limitaciones de push/background/storage |
| **Riesgo** | Perpetúa acoplamiento a DOM |

### 3. Capacitor (wrap nativo)

| Aspecto | Detalle |
|---------|---------|
| **Reutiliza** | Todo el codebase web |
| **Capacidades** | Shell nativo, plugins para cámara/GPS, push via Firebase |
| **Restricciones** | Rendimiento inferior a RN; dependencia de plugins de terceros |

### 4. Flutter

| Aspecto | Detalle |
|---------|---------|
| **Reutiliza** | Nada de TypeScript/zod |
| **Introduce** | Dart, nuevo ecosistema |
| **Restricciones** | Casi nula reutilización de código existente |

### 5. Nativo Swift/Kotlin

| Aspecto | Detalle |
|---------|---------|
| **Reutiliza** | Nada |
| **Introduce** | Dos lenguajes, dos codebases |
| **Restricciones** | Curva alta, mantenimiento doble |

## Decisión

**Aceptada: React Native + Expo**

Justificación:

- **~60% de la lógica de negocio es portable**: 22 hooks, funciones puras en `src/lib/` (pricing, currency, dates, scoring, match titles), tipos en `src/types/bet.ts`, schemas Zod v4
- **Supabase JS funciona idéntico** en React Native — el cliente browser-only con PKCE es portable sin cambios
- **Firebase FCM ya está integrado** — Expo Notifications complementa nativamente
- **Deep links** para `/join/[code]`, `/j/[code]`, `/match/[id]` se mapean directamente via Expo Linking
- **OTA updates** permiten iterar sin pasar por revisión de tiendas
- **Expo simplifica** build, test y deployment (EAS Build, Expo Go para desarrollo)

## Consecuencias

### Positivas
- 1 codebase de lógica compartida entre web y móvil
- Supabase, zod, tipos y hooks son directamente reutilizables
- Push notifications nativas sin limitaciones de web push
- Acceso a cámara, geolocalización y capacidades nativas futuras
- Equipo aprende React Native (transferencia de conocimiento React)

### Negativas
- UI web (shadcn/Tailwind) no se reutiliza — se recrea con componentes nativos
- Navegación Next.js App Router se reemplaza por Expo Router
- Service worker dinámico se reemplaza por Expo Notifications
- Curva de aprendizaje inicial: navegación, permisos, storage, builds, performance móvil
- No se intenta compartir UI completa entre web y móvil

### Neutras
- PWA puede servir como puente temporal, no como arquitectura objetivo
- Se mantiene la web Next.js como cliente principal existente

## Criterios de aceptación

- [x] Se documenta por qué Expo/RN se acepta y las demás opciones se descartan
- [x] Se confirma que Supabase JS, zod y tipos son portables
- [x] Se establece regla: UI web no se comparte hasta que haya tokens/contratos estables
- [ ] Se define MVP móvil inicial: rutas/flujos incluidos y excluidos (pendiente en issue de roadmap)
- [ ] Se confirma si cámara/geolocalización son requisitos de fase 1 o futuros
- [ ] Se define estrategia de deep links para `/join/[invite_code]`, `/j/[code]`, `/match/[id]`
