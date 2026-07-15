# ADR-007: Notificaciones push web + iOS + Android

**Estado:** Aceptado  
**Fecha:** 2026-07-14  
**Decisor:** Equipo Parti2  
**Issue:** [#158](https://github.com/yoursoftteam/fut-match-front/issues/158)

---

## Contexto

Push es un requisito funcional para resultados de partidos, torneos y quinielas. La web ya tiene Firebase Cloud Messaging (FCM) con service worker. El móvil necesita push nativo en iOS (APNs) y Android (FCM).

### Estado actual (web)

- Firebase Messaging (`firebase` v12) + `firebase-admin` (v14)
- Service worker generado dinámicamente en `/api/sw`
- `useMatchPushSubscription`: registra SW, pide permiso `Notification`, obtiene FCM token, llama `/api/push/subscribe-topic`
- `/api/push/subscribe-topic`: guarda/elimina tokens en tabla `push_subscribers` via service role
- Triggers/webhooks para enviar notificaciones (fuera de este repo)

### Opciones

| Opción | Pros | Contras |
|--------|------|---------|
| **Expo Notifications** | Integración nativa con Expo, abstrae APNs/FCM, simple para equipo nuevo | Requiere adaptar backend a Expo push tokens |
| FCM/APNs directo | Más control, continuidad con Firebase web | Complejidad iOS/APNs, credenciales manuales |
| Solo web push en fase 1 | Menor alcance inicial | No cumple expectativa de app nativa |

## Decisión

**Expo Notifications para mobile. Tabla unificada de tokens por plataforma. Web se mantiene con FCM.**

### 1. Expo Notifications para mobile

```typescript
import * as Notifications from 'expo-notifications'

// Pedir permiso
const { status } = await Notifications.requestPermissionsAsync()

// Obtener token
const token = await Notifications.getExpoPushTokenAsync({
  projectId: 'parti2-4e211', // Firebase project ID
})

// Enviar al backend
await fetch('/api/push/register', {
  method: 'POST',
  body: JSON.stringify({
    token: token.data,
    platform: 'ios' | 'android',
    userId: user.id,
  }),
})
```

### 2. Modelo de tabla para tokens

```sql
-- Nueva tabla (reemplaza o extiende push_subscribers)
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
  token_type TEXT NOT NULL CHECK (token_type IN ('fcm', 'expo', 'apns')),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,  -- opcional: suscripción a partido específico
  pool_id UUID,  -- opcional: suscripción a pool específico
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(token)  -- un token = un device
);

-- Índices para consultas frecuentes
CREATE INDEX idx_push_subscriptions_user ON push_subscriptions(user_id);
CREATE INDEX idx_push_subscriptions_match ON push_subscriptions(match_id) WHERE match_id IS NOT NULL;
CREATE INDEX idx_push_subscriptions_pool ON push_subscriptions(pool_id) WHERE pool_id IS NOT NULL;
```

### 3. Eventos iniciales

| Evento | Trigger | Target | Plataforma |
|--------|---------|--------|-----------|
| **Resultado de partido** | Match finalizado | Inscritos del match | Todas |
| **Recordatorio de predicción** | 1h antes del kickoff | Usuarios del pool | Todas |
| **Nuevo inscrito** | INSERT en match_registrations | Owner del match | Todas |
| **Invitación a pool** | Join via invite code | Owner del pool | Todas |
| **Cambio en leaderboard** | UPDATE en bet_scores_aggregate | Usuarios del pool | Todas |

### 4. Opt-in / Opt-out

| Nivel | Default | Control |
|-------|---------|---------|
| **Permisos del sistema** | Pedir al primer login | Settings del SO |
| **Eventos de partidos** | Opt-in | Toggle en perfil de usuario |
| **Recordatorios de predicción** | Opt-in | Toggle en perfil de usuario |
| **Resultados y rankings** | Opt-in | Toggle en perfil de usuario |

```sql
-- Extender profiles o tabla de settings
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  match_results BOOLEAN DEFAULT true,
  prediction_reminders BOOLEAN DEFAULT true,
  leaderboard_changes BOOLEAN DEFAULT true,
  new_registrations BOOLEAN DEFAULT true,
  pool_invitations BOOLEAN DEFAULT true
);
```

### 5. Envío desde backend

```typescript
// Supabase Edge Function o Cloudflare Worker
async function sendPushNotification(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, string>
) {
  // Separar por tipo de token
  const expoTokens = tokens.filter(t => t.startsWith('ExpoPushToken'))
  const fcmTokens = tokens.filter(t => !t.startsWith('ExpoPushToken'))

  // Expo Push API
  if (expoTokens.length > 0) {
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      body: JSON.stringify(
        expoTokens.map(token => ({
          to: token,
          title,
          body,
          data,
          sound: 'default',
        }))
      ),
    })
  }

  // FCM (web) — mantener lógica existente
  if (fcmTokens.length > 0) {
    // ... firebase-admin sendToTopic o sendEach
  }
}
```

### 6. Testing de delivery

| Platform | Cómo testear |
|----------|-------------|
| **iOS** | TestFlight build → Simulator con push de prueba |
| **Android** | Play Internal → Emulador con FCM test console |
| **Web** | Browser con notificación permitida |

**Gate de testing:** Al menos 1 notificación exitosa por plataforma antes de beta.

## Criterios de aceptación

- [x] Decisión: Expo Notifications para mobile
- [x] Tabla `push_subscriptions` con platform y token_type
- [x] Eventos iniciales definidos: resultado, recordatorio, inscrito, invitación, leaderboard
- [x] Opt-out por categoría de notificación
- [x] Estrategia de testing por plataforma

## Consecuencias

### Positivas
- Expo Notifications abstrae APNs/FCM — el equipo no necesita entender certificados de Apple
- Tabla unificada permite enviar a cualquier plataforma desde un solo lugar
- Opt-out por categoría da control al usuario sin deshabilitar todo

### Negativas
- Tabla `push_subscribers` existente necesita migración a `push_subscriptions`
- Backend de envío necesita adapter para Expo Push API (nuevo endpoint o función)
- iOS requiere device físico para testing real (simulator tiene limitaciones)

### Neutras
- Web se mantiene con FCM — no hay que migrar
- Expo Notifications usa FCM internamente en Android — misma infraestructura
