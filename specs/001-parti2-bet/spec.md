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