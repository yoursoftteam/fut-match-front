# Parti2 Bet: Flujo de Creacion de Torneo e Invitacion

## 1. Objetivo del flujo

Este documento define el onboarding de creacion, invitacion e ingreso a una polla de Parti2 Bet en `parti2.app`. La meta de producto es reducir friccion: el creador arma la polla en menos de un minuto, comparte el link sin pensar demasiado y el invitado queda dentro del torneo despues de autenticarse, sin caer en el home ni perder el contexto.

La experiencia sigue el principio de marca: "Menos chat, mas juego". Visualmente debe sentirse dark mode nativo, con superficies slate profundas, texto off-white y acciones en verde neon `#22C55E`.

## 2. Principios UX y producto

- Friccion minima: maximo 3 pasos para crear una polla; defaults listos para no obligar a editar reglas.
- Retencion del contexto: todo link de invitacion se conserva por cookie, URL y `localStorage` hasta completar el join.
- Optimismo controlado: la UI avanza de inmediato a un estado de exito pendiente, pero no habilita compartir hasta recibir el `invite_code` real.
- Copy directo: frases cortas, urbanas y accionables. Evitar textos corporativos o explicaciones largas.
- Accesibilidad: controles semanticos, targets tactiles de minimo 44px, foco visible, `aria-live` para feedback y modal con focus trap.

## 3. Modelo funcional

Tablas base existentes:

- `bet_pools`: guarda la polla, `owner_id`, `visibility` e `invite_code` unico de 10 caracteres.
- `bet_pool_members`: relacion idempotente entre `pool_id` y `user_id` con `UNIQUE(pool_id, user_id)`.
- `bet_pool_config_versions`: versiona reglas de scoring, lock de predicciones y freeze futuro.
- `bet_match_predictions`: guarda predicciones por usuario y polla.

Endpoints propuestos:

- `POST /api/v1/bet/pools`: crea polla, reglas iniciales, owner como miembro y devuelve el link canonico de invitacion.
- `GET /api/v1/bet/invites/[invite_code]`: valida codigo y devuelve preview seguro de la polla.
- `POST /api/v1/bet/pools/join`: recibe `invite_code`, valida JWT Supabase y hace `upsert` en `bet_pool_members`.
- `POST /api/v1/bet/invites/clear-pending`: limpia cookie de invitacion pendiente despues de join exitoso.

## 4. Flujo de creacion del torneo

### Paso 1: Naming y privacidad

Objetivo: capturar identidad de la polla y nivel de acceso.

UI:

- Titulo: "Arma tu polla"
- Subcopy: "Ponle nombre a la reta y suelta el link al squad."
- Input `name`: requerido, 3 a 60 caracteres en UI, con constraint de DB minimo 3.
- Placeholder: "La reta de la oficina"
- Toggle segmentado `visibility`: `public` y `private`.
- Copy publico: "Abierta al barrio"
- Copy privado: "Solo con codigo"

Comportamiento:

- `public`: aparece en listados publicos y tambien tiene link de invitacion.
- `private`: no aparece en exploracion; solo owner y miembros pueden verla. El `invite_code` funciona como llave de ingreso.
- Validacion inline: no bloquear con modal; usar mensaje bajo input: "Dale un nombre mas claro, minimo 3 letras."

Tailwind clave:

```tsx
className="min-h-dvh bg-[#0F172A] text-slate-50"
className="rounded-lg border border-slate-800 bg-slate-900/70 p-4 shadow-[0_0_0_1px_rgba(34,197,94,0.08)]"
className="border-slate-700 bg-slate-950/70 text-slate-50 placeholder:text-slate-500 focus-visible:ring-2 focus-visible:ring-[#22C55E]/70"
className="data-[state=checked]:bg-[#22C55E] data-[state=checked]:text-slate-950"
```

### Paso 2: Reglas de juego

Objetivo: mostrar matriz editable con defaults claros, sin convertir la pantalla en una hoja de calculo.

Copy:

- Titulo: "Reglas claras, pique limpio"
- Subcopy: "Usa el modo default o tunea los puntos antes de invitar."
- CTA secundario: "Restaurar default"

Matriz default:

| Regla | Campo DB | Default |
| --- | --- | ---: |
| Ganador / empate correcto | `pts_winner_selection` | 3 |
| Marcador exacto | `pts_exact_score` | 2 |
| Goles de un equipo correctos | `pts_team_goals` | 1 |
| Diferencia de gol correcta | `pts_goal_difference` | 1 |
| Clasificado a segunda ronda | `pts_qualified_round_2` | 5 |
| Campeon | `pts_champion` | 18 |
| Subcampeon | `pts_subchampion` | 15 |
| Tercer puesto | `pts_third_place` | 12 |
| Goleador | `pts_top_scorer` | 12 |
| Mayor asistidor | `pts_top_assistant` | 12 |
| MVP | `pts_mvp` | 12 |
| Mejor arquero | `pts_best_goalkeeper` | 12 |
| Valla menos vencida | `pts_least_conceded` | 10 |
| Cierre antes del partido | `lock_minutes` | 10 |

Comportamiento:

- Mostrar reglas en grupos colapsables: "Partidos", "Fases", "Premios".
- Usar steppers o inputs numericos con `min=0`, `max=100`; `lock_minutes` entre 1 y 60.
- Resaltar cambios frente al default con chip "Tuneado".
- El owner puede editar antes del freeze; despues del inicio del torneo, mostrar `is_frozen` y bloquear edicion.

### Paso 3: Confirmacion y generacion de link

Objetivo: crear la polla en Supabase y abrir Share Modal sin pantalla de carga bloqueante.

CTA principal: "Crear y soltar link"

Contrato sugerido:

```ts
type CreatePoolBody = {
  tournament_id: string
  name: string
  visibility: "public" | "private"
  config: Partial<PoolConfigVersion>
  client_request_id: string
}

type CreatePoolResponse = {
  success: true
  data: {
    pool: Pool
    config: PoolConfigVersion
    invite_url: string
  }
}
```

Proceso server-side:

- Validar JWT de Supabase desde `Authorization: Bearer <token>`.
- Insertar `bet_pools` sin mandar `invite_code`; el trigger `trg_auto_generate_invite_code` genera el codigo real.
- Insertar al owner en `bet_pool_members`.
- Insertar configuracion inicial en `bet_pool_config_versions`.
- Devolver `invite_url = https://parti2.app/join/{invite_code}`.
- El link de compartir debe ser el mismo patron usado por partido creado y resumen de pagos: URL absoluta canonica, construida como `${window.location.origin}/join/{invite_code}` cuando se renderiza en cliente. No usar acortador propio ni otro formato visual.

Estados optimistas:

- `idle`: wizard editable.
- `submitting`: se deshabilita doble submit, pero no se muestra pantalla completa; el boton cambia a "Creando la reta...".
- `optimistic_success`: la UI avanza a una tarjeta de exito con el nombre local y skeleton del link. Mensaje: "La polla esta naciendo. Link en camino."
- `confirmed`: se reemplaza skeleton por link real, se abre `ShareInviteModal` con `ShareActions` y se hace `router.prefetch("/bet/pools/{poolId}")`.
- `failed`: rollback al paso 3 manteniendo los datos; toast: "No salio. Dale otra vez."

Regla UX importante: no mostrar un codigo falso. El estado optimista puede mostrar progreso, pero las acciones de compartir quedan `aria-disabled` hasta que exista `invite_url`.

## 5. Share Modal

El modal aparece en dos contextos: despues de crear una polla y desde el boton "Invitar" en el dashboard de la polla. Debe reutilizar el mismo contrato visual y funcional de `ShareActions` usado por `ShareLink` para compartir partido creado y por `PaymentSummary` para compartir resumen de pagos.

Copy principal:

- Titulo: "Link ready. Suelta la bomba."
- Subcopy: "Comparte la polla y que el squad meta sus marcadores."
- Accion copiar: "Copiar enlace"
- Accion WhatsApp: "Compartir por WhatsApp"
- Accion email: "Compartir por correo"
- Accion nativa: "Compartir en otra app", solo si `navigator.share` existe
- Feedback copiado: "Copiado. Mandalo al squad."

Contrato del componente:

```tsx
<ShareActions
  title="Compartir polla"
  copyText={inviteUrl}
  copiedStatusText="Enlace de la polla copiado al portapapeles"
  whatsappText={`Ey, arme la polla "${poolName}" en parti2.app. Entra, mete tus marcadores y ven a pelear la tabla: ${inviteUrl}`}
  emailSubject={`Polla Parti2 Bet - ${poolName}`}
  emailBody={`Ey, arme la polla "${poolName}" en parti2.app.\n\nEntra, mete tus marcadores y ven a pelear la tabla:\n${inviteUrl}\n\nMenos chat, mas juego.`}
  nativeShare={{
    title: `Polla Parti2 Bet - ${poolName}`,
    text: `Ey, arme la polla "${poolName}" en parti2.app. Entra y mete tus marcadores.`,
    url: inviteUrl,
  }}
/>
```

Mensaje predeterminado:

```txt
Ey, arme la polla "{poolName}" en parti2.app.
Entra, mete tus marcadores y ven a pelear la tabla:
{inviteUrl}

Menos chat, mas juego.
```

Comportamiento:

- Usar `ShareActions` como fuente de verdad: grid de acciones con iconos `Copy`, `MessageCircle`, `Mail` y `Smartphone`.
- WhatsApp debe abrir `https://api.whatsapp.com/send?text=${whatsappText}`, igual que `ShareActions`.
- Email debe abrir `mailto:?subject=${emailSubject}&body=${emailBody}`, igual que `ShareActions`.
- Si `navigator.share` existe, usar Web Share API con `{ title, text, url }`.
- Instagram DMs y Telegram quedan cubiertos por el share sheet nativo. No crear deep links propios para esos canales.
- Copiar enlace usa `navigator.clipboard.writeText(inviteUrl)`.
- Feedback visual debe seguir el componente existente: icono `Check`, tooltip "Copiado" y estado accesible `aria-live`.
- No agregar botones sociales extra en este modal; si se requiere otro canal, debe entrar por el share nativo.

Accesibilidad:

- `role="dialog"`, `aria-modal="true"`, `aria-labelledby`.
- Foco inicial en la primera accion disponible, que debe ser "Copiar enlace", igual que el orden actual de `ShareActions`.
- `Escape` cierra y devuelve foco al boton "Invitar".
- No cerrar automaticamente al copiar; permitir que el usuario comparta en otro canal.

Tailwind clave:

```tsx
className="rounded-lg border border-slate-800 bg-slate-950 p-5 text-slate-50 shadow-2xl"
className="bg-[#22C55E] text-slate-950 hover:bg-emerald-400 focus-visible:ring-2 focus-visible:ring-[#22C55E]/70"
className="border-slate-700 bg-slate-900 text-slate-50 hover:border-[#22C55E]/50"
className="text-slate-400"
```

## 6. Ingreso por link de invitacion

Ruta canonica: `/join/[invite_code]`.

Alias corto: `/j/[invite_code]`, redirigido internamente a `/join/[invite_code]`.

### Camino A: usuario autenticado

1. El usuario abre `https://parti2.app/join/ABC123XYZ0`.
2. `proxy.ts` normaliza codigo, guarda cookie de intencion y deja pasar a la pagina.
3. `JoinInviteGate` llama `supabase.auth.getSession()`.
4. Si existe sesion, llama `POST /api/v1/bet/pools/join` con `Authorization: Bearer <access_token>`.
5. El route handler valida el usuario, resuelve `bet_pools.invite_code`, hace `upsert` en `bet_pool_members` y devuelve `pool_id`.
6. La UI muestra "Ya estas fichado. Abriendo la tabla..." y ejecuta `router.replace("/bet/pools/{poolId}")`.
7. El dashboard abre el bloque de predicciones pendientes con CTA "Meter mi primer marcador".

Estados:

- `validating_invite`: "Chequeando el codigo..."
- `joining`: "Te estamos fichando..."
- `joined`: "Ya estas dentro. A romper la tabla."
- `already_member`: mismo redirect, copy "Ya estabas en esta reta."
- `invalid_code`: pantalla dark compacta con "Ese link no existe o ya murio."

### Camino B: usuario no autenticado

1. El usuario abre el link.
2. `proxy.ts` guarda `p2_pending_invite=ABC123XYZ0` por 24 horas.
3. `JoinInviteGate` guarda backup en `localStorage["p2:pendingInvite"]`.
4. Redirige a `/auth?mode=signup&invite=ABC123XYZ0&redirectTo=/join/ABC123XYZ0`.
5. La vista auth muestra banner contextual: "Estas a un paso de entrar a {poolName}."
6. Si el usuario usa email/password, `handleSubmit` no manda a `/dashboard`; primero intenta completar el join.
7. Si el usuario usa OAuth o confirma email, `AuthInviteBridge` escucha `SIGNED_IN`, lee `invite` desde URL, `localStorage` o cookie, llama `POST /api/v1/bet/pools/join`, limpia la intencion y hace `router.replace("/bet/pools/{poolId}")`.

Prioridad para recuperar codigo pendiente:

- `searchParams.get("invite")`
- `localStorage.getItem("p2:pendingInvite")`
- `GET /api/v1/bet/invites/pending` leyendo cookie server-side

Regla critica de retencion: el `useEffect` actual de `/auth` que redirige usuarios autenticados a `/dashboard` debe consultar primero si hay invitacion pendiente. Si existe, debe completar join y redirigir a la polla.

## 7. Diagrama Mermaid

```mermaid
flowchart TD
  A[Creador abre Crear Polla] --> B[Paso 1: nombre y privacidad]
  B --> C{Nombre valido?}
  C -- No --> B1[Error inline: minimo 3 letras]
  C -- Si --> D[Paso 2: matriz de scoring]
  D --> E{Edita reglas?}
  E -- No --> F[Usa DEFAULT_POOL_CONFIG]
  E -- Si --> G[Valida puntos y lock_minutes]
  F --> H[Paso 3: Crear y soltar link]
  G --> H
  H --> I[UI optimistic_success: link en camino]
  I --> J[POST /api/v1/bet/pools]
  J --> K{Creacion OK?}
  K -- No --> K1[Rollback al paso 3 + toast]
  K -- Si --> L[Recibe invite_code e invite_url]
  L --> M[ShareInviteModal con ShareActions]
  M --> N{Accion elegida}
  N -- Copiar --> P[Clipboard con invite_url]
  N -- WhatsApp --> O[api.whatsapp.com/send]
  N -- Email --> P1[mailto]
  N -- Nativo si existe --> O1[Share sheet del sistema]
  O1 --> Q
  P1 --> Q
  O --> Q[Amigo abre /join/:invite_code]
  P --> Q
  Q --> R[proxy.ts captura codigo y setea cookie]
  R --> S[JoinInviteGate valida preview]
  S --> T{supabase.auth.getSession()}
  T -- Sesion activa --> U[POST /api/v1/bet/pools/join con JWT]
  U --> V[Upsert bet_pool_members]
  V --> W[router.replace dashboard de polla]
  W --> X[Invitado mete su primera prediccion]
  T -- Sin sesion --> Y[Guarda invite en localStorage/cookie/URL]
  Y --> Z[Redirect /auth?mode=signup&invite=code]
  Z --> AA[Usuario completa login/signup]
  AA --> AB[SIGNED_IN]
  AB --> AC[AuthInviteBridge lee codigo pendiente]
  AC --> U
```

## 8. Especificacion de componentes UI

Server Components:

- `src/app/bet/pools/new/page.tsx`: obtiene torneo activo, renderiza shell dark y pasa `tournament_id` al wizard. En Next 16, `searchParams` debe tiparse como `Promise`.
- `src/app/join/[invite_code]/page.tsx`: espera `params: Promise<{ invite_code: string }>` y renderiza `JoinInviteGate` con codigo normalizado.
- `src/app/bet/pools/[poolId]/page.tsx`: shell del dashboard de polla; carga datos no sensibles y monta paneles cliente.
- `src/app/api/v1/bet/pools/route.ts`: crea polla y reglas.
- `src/app/api/v1/bet/pools/join/route.ts`: une usuario a polla via invitacion.
- `src/app/api/v1/bet/invites/[invite_code]/route.ts`: devuelve preview seguro del invite.

Client Components:

- `PoolCreationWizard`: maneja pasos, validacion local, `useTransition` y estado optimista.
- `PoolNamePrivacyStep`: input, toggle publico/privado, mensajes inline.
- `ScoringMatrixEditor`: matriz editable por grupos, steppers numericos, reset default.
- `CreatePoolReview`: resumen compacto antes de crear.
- `ShareInviteModal`: contenedor tipo dialog/sheet que monta `ShareActions` con copy de invitacion y focus trap.
- `ShareInviteActions`: wrapper opcional sobre `ShareActions`; transforma `poolName` e `inviteUrl` en `copyText`, `whatsappText`, `emailSubject`, `emailBody` y `nativeShare`.
- `JoinInviteGate`: valida codigo, detecta sesion, ejecuta join o captura redirect.
- `AuthInviteBridge`: vive en `/auth`; escucha `SIGNED_IN` y completa join pendiente.
- `PoolDashboardInviteButton`: abre modal desde dashboard.
- `FirstPredictionPrompt`: bloque post-join con CTA a predicciones.

Clases Tailwind base:

- Layout: `min-h-dvh bg-[#0F172A] text-slate-50`.
- Superficie: `rounded-lg border border-slate-800 bg-slate-900/70`.
- Input: `border-slate-700 bg-slate-950/70 text-slate-50 placeholder:text-slate-500`.
- CTA neon: `bg-[#22C55E] text-slate-950 hover:bg-emerald-400`.
- Focus: `focus-visible:ring-2 focus-visible:ring-[#22C55E]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F172A]`.
- Muted text: `text-slate-400`.
- Success: `border-[#22C55E]/40 bg-[#22C55E]/10 text-[#22C55E]`.
- Error: reservar rojo solo para errores criticos: `border-red-500/40 bg-red-500/10 text-red-300`.

## 9. Logica conceptual Next.js 16

En Next.js 16 el archivo equivalente a middleware es `proxy.ts`. En esta arquitectura, como la autenticacion es browser-only con PKCE, `proxy.ts` no debe intentar completar la sesion Supabase; solo captura la intencion de invitacion y normaliza rutas. La inscripcion real ocurre en un route handler despues de validar el JWT.

```ts
// proxy.ts
import { NextRequest, NextResponse } from "next/server"

const INVITE_COOKIE = "p2_pending_invite"

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const match = pathname.match(/^\/(join|j)\/([a-zA-Z0-9]{10})$/)

  if (!match) return NextResponse.next()

  const [, routeKind, rawCode] = match
  const inviteCode = rawCode.toUpperCase()

  const response =
    routeKind === "j"
      ? NextResponse.redirect(new URL(`/join/${inviteCode}`, request.url))
      : NextResponse.next()

  response.cookies.set(INVITE_COOKIE, inviteCode, {
    path: "/",
    maxAge: 60 * 60 * 24,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })

  return response
}

export const config = {
  matcher: ["/join/:path*", "/j/:path*"],
}
```

```ts
// src/app/api/v1/bet/pools/join/route.ts
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export async function POST(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "")
  const { invite_code } = await request.json()

  if (!token || !invite_code) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_REQUEST" } },
      { status: 400 },
    )
  }

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: authData, error: authError } = await admin.auth.getUser(token)
  if (authError || !authData.user) {
    return NextResponse.json(
      { success: false, error: { code: "UNAUTHORIZED" } },
      { status: 401 },
    )
  }

  const { data: pool, error: poolError } = await admin
    .from("bet_pools")
    .select("id, tournament_id, name, visibility")
    .eq("invite_code", invite_code.toUpperCase())
    .maybeSingle()

  if (poolError || !pool) {
    return NextResponse.json(
      { success: false, error: { code: "POOL_NOT_FOUND" } },
      { status: 404 },
    )
  }

  const { error: memberError } = await admin
    .from("bet_pool_members")
    .upsert(
      { pool_id: pool.id, user_id: authData.user.id },
      { onConflict: "pool_id,user_id", ignoreDuplicates: true },
    )

  if (memberError) {
    return NextResponse.json(
      { success: false, error: { code: "DATABASE_ERROR" } },
      { status: 500 },
    )
  }

  const response = NextResponse.json({
    success: true,
    data: {
      pool_id: pool.id,
      tournament_id: pool.tournament_id,
      next: `/bet/pools/${pool.id}`,
    },
  })

  response.cookies.set("p2_pending_invite", "", { path: "/", maxAge: 0 })
  return response
}
```

```ts
// Concepto para AuthInviteBridge.tsx
useEffect(() => {
  const subscription = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event !== "SIGNED_IN" || !session) return

    const inviteCode =
      searchParams.get("invite") ??
      window.localStorage.getItem("p2:pendingInvite")

    if (!inviteCode) {
      router.replace("/dashboard")
      return
    }

    const response = await fetch("/api/v1/bet/pools/join", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ invite_code: inviteCode }),
    })

    const payload = await response.json()

    if (payload.success) {
      window.localStorage.removeItem("p2:pendingInvite")
      router.replace(payload.data.next)
    }
  })

  return () => subscription.data.subscription.unsubscribe()
}, [router, searchParams])
```

## 10. Criterios de aceptacion

- Crear una polla privada genera `invite_code` unico e `invite_url` canonico en la misma respuesta.
- El creador ve Share Modal sin pantalla bloqueante y comparte con el mismo patron de `ShareActions` usado por partido creado y resumen de pagos.
- Un usuario autenticado que abre `/join/:code` queda inscrito y llega al dashboard de la polla.
- Un usuario no autenticado que abre `/join/:code`, se registra o inicia sesion, queda inscrito y no pasa por `/dashboard`.
- El codigo pendiente sobrevive OAuth, confirmacion por email y refresh de `/auth`.
- La insercion en `bet_pool_members` es idempotente; abrir el link dos veces no duplica membresia.
- Los estados de error no destruyen la configuracion del wizard.
- Los componentes cumplen dark mode nativo, foco visible y feedback accesible.
