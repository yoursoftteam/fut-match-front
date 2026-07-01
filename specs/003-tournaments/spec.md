# Spec Técnico: Torneos (Módulo Completo)

**Versión:** v2.0  
**Estado:** Implementación parcial (Fase 1 completa) / Pendiente Fase 2  
**Stack:** Next.js 16 + Supabase (PostgreSQL, RLS, Realtime) + Cloudflare Workers  
**Última actualización:** Junio 2026

---

## 1. Resumen

El módulo de torneos permite a cualquier usuario autenticado crear, gestionar y operar torneos deportivos con formato liga o grupos + knockout. Está diseñado como un producto independiente dentro del ecosistema parti2, con su propio ciclo de vida, modelo de datos y flujo de usuario.

**Objetivo:** Convertir la organización de torneos barriales/empresariales/amateur en un proceso sin fricción: creación en < 5 min, inscripción pública mediante links dinámicos, fixture automático, tabla de posiciones en tiempo real.

---

## 2. Mapa de Rutas

| Ruta | Tipo | Propósito | Estado |
|---|---|---|---|
| `/tournaments/new` | Página | Wizard de creación en 3 pasos | ✅ Fase 1 |
| `/tournaments/[id]/manage` | Página | Panel admin del torneo | ✅ Fase 1 |
| `/tournaments/[id]/fixture` | Página | Visualización de jornadas y tabla | ✅ Fase 1 |
| `/tournaments/[id]/register` | Página | Portal público de inscripción | ✅ Fase 1 |
| `/tournaments/[id]/matches` | Página | Gestión de resultados por jornada | 🔜 Fase 2 |
| `/tournaments/[id]/knockout` | Página | Árbol de eliminación directa | 🔜 Fase 2 |
| `/tournaments` | Página | Explorador público de torneos abiertos | 🔜 Fase 2 |

---

## 3. Arquitectura de Datos

### 3.1 Diagrama Entidad-Relación

```
tournaments
  ├── owner_id ───────────► auth.users
  ├── tournament_teams
  │     ├── tournament_id ─► tournaments (CASCADE)
  │     └── id ────────────► tournament_matches.home_team_id (SET NULL)
  │                       ─► tournament_matches.away_team_id (SET NULL)
  ├── tournament_matches
  │     └── tournament_id ─► tournaments (CASCADE)
  └── tournament_payments
        ├── tournament_id ─► tournaments (CASCADE)
        └── team_id ───────► tournament_teams (CASCADE)
```

### 3.2 Esquema de Tablas

#### tournaments

| Columna | Tipo | Default | Restricciones | Descripción |
|---|---|---|---|---|
| `id` | `UUID` | `gen_random_uuid()` | PK | |
| `owner_id` | `UUID` | | FK → auth.users NOT NULL | Dueño del torneo |
| `name` | `TEXT` | | NOT NULL | Nombre del torneo |
| `logo_url` | `TEXT` | `NULL` | | URL del logo |
| `description` | `TEXT` | `NULL` | | Descripción (max 1200 chars) |
| `registration_fee` | `NUMERIC` | `0` | >= 0 | Inscripción por equipo |
| `tournament_type` | `TEXT` | | CHECK('league','groups') | Formato |
| `status` | `TEXT` | `'draft'` | CHECK('draft','open','in_progress','finished') | Ciclo de vida |
| `max_teams` | `INTEGER` | | > 1 | Cupo máximo |
| `min_players_per_team` | `INTEGER` | | > 0 | Mínimo jugadores |
| `starts_at` | `TIMESTAMPTZ` | `NULL` | | Fecha de inicio |
| `rules_text` | `TEXT` | `NULL` | | Reglas en texto |
| `rules_pdf_url` | `TEXT` | `NULL` | | Reglas en PDF |
| `league_mode` | `TEXT` | `NULL` | CHECK('single_leg','home_away') | Solo si type=league |
| `groups_count` | `INTEGER` | `NULL` | | Solo si type=groups |
| `qualifiers_per_group` | `INTEGER` | `NULL` | | Solo si type=groups |
| `has_knockout` | `BOOLEAN` | `NULL` | | Solo si type=groups |
| `knockout_phase` | `TEXT` | `NULL` | CHECK('round_of_16','quarterfinals','semifinals','final') | Fase knockout inicial |
| `scheduled_days` | `JSONB` | `NULL` | | Array de `{day_of_week, times[]}` |
| `created_at` | `TIMESTAMPTZ` | `NOW()` | | |
| `updated_at` | `TIMESTAMPTZ` | `NOW()` | Trigger actualiza automático | |

#### tournament_teams

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` PK | | |
| `tournament_id` | `UUID` | FK → tournaments ON DELETE CASCADE | |
| `name` | `TEXT` NOT NULL | UNIQUE por torneo (case insensitive) | |
| `logo_url` | `TEXT` | | |
| `captain_name` | `TEXT` NOT NULL | | |
| `captain_phone` | `TEXT` | | |
| `captain_email` | `TEXT` | | |
| `kit_colors` | `TEXT` | | |
| `payment_status` | `TEXT` | DEFAULT 'pending', CHECK('pending','paid') | |
| `created_at` | `TIMESTAMPTZ` | | |

**Trigger:** `validate_tournament_team_capacity` — previene INSERT si:
- El torneo no está en estado `open`
- Se alcanzó `max_teams`

#### tournament_matches

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` PK | | |
| `tournament_id` | `UUID` | FK → tournaments ON DELETE CASCADE | |
| `home_team_id` | `UUID` | FK → tournament_teams ON DELETE SET NULL | |
| `away_team_id` | `UUID` | FK → tournament_teams ON DELETE SET NULL | |
| `home_goals` | `INTEGER` | | |
| `away_goals` | `INTEGER` | | |
| `starts_at` | `TIMESTAMPTZ` | | |
| `match_status` | `TEXT` | DEFAULT 'pending', CHECK('pending','played','live') | |
| `phase_label` | `TEXT` | | "Jornada 1", "Grupo A - Jornada 1", "Semifinal" |
| `round_number` | `INTEGER` | | Número de jornada |
| `group_label` | `TEXT` | | "Grupo A" (NULL si es liga) |
| `created_at` | `TIMESTAMPTZ` | | |
| CHECK | | home != away | |

#### tournament_payments

| Columna | Tipo | Restricciones | Descripción |
|---|---|---|---|
| `id` | `UUID` PK | | |
| `tournament_id` | `UUID` | FK → tournaments ON DELETE CASCADE | |
| `team_id` | `UUID` | FK → tournament_teams ON DELETE CASCADE | |
| `amount` | `NUMERIC` | >= 0 | |
| `status` | `TEXT` | CHECK('pending','processing','paid','failed') | |
| `provider_ref` | `TEXT` | | Referencia del proveedor |
| `created_at` | `TIMESTAMPTZ` | | |
| `updated_at` | `TIMESTAMPTZ` | | |
| UNIQUE | | (tournament_id, team_id) | |

### 3.3 Índices

```sql
idx_tournaments_owner_id
idx_tournaments_status
idx_tournaments_starts_at
idx_tournament_teams_tournament_id
idx_tournament_teams_unique_name_per_tournament  -- UNIQUE (tournament_id, lower(name))
idx_tournament_matches_tournament_id
idx_tournament_matches_starts_at
idx_tournament_payments_tournament_id
idx_tournament_payments_team_id
idx_tournament_payments_status
```

### 3.4 RLS (Row-Level Security)

| Tabla | Operación | Política |
|---|---|---|
| `tournaments` | SELECT | Owner ve sus torneos + público ve torneos `open` |
| `tournaments` | INSERT/UPDATE/DELETE | Solo owner |
| `tournament_teams` | SELECT | Owner del torneo + público si torneo está `open/in_progress/finished` |
| `tournament_teams` | INSERT | Cualquiera si torneo está `open` |
| `tournament_teams` | UPDATE/DELETE | Solo owner del torneo |
| `tournament_matches` | SELECT | Owner + público si torneo está visible |
| `tournament_matches` | INSERT/UPDATE/DELETE | Solo owner |
| `tournament_payments` | SELECT | Owner |
| `tournament_payments` | INSERT | Cualquiera si torneo está `open` (validación adicional de team_id) |
| `tournament_payments` | UPDATE/DELETE | Solo owner |

---

## 4. Flujo de Usuario (UX)

### 4.1 Creación (Fase 1 ✅)

```
Dashboard → "Crear torneo" → Wizard 3 pasos → Torneo creado
```

**Paso 1 — Info básica:**
- Nombre del torneo
- Fecha de inicio (datetime-local)
- Fee de inscripción
- Cronograma semanal (días + horarios) — opcional
- Máximo de equipos
- Mínimo de jugadores por equipo
- Reglas (texto + URL PDF opcional)
- Estado inicial (Borrador | Abierto)

**Paso 2 — Formato:**
- **Liga:** modo (ida / ida+vuelta)
- **Grupos:** cantidad de grupos, clasificados por grupo, tiene knockout (cuartos/semifinal/final)

**Paso 3 — Review + submit**

**Post-creación:**
- Card de éxito con link a gestión
- `TournamentDynamicLinksCard` con links de inscripción pública y pago directo

### 4.2 Gestión (Fase 1 ✅)

Checklist de configuración con 5 pasos:
1. Publicar torneo (cambiar estado de draft → open)
2. Definir cronograma (SchedulePicker)
3. Inscribir mínimo 2 equipos (compartir link público)
4. Generar fixture (desde página de fixture)
5. Asignar horarios (desde página de fixture)

**Panel admin incluye:**
- Bento de métricas (equipos, cupos, pagos, estado)
- Editor de estado (selector)
- Editor de cronograma
- Lista de equipos inscritos con estado de pago
- Lista de pagos
- Links para compartir
- Checklist de progreso siempre visible (sticky)

### 4.3 Inscripción Pública (Fase 1 ✅)

```
Link → /tournaments/[id]/register → Formulario → Pago simulado → Confirmación
```

- Muestra nombre del torneo, cupos disponibles
- Formulario: nombre equipo, colores, capitán (nombre, teléfono, email)
- Pago simulado con delay de 900ms
- Compensation delete si falla inserción de pago
- Soporte para `?mode=pay` (pago directo)

### 4.4 Fixture y Tabla de Posiciones (Fase 1 ✅)

```
/tournaments/[id]/fixture → Jornadas + Tabla
```

- Filtros por grupo y jornada
- Lista de partidos con grupo/jornada/status/horario
- Tabla de posiciones por grupo (PJ, PG, PE, PP, GF, GC, DG, Pts)
- Botón "Generar fixture" (solo owner, requiere >= 2 equipos)
- Botón "Asignar horarios" (solo owner, requiere cronograma configurado)
- Cronograma semanal visible

### 4.5 Registro de Resultados (Fase 2 🔜)

```
/tournaments/[id]/matches → Jornada select → Editar marcadores
```

**Pendiente de implementar:**
- Selección de jornada
- Grid de partidos con inputs de marcador (home_goals, away_goals)
- Validación: goles >= 0, enteros
- Al guardar: actualiza `home_goals`, `away_goals`, `match_status = 'played'`
- La tabla de posiciones se recalcula automáticamente via `computeStandings()` (client-side)
- Botón de "live" para marcar partido en vivo

### 4.6 Fase Knockout (Fase 2 🔜)

```
/tournaments/[id]/knockout → Árbol de eliminación directa
```

**Pendiente de implementar:**
- Generación automática de llaves al completar fase de grupos
- Los clasificados se determinan por `qualifiers_per_group` desde `computeStandings()`
- Emparejamiento: 1° del Grupo A vs 2° del Grupo B, etc.
- Visualización de bracket
- Partidos con marcador, penales si aplica

---

## 5. Algoritmos de Fixture

### 5.1 Round Robin (Círculo) — Implementado ✅

```
Archivo: src/lib/tournament-fixture.ts
Función: generateRoundRobinRounds(teamIds: string[]): RoundRobinPair[][]
```

- Método del círculo: equipo fijo rota contra todos
- Si número impar de equipos: se agrega `null` (bye)
- Alternancia local/visitante balanceada
- Complejidad: O(n²) partidos, O(n) rounds

### 5.2 Fixture de Liga — Implementado ✅

```
generateLeagueFixture(tournamentId, teams, leagueMode): GeneratedTournamentMatchInput[]
```

- `single_leg`: N-1 jornadas
- `home_away`: 2*(N-1) jornadas (ida + vuelta con inversión)

### 5.3 Fixture de Grupos — Implementado ✅

```
assignTeamsToGroups(teams, groupsCount, seed): GroupAssignment[]
generateGroupsFixture(tournamentId, teams, groupsCount, seed): GroupFixtureResult
```

- Distribución serpentina con seed aleatorio determinista
- Cada grupo genera su propio round robin
- `group_label` asignado a cada partido

### 5.4 Asignación de Horarios — Implementado ✅

```
assignMatchStartsAt(matches, anchorIso, scheduleDays?, seed?): GeneratedTournamentMatchInput[]
buildMatchScheduleSlots(scheduleDays): MatchScheduleSlot[]
```

- Distribución cíclica sobre slots disponibles (día + hora)
- Shuffle determinista por semana para variación
- Offset de semanas para ciclos largos

### 5.5 Tabla de Posiciones — Implementado ✅

```
computeStandings(teams, matches): StandingRow[]
computeStandingsByGroup(tournament, teams, matches): Record<string, StandingRow[]>
```

- Criterios de orden: 1. Puntos (3PG + PE), 2. Diferencia de gol, 3. Goles a favor, 4. Orden alfabético

### 5.6 Validación de Algoritmos — Implementado ✅

```
src/lib/tournament-fixture.validation.ts
runTournamentAlgorithmValidations(): ValidationResult[]
```

8 tests de validación ejecutados en `NODE_ENV !== production` antes de generar fixture.

---

## 6. Hooks

| Hook | Props | Estado | Propósito |
|---|---|---|---|
| `useTournaments` | — | ✅ | CRUD de torneos: listar mis torneos, listar abiertos, crear, actualizar estado, eliminar, obtener por ID |
| `useTournamentManage` | `tournamentId` | ✅ | Carga torneo + equipos + pagos + conteo de partidos. `updateStatus()`, `updateSchedule()`, `refresh()` |
| `useTournamentFixture` | `tournamentId` | ✅ | Carga torneo + equipos + partidos + standings. `generateFixture()`, `assignSchedule()`, `refresh()` |
| `useTournamentRegistration` | — | ✅ | `registerTeamWithSimulatedPayment()` con pago simulado y compensation delete |
| `useTournamentStats` | `slug` | ✅ | Stats del torneo FIFA 2026 via API |

### 6.1 Hooks Fase 2 (propuestos)

| Hook | Props | Propósito |
|---|---|---|
| `useTournamentResults` | `tournamentId` | Carga partidos por jornada, actualiza marcadores, cambios de estado |
| `useTournamentKnockout` | `tournamentId` | Genera bracket, navegación de llaves, actualización de resultados |
| `useTournamentRealtime` | `tournamentId` | Suscripción a cambios en tournament_matches via Supabase Realtime |

---

## 7. Componentes

### 7.1 Componentes Existentes (Fase 1 ✅)

| Componente | Archivo | Propósito |
|---|---|---|
| `TournamentCreateWizard` | `components/tournaments/TournamentCreateWizard.tsx` | Wizard 3 pasos con validación Zod |
| `TournamentSchedulePicker` | `components/tournaments/TournamentSchedulePicker.tsx` | Selector de días × horarios |
| `TournamentAdminBento` | `components/tournaments/TournamentAdminBento.tsx` | Tarjetas de métricas |
| `TournamentDynamicLinksCard` | `components/tournaments/TournamentDynamicLinksCard.tsx` | Links para compartir |
| `TournamentStandingsTable` | `components/tournaments/TournamentStandingsTable.tsx` | Tabla de posiciones |
| `NewTournamentClient` | `app/tournaments/new/NewTournamentClient.tsx` | Layout + AuthGuard |
| `ManageTournamentClient` | `app/tournaments/[id]/manage/ManageTournamentClient.tsx` | Panel admin completo |
| `TournamentFixtureClient` | `app/tournaments/[id]/fixture/TournamentFixtureClient.tsx` | Fixture + standings |
| `RegisterTournamentClient` | `app/tournaments/[id]/register/RegisterTournamentClient.tsx` | Inscripción pública |

### 7.2 Componentes Propuestos (Fase 2)

| Componente | Propósito |
|---|---|
| `TournamentResultEditor` | Grid de partidos por jornada con inputs de marcador |
| `TournamentBracketView` | Árbol de eliminación directa |
| `TournamentMatchCard` | Card de partido individual con score y status |
| `TournamentRoundSelector` | Selector de jornada con indicador de completitud |
| `TournamentPublicList` | Lista de torneos abiertos con búsqueda/filtros |

---

## 8. Tipos Compartidos (Zod)

### 8.1 Schemas de Validación

```typescript
// src/lib/tournament-schema.ts

createTournamentInputSchema  // Validación completa del formulario de creación
registerTournamentTeamInputSchema  // Validación de inscripción de equipo
```

### 8.2 Interfaces

```typescript
Tournament, TournamentTeam, TournamentMatch, TournamentPayment
TournamentScheduleDay  // { day_of_week: 0-6, times: string[] }
```

### 8.3 Enums/String Unions

```typescript
TournamentType: "league" | "groups"
TournamentStatus: "draft" | "open" | "in_progress" | "finished"
TournamentMatchStatus: "pending" | "played" | "live"
LeagueMode: "single_leg" | "home_away"
KnockoutPhase: "round_of_16" | "quarterfinals" | "semifinals" | "final"
```

---

## 9. Fixture Generation (tournament-fixture.ts)

### 9.1 Tipos de Retorno

```typescript
RoundRobinPair       // { home_team_id, away_team_id, is_bye }
GeneratedTournamentMatchInput  // Payload para INSERT en DB
GroupFixtureResult   // { assignments: GroupAssignment[], matches: GeneratedTournamentMatchInput[] }
StandingRow          // { pos, team_id, team_name, pj, pg, pe, pp, gf, gc, dg, pts }
```

### 9.2 Funciones Públicas

| Función | Input | Output | Notas |
|---|---|---|---|
| `generateRoundRobinRounds` | `teamIds: string[]` | `RoundRobinPair[][]` | Algoritmo del círculo |
| `generateLeagueFixture` | `tournamentId, teams, leagueMode` | `GeneratedTournamentMatchInput[]` | single_leg o home_away |
| `generateGroupsFixture` | `tournamentId, teams, groupsCount, seed` | `GroupFixtureResult` | Serpent seeding |
| `generateFixtureWithSchedule` | `... + anchorIso, scheduleDays?` | `GeneratedTournamentMatchInput[]` | Liga + horarios |
| `generateGroupsFixtureWithSchedule` | `... + anchorIso, scheduleDays?` | `GroupFixtureResult` | Grupos + horarios |
| `assignMatchStartsAt` | `matches, anchorIso, scheduleDays?, seed` | `GeneratedTournamentMatchInput[]` | Distribuir horarios |
| `assignTeamsToGroups` | `teams, groupsCount, seed` | `GroupAssignment[]` | Serpent seeding |
| `assignScheduleToExistingMatches` | `matches, anchorIso, scheduleDays?, seed` | `Array<{id, starts_at}>` | Update payload |
| `computeStandings` | `teams, matches` | `StandingRow[]` | Tabla de posiciones |
| `computeStandingsByGroup` | `tournament, teams, matches` | `Record<string, StandingRow[]>` | Tablas por grupo |

---

## 10. Integración con Dashboard ✅

El dashboard (`/dashboard`) muestra:

- **"Mis Torneos"** — Lista de torneos del usuario con:
  - Nombre, estado (borrador/abierto/en juego/finalizado)
  - Formato (liga/grupos), tope de equipos
  - Acciones: Gestionar, Fixture, Ver portal público, Eliminar
  - Eliminación protegida: requiere escribir el nombre exacto
- **Acción rápida** "Crear Torneo" en sección de accesos directos

---

## 11. Branding y UX Copy

Siguiendo el brand manual de parti2:

| Contexto | Copy |
|---|---|
| Creación | "Build rápido: crea, comparte y empieza la reta." |
| Post-creación | "Listo para convocar. Comparte el link y arma el squad." |
| Gestión | "Panel admin para mover el torneo sin fricción." |
| Fixture | "Visualiza jornadas, grupos y tabla de posiciones en tiempo real." |
| Checklist | "Siempre visible para que no tengas que hacer scroll largo." |
| Sin equipos | "Aún no hay equipos. Comparte el link y activa la convocatoria." |
| Sin fixture | "Pulsa Generar fixture para crear jornadas automáticamente." |
| Inscripción pública | "Solo quedan X de Y cupos." |

---

## 12. Pendientes para Fase 2

### 12.1 Registro de Resultados

Permitir al owner ingresar marcadores de partidos jugados.

**UX:**
- Selector de jornada (solo owner)
- Cada partido muestra inputs numéricos para home_goals / away_goals
- Botón "Guardar resultados" → UPDATE a `tournament_matches` con `match_status = 'played'`
- Validación: goles enteros >= 0, team_id no nulo

**API / Hook:**
- `useTournamentResults` con `updateMatchScore(matchId, homeGoals, awayGoals)` y `updateMatchStatus(matchId, status)`

### 12.2 Knockout Bracket

**UX:**
- `/tournaments/[id]/knockout` — vista de árbol
- Generación automática al pasar a `in_progress` si `has_knockout`
- Clasificados según `qualifiers_per_group` y `computeStandings()`
- Emparejamiento estándar: cruzado entre grupos
- Visualización responsiva del bracket
- Editor de marcador para cada llave

**Algoritmo (pendiente):**
```typescript
generateKnockoutBracket(teams: FixtureTeam[], phase: KnockoutPhase, seed: string): TournamentMatchInput[]
```

### 12.3 Explorador Público de Torneos

**UX:**
- `/tournaments` — lista de torneos con status `open`
- Búsqueda por nombre
- Filtro por formato (liga/grupos)
- Card con: nombre, fecha, cupos disponibles, fee de inscripción
- CTA "Inscribir equipo"

### 12.4 Pago Real (No Simulado)

Reemplazar `registerTeamWithSimulatedPayment()` con integración real:
- Pasarela de pago (definir provider)
- Webhook de confirmación
- Update de `payment_status` y `tournament_payments.status`
- Manejo de expiración y re-intentos

### 12.5 Realtime

Suscribir `TournamentFixtureClient` y futuros componentes a cambios en `tournament_matches` vía Supabase Realtime para actualización en vivo de marcadores y tabla de posiciones.

### 12.6 Notificaciones

- **Al owner:** nuevo equipo inscrito, pago recibido
- **Al equipo:** fixture publicado, horario asignado, resultado registrado
- Canal: push (FCM) + email (Resend)

### 12.7 Jugadores por Equipo

Actualizar modelo para incluir lista de jugadores dentro de cada equipo (no solo capitán):
- Nueva tabla `tournament_team_players` o columna JSONB en `tournament_teams`
- Validación de cantidad mínima (`min_players_per_team`)
- Posiciones, números de camiseta

### 12.8 Partido "En Vivo"

- Botón para marcar partido como `live`
- Modo de actualización rápida de marcador
- Indicador visual en fixture
- Push notification a equipos y seguidores

---

## 13. Plan de Implementación Propuesto (Fase 2)

| Iteración | Módulo | Dependencias | Esfuerzo estimado |
|---|---|---|---|
| 1 | Registro de resultados | — | 3-4 días |
| 2 | Knockout bracket | Iteración 1 | 5-7 días |
| 3 | Explorador público | — | 2-3 días |
| 4 | Realtime | Iteración 1-2 | 1-2 días |
| 5 | Pago real | Infraestructura externa | 5-8 días |
| 6 | Jugadores por equipo | — | 3-4 días |
| 7 | Notificaciones | Iteración 1-6 | 3-5 días |

---

## 14. Notas Técnicas

### Edge Runtime
Las páginas de fixture y gestión usan client components. No se requiere Edge runtime explícito, pero se puede exportar `runtime = "edge"` si se necesita reducir latencia en SSR.

### Determinismo en Fixtures
Todos los algoritmos de fixture usan seed aleatorio determinista para garantizar que el mismo conjunto de equipos genere el mismo fixture. El seed es el `tournament.id`.

### Compensation Delete
En `useTournamentRegistration`, si el INSERT de `tournament_payments` falla después de insertar exitosamente `tournament_teams`, se ejecuta un compensation delete para mantener consistencia.

### Simulated Payment
El pago simulado incluye un delay artificial de 900ms y genera una referencia con prefijo `SIM-`.

---

## 15. Diagrama de Estados del Torneo

```
     ┌──────────┐
     │  draft   │
     └────┬─────┘
          │ Publicar (owner)
          ▼
     ┌──────────┐  Inscripción de equipos
     │   open   │◄────────────────────────── Público
     └────┬─────┘
          │ Iniciar torneo (owner)
          ▼
     ┌──────────────┐
     │ in_progress  │  Partidos en vivo, resultados
     └──────┬───────┘
            │ Finalizar (owner)
            ▼
     ┌──────────┐
     │ finished │
     └──────────┘
```

Las transiciones son manuales (owner via selector de estado). No hay automatización por fecha.

---

## 16. Testing ✅ (Parcial)

### Unit Tests (Fixture Algorithms)
```typescript
runTournamentAlgorithmValidations(): ValidationResult[]
```
8 validaciones que cubren:
- Round robin con número impar de equipos
- Fixture de liga no vacío
- Ida y vuelta = 2x single leg
- Balance de grupos
- Labels de grupo en partidos
- Asignación de horarios (liga y grupos)
- Orden de tabla de posiciones

### Tests pendientes (Fase 2)
- Tests de componentes con Vitest
- Tests de RLS policies
- Tests de integración de flujo completo
- Tests de generación de knockout
