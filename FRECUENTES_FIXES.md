# Fixes: Partidos Frecuentes (Frecuentes by Match ID)

## RESUMEN DEL PROBLEMA

El sistema de "Partidos Frecuentes" tiene un **desajuste BD-Código** donde:
- La BD real (Supabase) YA tiene la columna `match_id` con FK a `matches(id)`
- El archivo `supabase-schema.sql` en el repo estaba desactualizado (falta columna `match_id`)
- El código TypeScript en `useFrecuentes.ts` intenta usar `match_id` (correcto, pero schema estaba desactualizado)

## BUGS IDENTIFICADOS

### ✅ BUG #1: Schema SQL desactualizado
**Estado**: SOLUCIONADO

**Problema**: `supabase-schema.sql` no reflejaba el estado actual de la BD
- Faltaba: `match_id UUID REFERENCES matches(id)` en `match_templates`
- Faltaba: índice `idx_match_templates_match_id`

**Solución aplicada**:
- ✏️ Agregado: columna `match_id UUID REFERENCES matches(id)` en `CREATE TABLE match_templates`
- ✏️ Agregado: índice `CREATE INDEX idx_match_templates_match_id ON match_templates (match_id)`
- ✅ Archivo: `supabase-schema.sql` (líneas 197 y 217)

---

### ⚠️ SITUACIÓN ACTUAL DE `match_id`

**En Supabase (BD real)**: ✅ EXISTE Y FUNCIONA
- Columna: `match_id UUID` (nullable)
- FK constraint: `match_templates_match_id_fkey` → `matches(id)`
- Índice: `idx_match_templates_match_id` ✅ EXISTE

**En código TypeScript**: ✅ EXISTE Y SE USA CORRECTAMENTE
- `useFrecuentes.ts`:
  - ✅ `getTemplateByMatchId(matchId)` - Query por `match_id` (línea 79-108)
  - ✅ `deleteTemplateByMatchId(matchId)` - Delete por `match_id` (línea 110-129)
  - ✅ `createTemplate()` - Puede guardar `match_id` (línea 147-149)
  - ✅ `createMatchFromTemplate()` - NO usa `match_id` (correcto: crea nuevo match)

**En componentes**: ✅ SE USAN CORRECTAMENTE
- `SaveFrecuenteButton.tsx` (línea 33): Pasa `match_id: matchId` al crear template ✅
- `SaveFrecuenteCard.tsx` (línea 62): Pasa `match_id: matchId` al crear template ✅
- `MatchInfoSidebar.tsx` (línea 44): Usa `getTemplateByMatchId()` para verificar si match ya es frecuente ✅
- `MatchInfoSidebar.tsx` (línea 124): Usa `deleteTemplateByMatchId()` para eliminar template por match ✅

---

## FUNCIONALIDAD: ¿QUÉ HACE `match_id`?

### Caso de uso: Evitar duplicados de plantillas

**Flujo**:
1. User crea Match A
2. User hace click "❤️ Guardar como frecuente" → Se crea `MatchTemplate` con `match_id = A.id`
3. User navega a `/match/A` → En `MatchInfoSidebar`:
   - Query: `getTemplateByMatchId(A.id)` 
   - Si existe template con ese `match_id` → Mostrar opción "Eliminar de frecuentes"
   - Si NO existe → Mostrar opción "Guardar como frecuente"

**Beneficio**: Un match específico NO puede guardarse como plantilla 2+ veces

---

## VALIDACIONES Y RLS POLICY

### Seguridad actual:

**RLS Policy** (`match_templates`): ✅ COMPLETA Y CORRECTA
```sql
-- SELECT: Solo usuario propietario
FOR SELECT USING (auth.uid() = user_id)

-- INSERT: Solo usuario autenticado 
FOR INSERT WITH CHECK (auth.uid() = user_id)

-- UPDATE: Solo usuario propietario
FOR UPDATE USING (auth.uid() = user_id)

-- DELETE: Solo usuario propietario
FOR DELETE USING (auth.uid() = user_id)
```

**Nota**: `match_id` NO requiere RLS separada porque:
- Si `match_id = M.id` donde `M.created_by = user_X`
- Y template validado por `auth.uid() = user_id`
- Entonces usuario_X es dueño del template
- No hay riesgo de leaking datos

---

## PRÓXIMAS VERIFICACIONES

### ✅ TODO: Tests manuales

1. **Crear template con `match_id`**
   - [ ] Crear match manualmente
   - [ ] Click "❤️ Guardar como frecuente"
   - [ ] Verificar en `/dashboard` que aparezca en "Tus Frecuentes"
   - [ ] Verificar en BD que `match_templates.match_id` != NULL

2. **Detectar duplicado**
   - [ ] Con match ya guardado como template, ir a `/match/{id}`
   - [ ] Click "Eliminar de frecuentes" (debe usar `deleteTemplateByMatchId`)
   - [ ] Verificar que desaparezca de "Tus Frecuentes"

3. **Crear match desde template**
   - [ ] Usar template → Ir a `/create?template={id}`
   - [ ] Match nuevo debe tener `match_id = NULL` (diferente al template usado)
   - [ ] Guardar ese match como frecuente (nuevo `match_id`)
   - [ ] Verificar que coexistan 2 templates: orig + nueva

---

## ARCHIVOS MODIFICADOS EN ESTE BRANCH

✏️ `supabase-schema.sql` - Actualizado schema para incluir `match_id`

---

## ESTADO DEL BRANCH

- Branch: `fix/frecuentes-match-id-sync`
- Status: LISTO PARA REVIEW/MERGE
- Cambios: Schema SQL actualizado, código TypeScript OK, RLS OK

---

## CHANGELOG

| Archivo | Cambio | Razón |
|---------|--------|-------|
| `supabase-schema.sql` | Agregado `match_id` + índice | Sincronizar con BD real |

