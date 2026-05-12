# CONTEXT.md

Resumen operativo de la app para evitar re-analizar el repo en cada chat.

## 1) Stack y base técnica
- Next.js 16 (App Router) + React 19 + TypeScript (strict).
- Tailwind CSS 4 + CSS global en `src/app/globals.css`.
- Supabase con `@supabase/ssr` (`createBrowserClient`) para auth y DB — sesión en cookies.
- Alias: `@/* -> src/*`.
- Tema: `next-themes` con dark mode por defecto (`src/components/Providers.tsx`).
- Deploy target actual: **Cloudflare Pages** con build command `npx @cloudflare/next-on-pages@1`.

## 2) Comandos clave
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Preview CF: `npm run preview` (`opennextjs-cloudflare build && opennextjs-cloudflare preview`)
- Deploy CF: `npm run deploy` (`opennextjs-cloudflare build && opennextjs-cloudflare deploy`)
- Build Pages (dashboard CF): `npx @cloudflare/next-on-pages@1`

## 3) Variables de entorno requeridas
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Notas:
- Nunca commitear `.env.local`.
- `src/lib/supabase.ts` ya tiene cliente inicializado para uso app.

## 4) Rutas principales (App Router)
- `/` Landing pública (sin feed de partidos para no logueados).
- `/auth` Login/registro.
- `/create` Crear partido.
- `/dashboard` Vista principal para usuario autenticado.
- `/matches` Lista de partidos del usuario autenticado.
- `/match/[id]` Detalle del partido (Dynamic + `runtime = "edge"`, requerido por `next-on-pages`).

## 5) Archivos clave y responsabilidad
- `src/lib/supabase.ts`: cliente Supabase con `createBrowserClient` (sesión en cookies).
- `src/proxy.ts`: middleware Next.js 16 — protege `/dashboard`, `/matches`, `/match/*`, `/create`.
- `src/hooks/useAuth.ts`: sesión/auth estado.
- `src/hooks/useMatches.ts`: CRUD de partidos + registros + conteos + utilidades.
- `src/hooks/useMatchRegistrationsRealtime.ts`: realtime de inscripciones.
- `src/components/MatchForm.tsx`: formulario crear partido.
- `src/components/MatchDetails.tsx`: inscripción, edición y armado de equipos.
- `src/app/create/page.tsx`: flujo crear + post-creación.
- `src/app/match/[id]/page.tsx`: detalle por id (edge runtime).
- `src/components/BrandLogo.tsx`: logo reactivo por tema (dark: `p2-logo`, light: `p2-logo-black`) usado en home/create.
- `src/components/AppHeader.tsx`: branding del header en texto (`Parti` + `2`) con Inter bold italic.
- `src/app/layout.tsx`: footer global con correo de contacto (`contacto@parti2.co`).

## 6) Reglas de negocio relevantes
- Formato de partido: jugadores por equipo con límite configurable.
- Arqueros:
	- Máximo de arqueros titulares: 2.
	- Se puede configurar alquiler de arqueros (1 o 2) con costo extra.
	- Si ya hay 2 arqueros inscritos, no habilitar alquiler.
	- Alquiler registra jugadores automáticos como `Arquero Alquilado N`.
- Costo por jugador:
	- Base: costo cancha / total jugadores.
	- Si hay alquiler: `(costo cancha + alquiler) / total jugadores`.

## 7) Armado de equipos (`MatchDetails`)
- Tabs: `Inscripción`, `Jugadores`, `Equipos`.
- Team builder:
	- Distribución manual (drag & drop) + acciones rápidas + guardado.
	- Botón `Distribuir aleatoriamente` implementado.
	- Random respeta arqueros fijos (un arquero por equipo cuando aplica).
	- Cuando equipo está completo se marca visualmente en rojo (incluye badge "Completo").

## 8) UX/UI ya aplicados
- Dark mode por defecto.
- Estilo sport-tech con acentos vibrantes.
- Cards de partidos con jerarquía (nivel, estado, cupos, CTA).
- Microcopy más directo (tono retador).
- Header: marca en texto (no imagen) con tipografía Inter 700 italic.
- Colores del branding header por tema:
	- Dark: `Parti` blanco + `2` verde.
	- Light: `Parti` negro + `2` verde.

## 9) Decisiones recientes importantes
- Se quitó el bloque "Partidos en curso" de la home pública (`/`) para no mostrar partidos sin login.
- El feed principal de partidos vive en vistas autenticadas (`/dashboard`, `/matches`).
- `src/app/match/[id]/page.tsx` requiere `export const runtime = "edge"` para deploy con `next-on-pages`.
- `@supabase/ssr` reemplaza uso directo de `@supabase/supabase-js` para sesión en cookies.
- `sessionStorage` usado en lugar de `localStorage` para datos de pricing en `CreateMatchClient` y `MatchDetails`.
- Validación de nombre en `MatchDetails`: 2-100 chars.
- `router.refresh()` antes de push en `auth/page.tsx` para refrescar sesión.
- Errores de auth genéricos (sin exponer detalle interno).
- `wrangler.jsonc` fija `pages_build_output_dir: ".vercel/output/static"` y `compatibility_flags: ["nodejs_compat"]`.

## 10) Deploy / infraestructura
- Destino actual: **Cloudflare Pages**.
- Build output de Pages (tomado desde `wrangler.jsonc`): `.vercel/output/static`.
- Config clave de `wrangler.jsonc`: `pages_build_output_dir` + `compatibility_flags: ["nodejs_compat"]`.
- Para `next-on-pages`, rutas dinámicas no estáticas deben usar `runtime = "edge"` (ej. `/match/[id]`).
- `.vercel/` y `.open-next/` en `.gitignore`.
- Env vars a configurar en CF dashboard: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## 11) Riesgos/errores frecuentes (para ahorrar tiempo)
- Error parse `<eof>` suele ser archivo truncado (faltan `}` o `)`), revisar:
	- `src/lib/supabase.ts`
	- `src/app/match/[id]/page.tsx`
- Si falla detalle de partido por id, revisar tipado params en App Router actual.
- Si algo se ve mal en light mode, revisar clases hardcodeadas (`slate`, `text-white`) en lugar de tokens (`bg-card`, `text-foreground`, etc.).
- En deploy con `next-on-pages`, si aparece error de rutas no-edge, revisar que `/match/[id]` exporte `runtime = "edge"`.
- La columna `time` no existe en tabla `matches` — se deriva del campo `date` (ISO 8601).
- Si Cloudflare bloquea el campo "Build output directory", verificar `wrangler.jsonc` (ese archivo manda el valor).
- Si aparece `No such module "node:stream"` al publicar Functions, validar `compatibility_flags: ["nodejs_compat"]`.

## 12) Convenciones prácticas para futuras tareas
- Preferir tokens de tema sobre colores hardcodeados.
- Mantener `MatchDetails.tsx` estable (archivo grande y sensible a cambios masivos).
- Verificar siempre con `npm run build` después de tocar:
	- `src/lib/supabase.ts`
	- `src/app/match/[id]/page.tsx`
	- `src/components/MatchDetails.tsx`

## 13) Checklist rápido antes de cerrar cambios
- Compila (`npm run build`) sin errores.
- No se expone data de partidos en home pública.
- Estados de equipos completos siguen visibles en rojo.
- Flujo crear/editar partido mantiene costo y lógica de arqueros alquilados.
- Footer muestra mail de contacto con ícono y `mailto:contacto@parti2.co`.

