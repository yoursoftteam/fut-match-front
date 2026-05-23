# CONTEXT.md

Resumen corto para retomar trabajo sin releer todo el repo.

## Stack
- Next.js 16 (App Router) + React 19 + TypeScript strict.
- Tailwind 4 + next-themes.
- Supabase (auth + DB) desde `src/lib/supabase.ts`.
- Alias: `@/* -> src/*`.

## Comandos
- `npm run dev`
- `npm run build`
- `npm run lint`

## Entorno
- Requeridas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- No commitear `.env.local`.

## Rutas principales
- `/` pública.
- `/auth` signin/signup/forgot/reset.
- `/create` crear partido.
- `/dashboard` usuario autenticado.
- `/matches` historial del usuario.
- `/match/[id]` detalle partido (mantener `runtime = "edge"`).

## Reglas de negocio clave
- Formato: `players_per_team` define titulares por equipo.
- Máximo 2 arqueros titulares.
- Se permiten arqueros alquilados (1 o 2) con costo extra.
- Costo por jugador: `(field_cost + rental_cost) / max_players`.
- `time` no existe como columna; se deriva de `date` (ISO).

## Estado funcional reciente (importante)
- Auth:
  - Flujo completo `signin | signup | forgot | reset` en `/auth`.
  - En cambio de modo se usa `router.replace` (evita estado pegado en reset).
  - Header en `/auth` no muestra bloque de usuario autenticado.
- Crear partido:
  - Ubicación obligatoria por defecto.
  - Checkbox `Aún no tenemos lugar` en step 1: deshabilita/oculta ubicación y quita obligatoriedad.
  - Si no hay lugar, se guarda `location = "Por definir"`.
- Títulos con ubicación pendiente:
  - Usar `getMatchTitleFromLocation` en `src/lib/match-title.ts`.
  - Si location es `Por definir`, título: `Ubicación pendiente por definir`.
- Frecuentes en detalle de partido:
  - `Remover de frecuentes` solo aparece cuando se abre con `?from=frecuentes`.
  - Se eliminó detección por contenido (location/formato) para evitar falsos positivos.
- Dashboard:
  - Sección `Mis Partidos` muestra solo creados en los últimos 7 días.

## Archivos sensibles
- `src/components/MatchDetails.tsx` y subcomponentes de `src/components/match-details/`.
- `src/hooks/useMatches.ts` (tipos + queries base).
- `src/app/auth/page.tsx` (modos y UX auth).
- `src/app/match/[id]/page.tsx` (edge runtime).

## Deploy Cloudflare
- Target: Cloudflare Pages.
- Mantener configuración de compatibilidad Node en `wrangler.jsonc`.
- Si falla build por rutas dinámicas, revisar runtime edge en `/match/[id]`.

## Checklist rápido
- `npm run build` exitoso.
- Home pública sin exponer feed privado.
- Flujo crear/editar conserva lógica de costos y arqueros.

## Brand manual
- Always use /docs/brand_manual.md as brand manual to UI/UX design

