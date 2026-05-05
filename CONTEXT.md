# CONTEXT.md

Resumen operativo de la app para evitar re-analizar el repo en cada chat.

## 1) Stack y base técnica
- Next.js 16 (App Router) + React 19 + TypeScript (strict).
- Tailwind CSS 4 + CSS global en `src/app/globals.css`.
- Supabase (`@supabase/supabase-js`) para auth y DB.
- Alias: `@/* -> src/*`.
- Tema: `next-themes` con dark mode por defecto (`src/components/Providers.tsx`).

## 2) Comandos clave
- Dev: `npm run dev`
- Build: `npm run build`
- Lint: `npm run lint`

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
- `/match/[id]` Detalle del partido (runtime edge).

## 5) Archivos clave y responsabilidad
- `src/lib/supabase.ts`: cliente Supabase compartido.
- `src/hooks/useAuth.ts`: sesión/auth estado.
- `src/hooks/useMatches.ts`: CRUD de partidos + registros + conteos + utilidades.
- `src/hooks/useMatchRegistrationsRealtime.ts`: realtime de inscripciones.
- `src/components/MatchForm.tsx`: formulario crear partido.
- `src/components/MatchDetails.tsx`: inscripción, edición y armado de equipos.
- `src/app/create/page.tsx`: flujo crear + post-creación.
- `src/app/match/[id]/page.tsx`: detalle por id (edge runtime).

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

## 9) Decisiones recientes importantes
- Se quitó el bloque "Encuentros en curso" de la home pública (`/`) para no mostrar partidos sin login.
- El feed principal de partidos vive en vistas autenticadas (`/dashboard`, `/matches`).
- `src/app/match/[id]/page.tsx` está en runtime edge y usa params async.

## 10) Deploy / infraestructura
- Destino: Cloudflare Pages.
- Consideración: rutas dinámicas deben ser compatibles con edge runtime.
- Warning esperado en build: usar edge runtime deshabilita static generation para esa ruta.

## 11) Riesgos/errores frecuentes (para ahorrar tiempo)
- Error parse `<eof>` suele ser archivo truncado (faltan `}` o `)`), revisar:
	- `src/lib/supabase.ts`
	- `src/app/match/[id]/page.tsx`
- Si falla detalle de partido por id, revisar tipado params en App Router actual.
- Si algo se ve mal en light mode, revisar clases hardcodeadas (`slate`, `text-white`) en lugar de tokens (`bg-card`, `text-foreground`, etc.).

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

