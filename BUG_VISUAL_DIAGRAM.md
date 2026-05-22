# DIAGRAMA VISUAL DEL BUG: SaveFrecuenteButton

---

## TABLA 1: Flujo de Props desde Dashboard hacia SaveFrecuenteButton

```
MATCH OBJECT (Dashboard)
+- id: "abc123"                          ? PASADO a SaveFrecuenteButton
+- title: "Sabatino en el parque"        ? NO SE USA
+- location: "Parque Central"            ? PASADO a SaveFrecuenteButton
+- date: "2024-05-25T19:00"             ? NO SE OBTIENE (se necesita time)
+- max_players: 10                       ? USADO para calcular playersPerTeam (10/2=5)
+- created_by: "user123"                ? NO SE USA
+- field_cost: 50000                    ? NO SE PASA A SaveFrecuenteButton
+- rental_cost: 100000                  ? NO SE PASA A SaveFrecuenteButton
+- has_rented_goalkeepers: true         ? NO SE PASA A SaveFrecuenteButton
+- rented_goalkeepers_count: 2          ? NO SE PASA A SaveFrecuenteButton
+- players_per_team: 5                  ? DISPONIBLE (pero se recalcula)
```

### Resultado en SaveFrecuenteButton Props:
```
SaveFrecuenteButtonProps {
  location: "Parque Central"             ? COMPLETO
  playersPerTeam: 5                      ? COMPLETO
  matchId: "abc123"                      ? COMPLETO
  
  FALTA: field_cost                      ? PERDIDO
  FALTA: rental_cost                     ? PERDIDO
  FALTA: has_rented_goalkeepers          ? PERDIDO
  FALTA: rented_goalkeepers_count        ? PERDIDO
  FALTA: time                            ? PERDIDO
}
```

---

## TABLA 2: Datos Enviados a Supabase

### SaveFrecuenteButton (INCORRECTO)
```
createTemplate() recibe:
+- name: "Parque Central"                ? OK
+- location: "Parque Central"            ? OK
+- time: ""                              ? HARDCODEADO (VACÍO)
+- players_per_team: 5                   ? OK
+- has_rented_goalkeepers: false         ? HARDCODEADO (debería ser true)
+- rented_goalkeepers_count: 0           ? HARDCODEADO (debería ser 2)
+- field_cost: 0                         ? HARDCODEADO (debería ser 50000)
+- rental_cost: 0                        ? HARDCODEADO (debería ser 100000)
+- save_participants: false              ? OK
+- match_id: "abc123"                    ? OK

Resultado en match_templates:
+- name: "Parque Central"
+- location: "Parque Central"
+- time: ""                              ?? USUARIO VE PLANTILLA VACÍA
+- players_per_team: 5
+- has_rented_goalkeepers: false
+- rented_goalkeepers_count: 0
+- field_cost: 0
+- rental_cost: 0
+- save_participants: false
+- match_id: "abc123"
```

### SaveFrecuenteCard (CORRECTO - para comparación)
```
createTemplate() recibe:
+- name: "Sabatino en el parque"         ? OK
+- location: "Parque Central"            ? OK
+- time: "19:00"                         ? OK (pasado como prop)
+- players_per_team: 5                   ? OK
+- has_rented_goalkeepers: true          ? OK (pasado como prop)
+- rented_goalkeepers_count: 2           ? OK (pasado como prop)
+- field_cost: 50000                     ? OK (pasado como prop)
+- rental_cost: 100000                   ? OK (pasado como prop)
+- save_participants: false              ? OK
+- match_id: "abc123"                    ? OK

Resultado en match_templates:
+- name: "Sabatino en el parque"
+- location: "Parque Central"
+- time: "19:00"                         ? USUARIO VE HORARIO
+- players_per_team: 5
+- has_rented_goalkeepers: true
+- rented_goalkeepers_count: 2
+- field_cost: 50000                     ? USUARIO VE COSTO DE CANCHA
+- rental_cost: 100000                   ? USUARIO VE COSTO DE ALQUILER
+- save_participants: false
+- match_id: "abc123"
```

---

## TABLA 3: Diferencia en Props Recibidos

| Prop | SaveFrecuenteButton | SaveFrecuenteCard | Disponible en Match |
|------|-------------------|-----------------|-------------------|
| location | ? | ? | ? |
| defaultName | ? | ? | ? (como title) |
| playersPerTeam | ? | ? | ? (calculable) |
| hasRentedGoalkeepers | ? | ? | ? |
| rentedGoalkeepersCount | ? | ? | ? |
| fieldCost | ? | ? | ? |
| rentalCost | ? | ? | ? |
| time | ? | ? | ? (en date) |
| matchId | ? | ? | ? |
| participants | ? | ? | ? |
| onSaved callback | ? | ? | N/A |

**Conclusión:** SaveFrecuenteButton tiene acceso a 3 de 11 props disponibles. Faltan 7 props críticas.

---

## TABLA 4: Ubicación de Cada Componente

| Componente | Ubicación | Contexto | Props Recibidos |
|-----------|----------|---------|-----------------|
| SaveFrecuenteButton | Dashboard (recientes) | Ícono corazón en tarjeta | location, playersPerTeam, matchId |
| SaveFrecuenteCard | /match/[id] | Card completa con formulario | Todos los datos del match |

---

## TABLA 5: Impacto del Bug

| Campo | SaveFrecuenteButton | Impacto en Usuario |
|-------|---------------------|-------------------|
| field_cost | 0 (error) | No ve costo de cancha |
| rental_cost | 0 (error) | No ve costo de alquiler |
| time | "" (error) | No ve horario |
| has_rented_goalkeepers | false (error) | No ve si hay arqueros alquilados |
| rented_goalkeepers_count | 0 (error) | No ve cantidad de arqueros |

---

## TABLA 6: Estado Actual vs Deseado

### SaveFrecuenteButton (Actual - INCORRECTO)
```
interface SaveFrecuenteButtonProps {
  location: string
  playersPerTeam: number
  matchId?: string | null
}
```

### SaveFrecuenteButton (Deseado - CORRECTO)
```
interface SaveFrecuenteButtonProps {
  location: string
  playersPerTeam: number
  matchId?: string | null
  fieldCost?: number                    // ADD
  rentalCost?: number                   // ADD
  hasRentedGoalkeepers?: boolean        // ADD
  rentedGoalkeepersCount?: number       // ADD
  time?: string                         // ADD
}
```

---

## CÓDIGO PROBLEMÁTICO (Actual)

### En dashboard/page.tsx (línea 183-187)
```
<SaveFrecuenteButton
  location={match.location}
  playersPerTeam={Math.round(match.max_players / 2)}
  matchId={match.id}
/>
```

**DEBERÍA SER:**
```
<SaveFrecuenteButton
  location={match.location}
  playersPerTeam={match.players_per_team}
  matchId={match.id}
  fieldCost={match.field_cost}
  rentalCost={match.rental_cost}
  hasRentedGoalkeepers={match.has_rented_goalkeepers}
  rentedGoalkeepersCount={match.rented_goalkeepers_count}
  time={new Date(match.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
/>
```

### En SaveFrecuenteButton.tsx (línea 23-34)
```
const result = await createTemplate({
  name: getMatchTitleFromLocation(location),
  location,
  time: "",                              // ERROR: hardcodeado
  players_per_team: playersPerTeam,
  has_rented_goalkeepers: false,         // ERROR: hardcodeado
  rented_goalkeepers_count: 0,           // ERROR: hardcodeado
  field_cost: 0,                         // ERROR: hardcodeado
  rental_cost: 0,                        // ERROR: hardcodeado
  save_participants: false,
  match_id: matchId,
})
```

**DEBERÍA SER:**
```
const result = await createTemplate({
  name: getMatchTitleFromLocation(location),
  location,
  time: time ?? "",                      // USAR prop
  players_per_team: playersPerTeam,
  has_rented_goalkeepers: hasRentedGoalkeepers ?? false,  // USAR prop
  rented_goalkeepers_count: rentedGoalkeepersCount ?? 0,  // USAR prop
  field_cost: fieldCost ?? 0,            // USAR prop
  rental_cost: rentalCost ?? 0,          // USAR prop
  save_participants: false,
  match_id: matchId,
})
```

---

## CHECKLIST DE VERIFICACIÓN

[] 1. SaveFrecuenteButton recibe field_cost como prop
[] 2. SaveFrecuenteButton recibe rental_cost como prop
[] 3. SaveFrecuenteButton recibe has_rented_goalkeepers como prop
[] 4. SaveFrecuenteButton recibe rented_goalkeepers_count como prop
[] 5. SaveFrecuenteButton recibe time como prop
[] 6. Dashboard pasa field_cost a SaveFrecuenteButton
[] 7. Dashboard pasa rental_cost a SaveFrecuenteButton
[] 8. Dashboard pasa has_rented_goalkeepers a SaveFrecuenteButton
[] 9. Dashboard pasa rented_goalkeepers_count a SaveFrecuenteButton
[] 10. Dashboard pasa time a SaveFrecuenteButton
[] 11. createTemplate recibe valores reales en lugar de hardcodeados
[] 12. Plantilla se crea con datos completos en Supabase

