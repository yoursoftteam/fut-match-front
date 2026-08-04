# ADR-009: UX nativa mobile-first en el auth (sobre paridad de card web)

**Estado:** Aceptado  
**Fecha:** 2026-08-03  
**Decisor:** Equipo Parti2  
**Relacionado:** [ADR-001](ADR-001-mobile-technology.md), Fase 1 (App móvil MVP)

---

## Contexto

Al portar el auth web (Next.js) a Expo, se replicó fielmente el diseño de `src/app/auth/page.tsx`:
card centrada con tokens oklch convertidos a hex, glow verde, botón neon y tipografías Space
Grotesk/Outfit.

La verificación en dispositivo (Expo Go, SDK 54) mostró dos problemas:

1. **Scroll incómodo**: la card centrada verticalmente no cabía en pantallas pequeñas, dejando
   contenido inalcanzable y una sensación de "página web incrustada".
2. **Look de card web**: un contenedor centrado tipo página no convence en móvil; se espera una
   UX nativa (formularios agrupados, contenido full-bleed, header compacto).

Además surgió un error de runtime `installTurboModule` en `react-native-worklets`: la versión
instalada (`0.10.2`) exigía RN 0.83–0.86 y su módulo nativo no existe en Expo Go (que embebe
`react-native-worklets@0.5.1`).

## Decisión

**Aceptada: rediseño mobile-first nativo para el auth, manteniendo la identidad de marca.**

- **Sin card flotante**: layout full-bleed sobre `colors.background` (#03060d), contenido alineado
  arriba (elimina el scroll de centrado; si el contenido excede, el ScrollView desplaza de forma
  natural).
- **Header compacto**: brand mark (cuadro 56px con borde continuo, fondo `colors.primary` + icono
  Zap), título Outfit 700 y subtítulo con `colors.mutedForeground`.
- **Formulario agrupado estilo iOS**: nuevo componente `FormGroup` (fondo `colors.card`, borde,
  `borderCurve: 'continuous'`, separadores hairline entre filas). `AuthField` pasa a variante
  borderless; el label se tiñe de `colors.primary` al enfocar.
- **Glow verde** replicando la web: gradiente radial real vía `experimental_backgroundImage`
  (New Architecture) + fallback de círculos superpuestos con baja opacidad (funciona en Expo Go y
  old architecture). La marca se mantiene: mismo verde `#00af67` y botón neon.
- **Animaciones de entrada** con Reanimated v4 (`FadeInUp` en header/contenido/footer) — no se usa
  el Animated API nativo de RN.
- **Reglas de skill aplicadas**: `Pressable` (sin `Touchable*`), ternarios en vez de `&&` con
  falsy, `gap`, `StyleSheet.create`, design system re-exportado desde `components/auth/index.ts`,
  fuentes por config plugin `expo-font` + `useFonts` (funciona en Expo Go sin rebuild).
- **`react-native-worklets` fijado a `0.5.1`** (la versión que Expo Go SDK 54 embebe) para que el
  JS coincida con el módulo nativo disponible y se elimina el conflicto de peers.

## Consecuencias

### Positivas
- Se siente nativa: formulario agrupado, contenido full-bleed, sin scroll fantasma.
- La marca web se conserva (fondo oscuro, glow verde, botón neon, tipografías).
- Menos superficie visual: header compacto + grupo de campos = menos scroll vertical.
- Versiones de Reanimated/worklets alineadas con Expo Go, eliminando el crash de arranque.

### Negativas
- El gradiente radial (`experimental_backgroundImage`) solo se renderiza en New Architecture; en
  Expo Go/old architecture se degrada al fallback de círculos (glow más suave, nunca se rompe).
- Reanimated agrega una dependencia con requisito estricto de versión frente al runtime embebido
  de Expo Go; cualquier upgrade de SDK debe re-verificar el pin de `react-native-worklets`.
- La UI web sigue siendo independiente: el cambio es aditivo en `mobile/`, no afecta a la web.

### Neutras
- Los componentes de marca (`components/auth/*`) quedan como base reutilizable para futuras
  pantallas móviles (dashboard, join, match).

## Criterios de aceptación

- [x] El auth mobile deja de mostrar la card web centrada con scroll incómodo
- [x] Los 4 flujos (login/signup/forgot/reset) usan el nuevo layout mobile-first y `FormGroup`
- [x] La marca (fondo #03060d, glow verde, botón neon, Space Grotesk/Outfit) se mantiene
- [x] El crash `installTurboModule` de worklets se resuelve fijando `react-native-worklets@0.5.1`
- [x] `mobile npx tsc --noEmit` pasa limpio
- [ ] Verificación visual en dispositivo (Expo Go): el glow usa el gradiente en New Architecture
  y el fallback de círculos en Expo Go
