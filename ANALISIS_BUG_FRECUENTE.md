# ANÁLISIS EXHAUSTIVO: Bug en SaveFrecuenteButton - Plantillas sin datos

## RESUMEN EJECUTIVO
Cuando se guarda un partido como frecuente desde el Dashboard usando SaveFrecuenteButton (ícono corazón), la plantilla se crea correctamente pero con valores hardcodeados (field_cost=0, rental_cost=0) porque:
1. El botón NO recibe los datos completos del partido
2. Solo recibe location, playersPerTeam e id
3. No tiene acceso a field_cost y rental_cost del objeto match
4. Envía valores por defecto a createTemplate

---

## 1. DÓNDE SE RENDERIZA SaveFrecuenteButton

**Archivo:** src/app/dashboard/page.tsx
**Líneas:** 183-187

```
<SaveFrecuenteButton
  location={match.location}
  playersPerTeam={Math.round(match.max_players / 2)}
  matchId={match.id}
/>
```

**Contexto:** Dentro del mapeo de recentMatches (últimos 6 partidos de los últimos 7 días)
**Ubicación visual:** Dentro de cada tarjeta de partido, junto al badge de nivel

---

## 2. QUÉ PROPS RECIBE SaveFrecuenteButton

**Archivo:** src/components/SaveFrecuenteButton.tsx
**Líneas:** 8-12

```
interface SaveFrecuenteButtonProps {
  location: string
  playersPerTeam: number
  matchId?: string | null
}
```

**Props pasados desde Dashboard:**
- location: OK - match.location (string)
- playersPerTeam: OK - Math.round(match.max_players / 2) (number)
- matchId: OK - match.id (string)

**Props que FALTA RECIBIR:**
- field_cost: NO SE PASA (DISPONIBLE en match)
- rental_cost: NO SE PASA (DISPONIBLE en match)
- has_rented_goalkeepers: NO SE PASA (DISPONIBLE en match)
- rented_goalkeepers_count: NO SE PASA (DISPONIBLE en match)
- time: NO SE PASA (DISPONIBLE en match.date)

---

## 3. QUÉ DATOS SE ENVÍAN A createTemplate()

**Archivo:** src/components/SaveFrecuenteButton.tsx
**Líneas:** 19-34

El handleSave() envía:
```
name: getMatchTitleFromLocation(location)
location: location
time: ""                           [HARDCODEADO A STRING VACÍO]
players_per_team: playersPerTeam
has_rented_goalkeepers: false      [HARDCODEADO A false]
rented_goalkeepers_count: 0        [HARDCODEADO A 0]
field_cost: 0                      [HARDCODEADO A 0]
rental_cost: 0                     [HARDCODEADO A 0]
save_participants: false           [HARDCODEADO A false]
match_id: matchId
```

---

## 4. QUÉ DATOS DEBERÍAN ENVIARSE

**Según CreateTemplateData (match-schema.ts, líneas 77-89):**

```
name: string                              OK - getMatchTitleFromLocation(location)
location: string                          OK - match.location
time: string                              ERROR - "" (debe ser match.date time portion)
players_per_team: number                  OK - playersPerTeam
has_rented_goalkeepers: boolean           ERROR - false (debe ser match.has_rented_goalkeepers)
rented_goalkeepers_count: number          ERROR - 0 (debe ser match.rented_goalkeepers_count)
field_cost: number                        ERROR - 0 (debe ser match.field_cost)
rental_cost: number                       ERROR - 0 (debe ser match.rental_cost)
save_participants: boolean                OK - false
match_id?: string                         OK - matchId
participants?: array                      OK - undefined (no aplica)
```

---

## 5. COMPARATIVA: SaveFrecuenteButton vs SaveFrecuenteCard

### SaveFrecuenteButton (Dashboard) - INCOMPLETO
**Archivo:** SaveFrecuenteButton.tsx

Props recibidos:
- location: OK
- playersPerTeam: OK
- matchId: OK
(FALTAN: field_cost, rental_cost, has_rented_goalkeepers, rented_goalkeepers_count, time)

Datos enviados:
- field_cost: 0 (ERROR)
- rental_cost: 0 (ERROR)
- has_rented_goalkeepers: false (ERROR)
- rented_goalkeepers_count: 0 (ERROR)
- time: "" (ERROR)

### SaveFrecuenteCard (Match Detail) - COMPLETO
**Archivo:** SaveFrecuenteCard.tsx

Props recibidos (líneas 8-19):
- location: OK
- defaultName: OK
- playersPerTeam: OK
- hasRentedGoalkeepers: OK
- rentedGoalkeepersCount: OK
- fieldCost: OK
- rentalCost: OK
- time: OK
- matchId: OK
- participants: OK
- onSaved: OK

Datos enviados (líneas 52-64):
- name: OK
- location: OK
- time: OK (pasado directamente)
- players_per_team: OK
- has_rented_goalkeepers: OK
- rented_goalkeepers_count: OK
- field_cost: OK
- rental_cost: OK
- save_participants: OK
- match_id: OK
- participants: OK

---

## 6. DATOS DISPONIBLES EN EL OBJETO match

**Tipo Match (useMatches.ts, líneas 13-27):**

```
id: string                          - Pasado a SaveFrecuenteButton
title: string                       - NO SE USA
location: string                    - Pasado a SaveFrecuenteButton
date: string                        - NO SE OBTIENE (se necesita time)
created_at?: string
updated_at?: string
max_players: number                 - Se usa para calcular playersPerTeam
created_by: string                  - NO SE USA
field_cost: number                  - DISPONIBLE PERO NO SE PASA
rental_cost: number                 - DISPONIBLE PERO NO SE PASA
has_rented_goalkeepers: boolean     - DISPONIBLE PERO NO SE PASA
rented_goalkeepers_count: number    - DISPONIBLE PERO NO SE PASA
players_per_team: number            - DISPONIBLE PERO RECALCULADO
```

**Select en fetchMatches (useMatches.ts, línea 61):**
Los datos se obtienen de: id, title, location, date, max_players, created_by, field_cost, rental_cost, has_rented_goalkeepers, rented_goalkeepers_count, players_per_team, created_at, updated_at

TODOS LOS DATOS NECESARIOS ESTÁN DISPONIBLES en el objeto match

---

## 7. IDENTIFICACIÓN EXACTA DEL BUG

### Causa Raíz:
SaveFrecuenteButton recibe información INCOMPLETA del match por diseño:
- Solo recibe: location, playersPerTeam, matchId
- No recibe: field_cost, rental_cost, has_rented_goalkeepers, rented_goalkeepers_count, time

### Por qué ocurre:
En dashboard/page.tsx línea 183-187, solo se pasan 3 props:
```
<SaveFrecuenteButton
  location={match.location}
  playersPerTeam={Math.round(match.max_players / 2)}
  matchId={match.id}
/>
```

Contrasta con cómo se usa en /match/[id] donde SaveFrecuenteCard recibe todos los datos.

### Consecuencia:
La función handleSave hardcodea valores por defecto:
```
field_cost: 0                      - SIEMPRE 0
rental_cost: 0                     - SIEMPRE 0
has_rented_goalkeepers: false      - SIEMPRE false
rented_goalkeepers_count: 0        - SIEMPRE 0
time: ""                           - SIEMPRE ""
```

### Resultado:
- Plantilla se crea EXITOSAMENTE en Supabase
- PERO con datos incompletos/por defecto
- Usuario ve plantilla "en blanco" sin costos ni horarios

---

## 8. FLUJO VISUAL DEL BUG

Dashboard Page
  |
  +-> fetchMatches() via useMatches hook
  |     |
  |     +-> retorna Match[] CON: field_cost, rental_cost, has_rented_goalkeepers, rented_goalkeepers_count
  |
  +-> renderiza SaveFrecuenteButton
        |
        +-> Props pasados: location, playersPerTeam, matchId
        |   (FALTA: field_cost, rental_cost, has_rented_goalkeepers, rented_goalkeepers_count, time)
        |
        +-> onClick handleSave()
              |
              +-> createTemplate() recibe:
                    field_cost: 0 (hardcodeado)
                    rental_cost: 0 (hardcodeado)
                    has_rented_goalkeepers: false (hardcodeado)
                    rented_goalkeepers_count: 0 (hardcodeado)
                    time: "" (hardcodeado)
                    |
                    +-> INSERT en Supabase match_templates
                          |
                          +-> Plantilla CREADA pero SIN DATOS

---

## ARCHIVOS RELEVANTES

Archivos con problemas:
- D:\REPOSITORIOS\fut-match-front\src\app\dashboard\page.tsx (línea 183)
- D:\REPOSITORIOS\fut-match-front\src\components\SaveFrecuenteButton.tsx (línea 8-41)

Archivos de comparación/referencia:
- D:\REPOSITORIOS\fut-match-front\src\components\SaveFrecuenteCard.tsx (línea 22-73)
- D:\REPOSITORIOS\fut-match-front\src\hooks\useFrecuentes.ts (línea 131-182)
- D:\REPOSITORIOS\fut-match-front\src\hooks\useMatches.ts (línea 43-96)
- D:\REPOSITORIOS\fut-match-front\src\lib\match-schema.ts (línea 77-89)

