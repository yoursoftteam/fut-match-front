# SOLUCIÓN: Error "Invalid supabaseUrl" en Producción

## 🔴 El Problema

```
Uncaught Error: Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.
```

Este error ocurre porque `NEXT_PUBLIC_SUPABASE_URL` **no está definida en Cloudflare Pages** en producción.

---

## 🔍 Por Qué Sucede

| Ambiente | Estado | Razón |
|----------|--------|-------|
| **Local** | ✅ Funciona | `.env` tiene las variables |
| **Build de Next.js** | ✅ Funciona | Variables disponibles en build time |
| **Cloudflare Pages** | ❌ Falla | Variables NO están en el dashboard |

El error ocurre cuando el navegador intenta crear el cliente Supabase sin las variables de entorno.

---

## ✅ SOLUCIÓN: Configurar Variables en Cloudflare Dashboard

### Paso 1: Accede a Cloudflare Dashboard

1. Ve a: https://dash.cloudflare.com/
2. Selecciona tu cuenta
3. Ve a **Pages** en el menú lateral

### Paso 2: Selecciona el Proyecto

1. Haz clic en **parti2** (el proyecto)
2. Verás el último deployment

### Paso 3: Ve a Settings → Environment Variables

**IMPORTANTE**: Hay dos formas de acceder:

**Opción A (Recomendada):**
1. Arriba a la derecha, haz clic en **⚙️ Settings**
2. Busca **"Environment variables"** en el menú izquierdo
3. Haz clic en **"Environment variables"**

**Opción B:**
1. Ve a **Deployments** (pestaña)
2. En la parte inferior, haz clic en **Settings**
3. Busca **"Environment variables"**

### Paso 4: Crea las Variables

Necesitas agregar **3 variables** en el ambiente **Production**:

#### ✏️ Variable 1: NEXT_PUBLIC_SUPABASE_URL

```
Nombre: NEXT_PUBLIC_SUPABASE_URL
Valor: https://ooewvkfxvbxghqwgajem.supabase.co
Ambiente: Production (solo)
```

**Pasos:**
1. Haz clic en **"Add variable"** o **"Create variable"**
2. En **Variable name**: Escribe `NEXT_PUBLIC_SUPABASE_URL`
3. En **Value**: Escribe `https://ooewvkfxvbxghqwgajem.supabase.co`
4. En **Environments**: Asegúrate que **Production** está seleccionado
5. Haz clic en **"Save"**

#### ✏️ Variable 2: NEXT_PUBLIC_SUPABASE_ANON_KEY

```
Nombre: NEXT_PUBLIC_SUPABASE_ANON_KEY
Valor: sb_publishable__glpYBVn5KqbjCfGNdcSgA_HxL6pj9K
Ambiente: Production (solo)
```

**Pasos:**
1. Haz clic en **"Add variable"** nuevamente
2. En **Variable name**: Escribe `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. En **Value**: Escribe `sb_publishable__glpYBVn5KqbjCfGNdcSgA_HxL6pj9K`
4. En **Environments**: Selecciona **Production**
5. Haz clic en **"Save"**

#### ✏️ Variable 3: NEXT_PUBLIC_APP_URL

```
Nombre: NEXT_PUBLIC_APP_URL
Valor: https://parti2.app
Ambiente: Production (solo)
```

**Pasos:**
1. Haz clic en **"Add variable"** otra vez
2. En **Variable name**: Escribe `NEXT_PUBLIC_APP_URL`
3. En **Value**: Escribe `https://parti2.app`
4. En **Environments**: Selecciona **Production**
5. Haz clic en **"Save"**

### Paso 5: Redeployar

Después de guardar las variables, Cloudflare debería:
- ✅ Mostrar un botón **"Redeploy"** o **"Deploy"**
- ✅ O redeployar automáticamente

Si ves un botón **"Redeploy"**:
1. Haz clic en él
2. Espera a que termime (verás "Deployment complete")

### Paso 6: Verifica en Producción

1. Ve a https://parti2.app
2. Abre DevTools (F12 → Console)
3. Verifica que **NO hay error de Supabase**
4. La página debe cargar normalmente

---

## 🔍 VERIFICACIÓN RÁPIDA

### ¿Cómo saber si funcionó?

**En la consola del navegador (F12):**

✅ **CORRECTO**: Sin errores de Supabase, ver página normal
```
[No hay errores sobre "Invalid supabaseUrl"]
```

❌ **INCORRECTO**: Aún error de Supabase
```
Uncaught Error: Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL.
```

---

## ⚠️ SI AÚN NO FUNCIONA

### Checklist:

- [ ] ¿Copiaste exactamente los valores sin espacios?
- [ ] ¿Seleccionaste "Production" en los Environments?
- [ ] ¿Hiciste clic en "Save" después de cada variable?
- [ ] ¿Redeployó Cloudflare (aparece "Deployment complete")?
- [ ] ¿Limpiaste el cache del navegador? (Ctrl+Shift+Del)
- [ ] ¿Esperaste 2-3 minutos después del redeployment?

### Si aún falla:

1. En Cloudflare Dashboard, ve a **Deployments**
2. Haz clic en el deployment más reciente
3. Verifica que diga **"Success"** (no "Failed")
4. Si dice "Failed", haz clic en **"View build log"** para ver qué salió mal

---

## 📝 RESUMEN

El error ocurrió porque:
1. ✅ El código local funcionaba (`.env` presente)
2. ❌ En Cloudflare Pages, las variables NO estaban configuradas
3. ✅ Solución: Agregar las 3 variables en Cloudflare Dashboard

Esto es **normal** en deployments en Cloudflare. Siempre hay que configurar:
- Variables públicas (`NEXT_PUBLIC_*`) en el dashboard
- Variables privadas (si las hay) también en el dashboard

---

## 🎯 PRÓXIMOS PASOS

Después de que funcione:

1. Verifica que el login funciona: https://parti2.app/auth
2. Crea una cuenta de prueba
3. Revisa el email de confirmación
4. Confirma la cuenta
5. Accede al dashboard: https://parti2.app/dashboard

¡Listo! 🚀
