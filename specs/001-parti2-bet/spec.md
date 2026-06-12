# Especificación Funcional y Técnica — Módulo Parti2 Bet (parti2.app)

**Versión:** v1.0  
**Estado:** Aprobado para Desarrollo  
**Alcance Inicial:** Copa Mundial de la FIFA 2026 (Arquitectura extensible a futuros torneos)  
**Stack Tecnológico:** Next.js (Frontend/Fullstack), Supabase (PostgreSQL, Realtime, RLS), Cloudflare (CDN, Edge Workers, Cron Triggers), Resend (Mailing Transaccional).

---

## 1. Historias de Usuario y Criterios de Aceptación (User Stories & AC)

### US-01: Creación y Parametrización de la Polla
**Como** creador de una polla,  
**quiero** fundar una polla pública o privada y personalizar el sistema de asignación de puntos,  
**para** competir con mis amigos o comunidad bajo reglas a la medida.

* **Criterios de Aceptación:**
  * Al crear una polla, el sistema precarga un conjunto de puntajes por defecto (partidos y podium) completamente editables.
  * El creador define la visibilidad (`public` / `private`) y el método de acceso (enlace directo o código de invitación).
  * La configuración de puntos queda congelada y versionada automáticamente 10 minutos antes del inicio del partido inaugural del torneo.
  * Los participantes pueden consultar en todo momento la matriz de reglas activas aplicada a su polla.

### US-02: Pronósticos de Fase de Grupos y Generación Automática de Llaves
**Como** participante de una polla,  
**quiero** ingresar mis marcadores estimados para la fase de grupos y visualizar cómo se construye el cuadro de eliminación directa de forma automática,  
**para** evitar el llenado manual y tedioso del bracket de fases avanzadas.

* **Criterios de Aceptación:**
  * Cada modificación de un marcador recalcula la tabla de posiciones del grupo correspondiente en tiempo real en el cliente, sin recargar la página.
  * El sistema asigna dinámicamente los clasificados (primeros, segundos y mejores terceros lugares) según las reglas oficiales de la FIFA 2026 y arma los cruces de Octavos, Cuartos, Semifinal, Tercer Puesto y Final.
  * Si un partido entra en estado bloqueado (T-10 minutos), los inputs de marcador asociados quedan deshabilitados de inmediato.
  * Los datos del bracket generados en el cliente se validan y persisten de manera consistente en el backend al guardar.

### US-03: Predicciones Globales Rápidas
**Como** usuario registrado en la plataforma,  
**quiero** realizar predicciones rápidas partido a partido en una modalidad global,  
**para** competir de forma ágil en un ranking general sin necesidad de unirme a una polla privada.

* **Criterios de Aceptación:**
  * El motor aplica un esquema de puntuación estricto: Marcador exacto = 10 puntos. Si no es exacto, se otorga: Acierto de ganador/empate = 5 puntos, Goles del local acertados = 2 puntos, Goles del visitante acertados = 2 puntos.
  * Para todas las fases de eliminación directa (posteriores a la fase de grupos), los puntos totales obtenidos en el partido se duplican de forma automática.
  * El Leaderboard global se actualiza de manera reactiva inmediatamente después de que el administrador ingresa el resultado oficial del partido.

### US-04: Bloqueos de Seguridad y Fair Play
**Como** administrador de la plataforma,  
**quiero** asegurar que el sistema bloquee la edición de predicciones exactamente 10 minutos antes del kickoff de cada encuentro y 10 minutos antes del partido inaugural para el podium,  
**para** garantizar la transparencia del juego y evitar fraudes.

* **Criterios de Aceptación:**
  * La regla de bloqueo se valida de forma estricta en la capa de base de datos y API (Supabase / Next.js) y no solo visualmente en el cliente.
  * Cualquier solicitud de mutación posterior al límite de tiempo es rechazada devolviendo el código de error funcional `PREDICTION_LOCKED`.
  * La interfaz muestra un contador regresivo claro y un estado visual de candado (`locked`).
  * Se registra un log de auditoría inmutable indicando ID de usuario, timestamp preciso, valor anterior y valor nuevo.

### US-05: Sistema de Notificaciones Proactivas
**Como** participante activo de Parti2 Bet,  
**quiero** recibir recordatorios diarios por correo electrónico y alertas de última hora,  
**para** evitar perder puntos por omitir el diligenciamiento de partidos.

* **Criterios de Aceptación:**
  * Envío automatizado diario a las 06:00 AM (ajustado a la zona horaria del usuario) con el fixture del día y una lista explícita de partidos pendientes de pronosticar.
  * Alerta de "Última oportunidad" enviada por correo exactamente 1 hora antes de un partido si el usuario no ha registrado su predicción.
  * El pipeline de envío implementa mecanismos de idempotencia absoluta para evitar correos duplicados ante fallas de red.

---

## 2. Diseño de Base de Datos (Entity-Relationship en Supabase)

Esquema relacional en PostgreSQL optimizado para el ecosistema de Supabase con prefijo `bet_`.

### Diccionario de Datos Sintético

#### `bet_tournaments`
* `id` (uuid, PK)
* `name` (varchar) — Ej. "Copa Mundial de la FIFA 2026"
* `slug` (varchar, unique)
* `status` (enum) — `draft`, `active`, `completed`
* `kickoff_inaugural_at` (timestamptz)
* `created_at` (timestamptz)

#### `bet_teams`
* `id` (uuid, PK)
* `name` (varchar) — Nombre del país.
* `fifa_code` (varchar(3), unique) — Ej. "COL", "MEX", "ARG".
* `flag_svg_url` (text) — URL directa del vector de la bandera.

#### `bet_matches`
* `id` (uuid, PK)
* `tournament_id` (uuid, FK -> `bet_tournaments`)
* `stage` (enum) — `group_stage`, `round_of_32`, `round_of_16`, `quarter_finals`, `semi_finals`, `third_place`, `final`
* `group_name` (char(1), nullable) — Ej. 'A', 'B', etc.
* `kickoff_at` (timestamptz)
* `home_team_id` (uuid, FK -> `bet_teams`)
* `away_team_id` (uuid, FK -> `bet_teams`)
* `home_score_official` (int, nullable)
* `away_score_official` (int, nullable)
* `status` (enum) — `scheduled`, `live`, `finished`

#### `bet_pools`
* `id` (uuid, PK)
* `tournament_id` (uuid, FK -> `bet_tournaments`)
* `owner_id` (uuid, FK -> `auth.users`)
* `name` (varchar)
* `visibility` (enum) — `public`, `private`
* `invite_code` (varchar, unique)
* `created_at` (timestamptz)

#### `bet_pool_config_versions`
* `id` (uuid, PK)
* `pool_id` (uuid, FK -> `bet_pools`)
* `lock_minutes` (int) — Por defecto `10`
* `pts_winner_selection` (int) — Por defecto `3`
* `pts_exact_score` (int) — Por defecto `2`
* `pts_team_goals` (int) — Por defecto `1`
* `pts_goal_difference` (int) — Por defecto `1`
* `pts_qualified_round_2` (int) — Por defecto `5`
* `pts_champion` (int) — Por defecto `18`
* `pts_subchampion` (int) — Por defecto `15`
* `pts_third_place` (int) — Por defecto `12`
* `pts_top_scorer` (int) — Por defecto `12`
* `pts_top_assistant` (int) — Por defecto `12`
* `pts_mvp` (int) — Por defecto `12`
* `pts_best_goalkeeper` (int) — Por defecto `12`
* `pts_least_conceded` (int) — Por defecto `10`
* `is_frozen` (boolean) — `true` al iniciar el torneo.

#### `bet_match_predictions`
* `id` (uuid, PK)
* `mode` (enum) — `pool`, `global`
* `user_id` (uuid, FK -> `auth.users`)
* `pool_id` (uuid, FK -> `bet_pools`, nullable)
* `match_id` (uuid, FK -> `bet_matches`)
* `home_score_predicted` (int)
* `away_score_predicted` (int)
* `created_at` (timestamptz)
* `updated_at` (timestamptz)

#### `bet_scores_aggregate`
* `id` (uuid, PK)
* `mode` (enum) — `pool`, `global`
* `pool_id` (uuid, FK -> `bet_pools`, nullable)
* `user_id` (uuid, FK -> `auth.users`)
* `points_total` (int) — Indexado para ordenamiento veloz del Leaderboard.
* `updated_at` (timestamptz)

### Row Level Security (RLS) & Políticas Esenciales

1. **`bet_pools`**:
   * `SELECT`: Permitido para todos si `visibility = 'public'`. Si es `'private'`, restringido a filas donde el `auth.uid()` exista en `bet_pool_members`.
   * `INSERT/UPDATE`: Permitido únicamente si `auth.uid() == owner_id`.
2. **`bet_match_predictions`**:
   * `SELECT`: El usuario puede leer sus propias filas siempre. Los administradores o miembros de la misma polla solo pueden leerlas una vez que el tiempo del partido haya expirado (`now() > (SELECT kickoff_at FROM bet_matches WHERE id = match_id)`).
   * `INSERT/UPDATE`: Permitido solo si `auth.uid() == user_id` **Y** `now() <= (SELECT kickoff_at - interval '10 minutes' FROM bet_matches WHERE id = match_id)`.

---

## 3. Lógica del Motor de Puntuación (Next.js + Supabase)

El cálculo se maneja bajo un enfoque **Event-Driven Basado en Conjuntos (Set-Based)** mediante Postgres Functions invocadas por un webhook seguro desde Next.js Serverless Routes, asegurando atomicidad.

### Algoritmo de Procesamiento tras Partido Oficial

```
[Resultado Oficial Registrado] 
       │
       ▼
[Invocación RPC / Edge Function Segura]
       │
       ├──► Filtrar predicciones de bet_match_predictions (match_id)
       │
       ├──► EVALUACIÓN MODALIDAD GLOBAL (Reglas Fijas)
       │     - Si exacto -> 10 pts
       │     - Si no exacto -> (Ganador/Empate ? 5 : 0) + (Goles Locales ? 2 : 0) + (Goles Visitantes ? 2 : 0)
       │     - Si Fase KO -> Multiplicar Puntos x 2
       │
       ├──► EVALUACIÓN MODALIDAD POLLA (Reglas Dinámicas por bet_pool_config_versions)
       │     - Aplica JOIN con las reglas específicas de la polla vinculada.
       │
       ▼
[Upsert Masivo en bet_scores_aggregate] -> Incrementa points_total de forma atómica
       │
       ▼
[Notificación vía Supabase Realtime Channels] -> Actualización instantánea del Leaderboard UI
```

### Matriz Base de Puntuación (Valores Recomendados de Fábrica)

| Criterio / Logro | Puntos Sugeridos | Justificación de Diseño UI/UX y Negocio |
| :--- | :---: | :--- |
| **Selección del Ganador** | 3 | Base predictiva estándar; premia la lectura correcta del juego. |
| **Marcador Exacto** | 2 | Alta dificultad. Al sumarse con el ganador e incentivos por goles, marca la diferencia élite. |
| **Goles de un Equipo** | 1 | Recompensa de consolación por precisión en volumen ofensivo individual. |
| **Diferencia de Gol** | 1 | Premia al usuario que entendió la paridad o disparidad del encuentro. |
| **Clasificados Segunda Ronda** | 5 | Premia la visión global a mediano plazo (Hasta 8 equipos en el nuevo formato). |
| **Escoge Campeón** | 18 | Máximo galardón a largo plazo. Alta recompensa sin romper la liga por completo. |
| **Escoge Subcampeón** | 15 | Recompensa escalonada de alta fidelidad. |
| **Escoge Tercer Puesto** | 12 | Premio de alta dificultad estratégica. |
| **Premios Individuales (Goleador, MVP, etc.)**| 12 | Añade un componente profundo de analítica de jugadores y seguimiento diario. |
| **Malla Menos Vencida** | 10 | Reconocimiento al análisis táctico y defensivo del torneo. |

---

## 4. Arquitectura de Notificaciones e Infraestructura (Cloudflare + Resend)

Para garantizar la alta disponibilidad con costo eficiente, se desliga la carga de envío masivo del servidor principal Next.js, delegándola a la red perimetral de Cloudflare.

```
┌────────────────────────────────────────────────────────────────────────┐
│                      CLOUDFLARE CRON TRIGGERS                          │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
         ┌─────────────────────────┴─────────────────────────┐
         ▼ (Cada 15 min)                                     ▼ (Cada minuto)
┌─────────────────────────────────┐               ┌─────────────────────────────────┐
│     BATCH DAILY DIGEST (06:00)  │               │   LAST CHANCE ALERT (T-60 min)  │
└────────────────┬────────────────┘               └────────────────┬────────────────┘
                 │                                                 │
                 ▼                                                 ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                           SUPABASE RPC / POSTGRES COLA                            │
│  - Query por Timezone del Usuario              - Match Kickoff - 60 min           │
│  - Validación de campos NULL (Faltantes)       - FOR UPDATE SKIP LOCKED           │
└────────────────┬─────────────────────────────────────────────────┬────────────────┘
                 │                                                 │
                 └─────────────────────────┬───────────────────────┘
                                           │ (Lotes de 100 con Idempotency-Key)
                                           ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                                  RESEND API                                       │
│                    - Envío masivo via /emails/batch                               │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### Especificaciones Técnicas de Implementación
* **Idempotencia Absoluta:** Cada payload enviado a Resend cuenta con una cabecera `X-Idempotency-Key` estructurada como `digest:user_id:date` o `alert:user_id:match_id`. Ante pérdidas de conexión o reintentos del Worker, Resend garantiza no duplicar el correo entregado al destinatario.
* **Manejo de Errores y Backoff:** Si la API de Resend retorna un código `429 (Too Many Requests)` o `5xx`, el job en la base de datos incrementa un contador de `attempts` y calcula un retraso exponencial (`send_at = now() + (pow(2, attempts) * interval '1 minute')`).

---

## 5. Recomendaciones de UI/UX en Next.js (Generaciones Millennial y Gen Z)

### Gestión de Estado Ultra-Veloz (Fricción Cero)
* **Zustand con Enfoque de Slices:** Implementar el estado global del lado del cliente separado por contextos (`fixturesSlice`, `predictionsDraftSlice`, `leaderboardRealtimeSlice`). 
* **Actualizaciones Optimistas (Optimistic Updates):** Al presionar las flechas de incremento/decremento de goles o guardar una predicción, el cliente asume el éxito, renderiza el cambio visual de inmediato y ejecuta un debounce de `500ms` antes de disparar la petición HTTP al Route Handler de Next.js. Si el backend retorna un error de bloqueo por tiempo, se revierte el estado (`rollback`) y se gatilla un toast de advertencia de alto contraste.

### Arquitectura de Renderizado Híbrido
* **Server Components (RSC):** Utilizados para el fetch de los datos estáticos del torneo, banderas de los países, reglas iniciales y la estructura base de la vista. Esto reduce drásticamente el First Contentful Paint (FCP).
* **Client Components (RCC):** Reservados para los módulos interactivos de entrada de datos, el renderizador dinámico del árbol de llaves y el feed del Leaderboard en tiempo real con Supabase Channels.

### Directrices de Interfaz Visual (Brand-Native)
* **Componente `CountryBadge` Optimizado:** Un componente atómico y único encargado de renderizar la bandera en formato SVG puro e inlineizado (o mediante caché agresiva en Cloudflare Images) junto con el nombre del país y código FIFA. Queda prohibido el uso de imágenes rasterizadas (`.png`, `.jpg`) para las banderas debido al pixelado en dispositivos Retina de alta densidad.
* **Paleta de Diseño y Accesibilidad:** Estética dark-first de alto contraste basada en Tailwind CSS (`bg-slate-950`, `text-slate-50`, acentos en `emerald-500` para estados guardados y exitosos). Tamaños de áreas de pulsación táctil mínimas de `48px x 48px` para evitar errores de dedo en pantallas móviles.
* **Sensación de Automatización Mágica:** Al momento de ingresar el último resultado de la fase de grupos en la pantalla flotante, las líneas de conexión del bracket de Octavos de Final deben iluminarse con una transición suave en CSS utilizando `stroke-dashoffset` en elementos SVG, guiando el ojo del usuario hacia su cuadro final estimado.

---

## 6. Especificaciones de Rutas API (Next.js Route Handlers)

Todas las rutas implementadas bajo `/app/api/v1/bet/` con autenticación obligatoria vía JWT de Supabase (excepto donde se especifique).

### 6.1 Gestión de Pollas

#### `POST /api/v1/bet/pools`
**Crear una nueva polla**

```json
{
  "tournament_id": "uuid",
  "name": "Mi Polla con los Amigos",
  "visibility": "private",
  "config": {
    "pts_winner_selection": 3,
    "pts_exact_score": 2,
    "pts_team_goals": 1,
    "pts_goal_difference": 1,
    "pts_qualified_round_2": 5,
    "pts_champion": 18,
    "pts_subchampion": 15,
    "pts_third_place": 12,
    "pts_top_scorer": 12,
    "pts_top_assistant": 12,
    "pts_mvp": 12,
    "pts_best_goalkeeper": 12,
    "pts_least_conceded": 10,
    "lock_minutes": 10
  }
}
```

**Response (201 Created)**
```json
{
  "id": "uuid",
  "owner_id": "uuid",
  "name": "Mi Polla con los Amigos",
  "visibility": "private",
  "invite_code": "ABC123XYZ",
  "created_at": "2026-05-27T10:00:00Z",
  "config_version": {
    "id": "uuid",
    "is_frozen": false,
    "created_at": "2026-05-27T10:00:00Z"
  }
}
```

**Errores:**
- `400 Bad Request` — Campo `visibility` inválido o campos de config fuera de rango [0-100]
- `401 Unauthorized` — Token JWT no presente o inválido
- `409 Conflict` — Código de invitación duplicado (reintentable internamente)

---

#### `GET /api/v1/bet/pools/:id`
**Obtener detalles de una polla**

**Query Params:**
- `include_members` (boolean) — Incluir lista de participantes

**Response (200 OK)**
```json
{
  "id": "uuid",
  "tournament_id": "uuid",
  "owner_id": "uuid",
  "name": "Mi Polla",
  "visibility": "private",
  "invite_code": "ABC123XYZ",
  "created_at": "2026-05-27T10:00:00Z",
  "config_active": {
    "pts_winner_selection": 3,
    "is_frozen": false
  },
  "members": [
    { "id": "uuid", "email": "user@example.com", "joined_at": "2026-05-27T10:30:00Z" }
  ],
  "total_participants": 5
}
```

**RLS Enforcement:**
- Usuario propietario: acceso completo
- Miembro de polla privada: datos limitados (sin configuración congelada)
- Usuario público (si visibility=public): solo lectura de metadata

---

#### `PUT /api/v1/bet/pools/:id/config`
**Modificar configuración de puntajes (solo antes de congelación)**

**Validaciones:**
- Solo el propietario puede modificar
- Falla si `config_active.is_frozen = true` (retorna `403 Forbidden` con código `CONFIG_FROZEN`)

**Request Body:**
```json
{
  "pts_winner_selection": 4,
  "pts_exact_score": 3
}
```

**Response:** Retorna configuración actualizada + `frozen_at` si cambio triggeró congelación

---

### 6.2 Gestión de Predicciones

#### `POST /api/v1/bet/predictions`
**Crear o actualizar predicción de un partido**

**Request:**
```json
{
  "mode": "pool",
  "pool_id": "uuid (optional si mode=global)",
  "match_id": "uuid",
  "home_score_predicted": 2,
  "away_score_predicted": 1
}
```

**RLS & Bloqueo:**
1. Validar `now() <= (SELECT kickoff_at - interval 10 minutes FROM bet_matches WHERE id = match_id)`
2. Si `now() > kickoff_at`, retornar `410 PREDICTION_LOCKED`
3. Upsert row con `updated_at = now()`

**Response (201 Created / 200 OK)**
```json
{
  "id": "uuid",
  "user_id": "uuid",
  "match_id": "uuid",
  "home_score_predicted": 2,
  "away_score_predicted": 1,
  "locked": false,
  "time_until_lock_seconds": 450,
  "match_kickoff_at": "2026-06-15T14:00:00Z"
}
```

**Errores Específicos:**
- `410 Gone` `{ "code": "PREDICTION_LOCKED", "locked_at": "..." }` — Predicción pasada el límite
- `404 Not Found` — `match_id` no existe
- `400 Bad Request` — Scores negativos o > 20

---

#### `GET /api/v1/bet/predictions/user/:userId?mode=pool&pool_id=uuid`
**Listar todas las predicciones del usuario**

**Query Params:**
- `mode` (enum: global, pool)
- `pool_id` (uuid, requerido si mode=pool)
- `match_stage` (enum: group_stage, knockout) — Filtrar por fase

**Response (200 OK)**
```json
{
  "predictions": [
    {
      "id": "uuid",
      "match_id": "uuid",
      "home_team": { "name": "Colombia", "fifa_code": "COL" },
      "away_team": { "name": "México", "fifa_code": "MEX" },
      "home_score_predicted": 2,
      "away_score_predicted": 1,
      "locked": false,
      "created_at": "2026-05-27T10:00:00Z",
      "updated_at": "2026-05-27T11:30:00Z"
    }
  ],
  "total_count": 64
}
```

---

### 6.3 Resultados Oficiales y Cálculo de Puntos

#### `POST /api/v1/bet/matches/:id/result` (Admin Only)
**Registrar resultado oficial de un partido**

**Auth:** Require `user_role = 'admin'` vía custom claim en JWT

**Request:**
```json
{
  "home_score_official": 2,
  "away_score_official": 1,
  "status": "finished"
}
```

**Workflow Interno:**
1. Actualizar `bet_matches` con scores
2. Invocar Postgres function: `fn_calculate_match_scores_v1(match_id)` via RPC
3. Función internamente:
   - Fetch todos los `bet_match_predictions` para ese match
   - Evaluar puntos según `mode` (global o pool-specific)
   - Upsert masivo en `bet_scores_aggregate`
   - Registrar audit log en `bet_audit_logs`
4. Emitir evento via `supabase.channel("scores:updated").send()`

**Response (200 OK)**
```json
{
  "match_id": "uuid",
  "status": "finished",
  "scores_calculated": true,
  "total_predictions_evaluated": 342,
  "broadcast_sent": true,
  "calculated_at": "2026-06-15T14:15:30Z"
}
```

---

### 6.4 Leaderboard & Ranking

#### `GET /api/v1/bet/leaderboards/global?limit=100&offset=0`
**Leaderboard global (modo global)**

**Response (200 OK)**
```json
{
  "leaderboard": [
    {
      "rank": 1,
      "user_id": "uuid",
      "user_email": "winner@example.com",
      "points_total": 285,
      "matches_predicted": 64,
      "accuracy_percentage": 78.5,
      "streak_current_wins": 8
    }
  ],
  "total_users": 12450,
  "updated_at": "2026-06-15T14:15:30Z"
}
```

**Indexación:** Campo `points_total` con índice DESC para queries rápidas

---

#### `GET /api/v1/bet/pools/:id/leaderboard?limit=50`
**Leaderboard de una polla específica**

**Response:** Misma estructura, filtrada por `pool_id`

---

### 6.5 Gestión de Bloqueos

#### `GET /api/v1/bet/matches/:id/lock-status`
**Obtener estado de bloqueo de un partido**

**Response (200 OK)**
```json
{
  "match_id": "uuid",
  "stage": "group_stage",
  "home_team": "Colombia",
  "away_team": "México",
  "kickoff_at": "2026-06-15T14:00:00Z",
  "locked": false,
  "lock_in_seconds": 450,
  "user_has_prediction": true,
  "can_edit": true
}
```

**Cálculo de Lock:**
- Si `now() > kickoff_at - 10 minutes` → `locked = true`
- `lock_in_seconds = EXTRACT(EPOCH FROM (kickoff_at - interval '10 minutes' - now()))`

---

## 7. Datos de Inicialización y Migraciones (Supabase SQL)

### 7.1 Crear Tablas Base

**Archivo:** `supabase/migrations/20260527_001_create_bet_tables.sql`

```sql
-- Extensiones requeridas
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum tipos
CREATE TYPE bet_tournament_status AS ENUM ('draft', 'active', 'completed');
CREATE TYPE bet_match_stage AS ENUM ('group_stage', 'round_of_32', 'round_of_16', 'quarter_finals', 'semi_finals', 'third_place', 'final');
CREATE TYPE bet_match_status AS ENUM ('scheduled', 'live', 'finished');
CREATE TYPE bet_visibility AS ENUM ('public', 'private');
CREATE TYPE bet_prediction_mode AS ENUM ('pool', 'global');

-- Tabla de Torneos
CREATE TABLE bet_tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  status bet_tournament_status DEFAULT 'draft',
  kickoff_inaugural_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Equipos
CREATE TABLE bet_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  fifa_code VARCHAR(3) NOT NULL UNIQUE,
  flag_svg_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabla de Partidos
CREATE TABLE bet_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES bet_tournaments(id) ON DELETE CASCADE,
  stage bet_match_stage NOT NULL,
  group_name CHAR(1),
  kickoff_at TIMESTAMPTZ NOT NULL,
  home_team_id UUID NOT NULL REFERENCES bet_teams(id),
  away_team_id UUID NOT NULL REFERENCES bet_teams(id),
  home_score_official INT,
  away_score_official INT,
  status bet_match_status DEFAULT 'scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_scores CHECK (home_score_official IS NULL OR home_score_official >= 0),
  CONSTRAINT valid_teams CHECK (home_team_id != away_team_id)
);

CREATE INDEX idx_bet_matches_tournament ON bet_matches(tournament_id);
CREATE INDEX idx_bet_matches_kickoff ON bet_matches(kickoff_at);
CREATE INDEX idx_bet_matches_stage ON bet_matches(stage);

-- Tabla de Pollas
CREATE TABLE bet_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES bet_tournaments(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  visibility bet_visibility DEFAULT 'private',
  invite_code VARCHAR(10) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bet_pools_owner ON bet_pools(owner_id);
CREATE INDEX idx_bet_pools_tournament ON bet_pools(tournament_id);
CREATE UNIQUE INDEX idx_bet_pools_invite_code ON bet_pools(invite_code);

-- Tabla de Miembros de Polla
CREATE TABLE bet_pool_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES bet_pools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(pool_id, user_id)
);

CREATE INDEX idx_bet_pool_members_pool ON bet_pool_members(pool_id);
CREATE INDEX idx_bet_pool_members_user ON bet_pool_members(user_id);

-- Tabla de Configuración de Polla (Versionada)
CREATE TABLE bet_pool_config_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id UUID NOT NULL REFERENCES bet_pools(id) ON DELETE CASCADE,
  lock_minutes INT DEFAULT 10 CHECK (lock_minutes > 0 AND lock_minutes <= 60),
  pts_winner_selection INT DEFAULT 3,
  pts_exact_score INT DEFAULT 2,
  pts_team_goals INT DEFAULT 1,
  pts_goal_difference INT DEFAULT 1,
  pts_qualified_round_2 INT DEFAULT 5,
  pts_champion INT DEFAULT 18,
  pts_subchampion INT DEFAULT 15,
  pts_third_place INT DEFAULT 12,
  pts_top_scorer INT DEFAULT 12,
  pts_top_assistant INT DEFAULT 12,
  pts_mvp INT DEFAULT 12,
  pts_best_goalkeeper INT DEFAULT 12,
  pts_least_conceded INT DEFAULT 10,
  is_frozen BOOLEAN DEFAULT FALSE,
  frozen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_pts_range CHECK (
    pts_winner_selection BETWEEN 0 AND 100 AND
    pts_exact_score BETWEEN 0 AND 100 AND
    pts_team_goals BETWEEN 0 AND 100 AND
    pts_goal_difference BETWEEN 0 AND 100 AND
    pts_qualified_round_2 BETWEEN 0 AND 100 AND
    pts_champion BETWEEN 0 AND 100 AND
    pts_subchampion BETWEEN 0 AND 100 AND
    pts_third_place BETWEEN 0 AND 100
  )
);

CREATE INDEX idx_bet_pool_config_pool ON bet_pool_config_versions(pool_id);
CREATE INDEX idx_bet_pool_config_frozen ON bet_pool_config_versions(is_frozen);

-- Tabla de Predicciones
CREATE TABLE bet_match_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode bet_prediction_mode NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pool_id UUID REFERENCES bet_pools(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES bet_matches(id) ON DELETE CASCADE,
  home_score_predicted INT NOT NULL CHECK (home_score_predicted >= 0 AND home_score_predicted <= 20),
  away_score_predicted INT NOT NULL CHECK (away_score_predicted >= 0 AND away_score_predicted <= 20),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT pool_mode_constraint CHECK ((mode = 'pool' AND pool_id IS NOT NULL) OR (mode = 'global' AND pool_id IS NULL)),
  UNIQUE(user_id, match_id, mode, pool_id)
);

CREATE INDEX idx_bet_predictions_user ON bet_match_predictions(user_id);
CREATE INDEX idx_bet_predictions_match ON bet_match_predictions(match_id);
CREATE INDEX idx_bet_predictions_pool ON bet_match_predictions(pool_id) WHERE pool_id IS NOT NULL;
CREATE INDEX idx_bet_predictions_mode ON bet_match_predictions(mode);

-- Tabla de Puntuación Agregada
CREATE TABLE bet_scores_aggregate (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode bet_prediction_mode NOT NULL,
  pool_id UUID REFERENCES bet_pools(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points_total INT NOT NULL DEFAULT 0 CHECK (points_total >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, mode, pool_id)
);

CREATE INDEX idx_bet_scores_user_mode ON bet_scores_aggregate(user_id, mode);
CREATE INDEX idx_bet_scores_pool_rank ON bet_scores_aggregate(pool_id, points_total DESC) WHERE pool_id IS NOT NULL;
CREATE INDEX idx_bet_scores_global_rank ON bet_scores_aggregate(points_total DESC) WHERE mode = 'global';

-- Tabla de Auditoría (Inmutable)
CREATE TABLE bet_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(50) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  match_id UUID REFERENCES bet_matches(id),
  pool_id UUID REFERENCES bet_pools(id),
  old_value JSONB,
  new_value JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bet_audit_user ON bet_audit_logs(user_id);
CREATE INDEX idx_bet_audit_match ON bet_audit_logs(match_id);
CREATE INDEX idx_bet_audit_created ON bet_audit_logs(created_at DESC);
```

---

### 7.2 Políticas RLS

```sql
-- RLS en bet_pools
ALTER TABLE bet_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pools públicas visibles para todos"
  ON bet_pools FOR SELECT
  USING (visibility = 'public');

CREATE POLICY "Pollas privadas solo para miembros"
  ON bet_pools FOR SELECT
  USING (
    visibility = 'private' AND (
      auth.uid() = owner_id OR
      EXISTS (SELECT 1 FROM bet_pool_members WHERE pool_id = id AND user_id = auth.uid())
    )
  );

CREATE POLICY "Solo propietario puede modificar"
  ON bet_pools FOR UPDATE
  USING (auth.uid() = owner_id);

-- RLS en bet_match_predictions
ALTER TABLE bet_match_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios leen sus propias predicciones"
  ON bet_match_predictions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Solo propietario puede crear/actualizar"
  ON bet_match_predictions FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    now() <= (
      SELECT kickoff_at - interval '10 minutes'
      FROM bet_matches
      WHERE id = match_id
    )
  );

CREATE POLICY "Update restringido por tiempo de lock"
  ON bet_match_predictions FOR UPDATE
  USING (
    auth.uid() = user_id AND
    now() <= (
      SELECT kickoff_at - interval '10 minutes'
      FROM bet_matches
      WHERE id = match_id
    )
  );
```

---

## 8. Códigos de Error Estandarizados

| Código Funcional | HTTP | Descripción | Reintentable |
|:---|:---:|:---|:---:|
| `PREDICTION_LOCKED` | 410 | Predicción fuera del período editable | ❌ |
| `CONFIG_FROZEN` | 403 | Configuración de polla congelada | ❌ |
| `INVALID_POOL_MODE` | 400 | Modo de polla inconsistente | ❌ |
| `MATCH_NOT_FOUND` | 404 | Match ID no existe | ❌ |
| `POOL_NOT_FOUND` | 404 | Pool ID no existe | ❌ |
| `UNAUTHORIZED_POOL_ACCESS` | 403 | Usuario sin acceso a polla | ❌ |
| `INVALID_SCORE_RANGE` | 400 | Scores fuera de rango [0-20] | ❌ |
| `RATE_LIMIT_EXCEEDED` | 429 | Demasiadas requests (max 100/min por user) | ✅ |
| `INTERNAL_CALCULATION_ERROR` | 500 | Fallo en cálculo de puntos | ✅ |
| `AUDIT_LOG_WRITE_FAILED` | 500 | Fallo escribiendo log de auditoría | ✅ |

**Formato de Respuesta de Error:**
```json
{
  "code": "PREDICTION_LOCKED",
  "message": "This prediction cannot be edited. The match starts in 5 minutes.",
  "status": 410,
  "timestamp": "2026-06-15T13:55:00Z",
  "request_id": "req_123abc"
}
```

---

## 9. Seguridad y Compliance

### Rate Limiting
- **Global:** 1000 requests/hora por IP
- **Por usuario:** 100 requests/minuto para endpoints de predicción
- **Pool creation:** 5 pools/día por usuario

### CORS
```
Access-Control-Allow-Origin: https://parti2.app
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

### JWT Token Rotation
- Supabase maneja automáticamente via PKCE flow
- Refresh token expira cada 7 días
- Access token expira cada 1 hora

### Audit Trail
- Todos los cambios de predicción registrados en `bet_audit_logs`
- Retención: 90 días (datos archivados después)
- Campos capturados: `user_id`, `match_id`, `old_value`, `new_value`, `ip_address`, `created_at`

---

## 10. Estrategia de Testing

### Unit Tests
- **Scoring engine:** Jest tests para cada modalidad (global + pool-specific)
- **Validators:** Suites para range checks, enum validation
- **Utilities:** Group standings calculator, bracket generator

### Integration Tests
- Pool creation → config freezing → prediction locking
- Result registration → score calculation → leaderboard update
- Notification queue → idempotency verification

### E2E Tests (Playwright)
- User signup → pool join → prediction submission → score broadcast
- Admin result entry → global leaderboard refresh

### Performance Benchmarks
- Scoring calculation: < 2s para 10k predicciones
- Leaderboard query: < 500ms para 50k usuarios
- Prediction submission: < 200ms (P95)

---

## 11. Deployment & DevOps

### Checklist de Ambiente

**Environment Variables (`.env.local`):**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx
RESEND_API_KEY=xxx
CLOUDFLARE_ACCOUNT_ID=xxx
CLOUDFLARE_API_TOKEN=xxx
ADMIN_WEBHOOK_SECRET=xxx (para result registration)
```

### Deployment Steps
1. **Supabase Migrations:** `supabase db push`
2. **Build:** `npm run build`
3. **Test:** `npm run test:e2e`
4. **Deploy to Cloudflare:** `npm run deploy`
5. **Verify:** Health check en `/api/v1/health`

### Rollback Procedures
- Database: Migración automática rollback disponible en Supabase Dashboard
- Edge Workers: Versioning automático; revertir última versión en minutos
- Feature flags: Usar `@vercel/flags` para dark launch

### Monitoring & Alerting
- **Error Rate:** Alert si > 1% en APIs críticas
- **Latency:** P95 > 1s en prediction POST
- **Scoring Job:** Alert si falla cálculo de match
- **Email Queue:** Alert si > 100 emails sin enviar

---

## 12. Roadmap de Fases Posteriores (Post-MVP)

- **Fase 2 (Q3 2026):** Fantasy player picks (top scorer, MVP predictions)
- **Fase 3 (Q4 2026):** Social features (invitaciones, comentarios en vivo)
- **Fase 4 (Q1 2027):** Monetización (stakes en seco, marketplace de pollas premium)