# Cargar Seed Data - FIFA 2026 (Equipos y Partidos)

**Status:** Archivo de seed data creado ✅

---

## 📋 ¿Qué incluye el seed data?

- ✅ **Copa Mundial 2026** (torneo principal)
- ✅ **32 equipos** con banderas (URLs de flagcdn.com)
- ✅ **48 partidos de grupos** (6 por cada 8 grupos)
- ✅ **Fechas y horarios** realistas para junio 2026

## 🚀 Cómo Cargar los Datos

### Opción 1: Ejecutar Script (Recomendado)

```bash
# Hacer ejecutable el script
chmod +x supabase/load-seed-data.sh

# Ejecutar
./supabase/load-seed-data.sh
```

### Opción 2: Ejecutar manualmente en Supabase CLI

```bash
supabase db execute --file supabase/migrations/20260527_004_seed_fifa_2026.sql
```

### Opción 3: Via Dashboard de Supabase

1. Ve a **Supabase Dashboard** → Tu Proyecto
2. **SQL Editor** → **New Query**
3. Copia y pega el contenido de `supabase/migrations/20260527_004_seed_fifa_2026.sql`
4. Click **Run**

---

## 📊 Datos Cargados

### Equipos (32)

| Región | Equipos |
|:---|:---|
| **CONMEBOL (Sudamérica)** | Argentina, Brasil, Uruguay, Paraguay, Colombia, Perú, Chile, Ecuador, Bolivia, Venezuela |
| **CONCACAF (C.América/Caribe)** | México, Canadá, Costa Rica, USA, Jamaica, Honduras |
| **UEFA (Europa)** | Alemania, Francia, España, Italia, Inglaterra, Países Bajos, Bélgica, Portugal, Suiza, Austria, República Checa, Dinamarca, Ucrania |
| **AFC (Asia)** | Japón, Corea del Sur, Australia, Arabia Saudita, Irán, Emiratos Árabes Unidos |
| **CAF (África)** | Marruecos, Túnez, Senegal, Nigeria, Camerún, Costa de Marfil |

### Grupos (A-H)

| Grupo | Equipos |
|:---|:---|
| **A** | Argentina, Perú, Paraguay, Canadá |
| **B** | Francia, Países Bajos, Senegal, Egipto |
| **C** | España, Alemania, Japón, Costa Rica |
| **D** | Inglaterra, Irán, USA, Gales |
| **E** | Brasil, Serbia, Suiza, Camerún |
| **F** | Bélgica, Canadá, Marruecos, Croacia |
| **G** | México, Polonia, Uruguay, Arabia Saudita |
| **H** | Portugal, Corea del Sur, Rep. Checa, Dinamarca |

### Partidos de Grupos

- **Total:** 48 partidos
- **Fechas:** 15 de junio - 29 de junio, 2026
- **Estado:** Todos en `scheduled` (sin resultados oficiales)

---

## ✅ Verificar que los datos se cargaron

### En Supabase Dashboard

```sql
-- Ver todos los equipos
SELECT name, fifa_code FROM bet_teams ORDER BY name;
-- Debe retornar: 32 filas

-- Ver partidos de grupos
SELECT COUNT(*) as total_matches FROM bet_matches WHERE stage = 'group_stage';
-- Debe retornar: 48

-- Ver partidos de un grupo específico
SELECT 
  home_team.name as "Local",
  away_team.name as "Visitante",
  TO_CHAR(kickoff_at, 'YYYY-MM-DD HH24:MI') as "Hora"
FROM bet_matches
JOIN bet_teams home_team ON home_team_id = home_team.id
JOIN bet_teams away_team ON away_team_id = away_team.id
WHERE stage = 'group_stage' AND group_name = 'A'
ORDER BY kickoff_at;
```

### Con CLI

```bash
supabase sql --file /dev/stdin <<EOF
SELECT COUNT(*) as total_teams FROM bet_teams;
SELECT COUNT(*) as total_matches FROM bet_matches WHERE stage = 'group_stage';
EOF
```

---

## 🎯 Próximos Pasos

Una vez cargados los datos:

1. **Crear API routes** para:
   - GET `/api/v1/bet/matches` (listar partidos)
   - GET `/api/v1/bet/teams` (listar equipos)
   - POST `/api/v1/bet/predictions` (crear predicciones)

2. **Implementar UI**:
   - Card de partido (local vs visitante + banderas)
   - Input de predicción (score local / visitante)
   - Contador de bloqueo (lock timer)

3. **Conectar Realtime**:
   - Suscribirse a cambios de partidos
   - Actualizar scores en tiempo real

---

## 🐛 Solución de Problemas

### Error: "Function get_team_id does not exist"

**Causa:** La función temporal no se creó correctamente

**Solución:** La función se crea en la misma sesión, asegúrate de ejecutar TODO el archivo de una vez, no por partes.

### Error: "Duplicate invite_code"

**Causa:** El trigger de generación de códigos está en conflicto

**Solución:** Ejecuta:
```sql
TRUNCATE bet_pools, bet_pool_members RESTART IDENTITY CASCADE;
```

### Error: "Foreign key constraint failed"

**Causa:** Las migraciones 001-003 no se ejecutaron antes

**Solución:**
```bash
supabase db push  # Asegúrate de que todo está sincronizado
```

---

## 📝 Notas Importantes

- ✅ Las banderas se cargan desde `flagcdn.com` (CDN público)
- ✅ Los partidos de knockout se generarán automáticamente después de finalizar grupos
- ✅ Todos los partidos comienzan en estado `scheduled`
- ✅ Los scores oficiales (`home_score_official`, `away_score_official`) son `NULL` hasta que se completen
- ✅ Las predicciones de usuarios NO son creadas automáticamente

---

## 📂 Archivo Generado

```
supabase/migrations/20260527_004_seed_fifa_2026.sql
├── 1. Crea torneo FIFA 2026
├── 2. Inserta 32 equipos con códigos FIFA
├── 3. Inserta 48 partidos de grupos (junio 2026)
└── 4. Proporciona scripts de verificación
```

**Tamaño:** ~10 KB  
**Tiempo de ejecución:** ~5 segundos  

---

**Status:** ✅ LISTO PARA CARGAR

Una vez ejecutes el comando de carga, tendrás toda la estructura lista para:
- Crear predicciones
- Calcular grupos
- Generar bracket de knockout
- Competir en leaderboards
