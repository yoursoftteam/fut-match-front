// Parti2 PWA Service Worker — v1.0.0
// VAPID Web Push only. FCM is handled by firebase-messaging-sw.js (separate).

const CACHE_VERSION = "v1";
const STATIC_CACHE = `parti2-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `parti2-dynamic-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline.html";

const PRECACHE_URLS = [
  "/",
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
  "/icons/apple-icon-180x180.png",
  "/icons/badge-96x96.png",
];

// ── INSTALL ────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      await cache.addAll(PRECACHE_URLS);
      await self.skipWaiting();
    })(),
  );
});

// ── ACTIVATE ───────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== DYNAMIC_CACHE)
          .map((k) => caches.delete(k)),
      );
      await self.clients.claim();
    })(),
  );
});

// ── FETCH ──────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.protocol === "ws:" || url.protocol === "wss:") return;

  // APIs: network only
  if (url.pathname.startsWith("/api/")) return;

  // Static assets: cache first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname === "/manifest.webmanifest" ||
    url.pathname === "/favicon.ico"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Google Fonts: cache first
  if (
    url.hostname === "fonts.gstatic.com" ||
    url.hostname === "fonts.googleapis.com"
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation: network first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(networkFirstWithFallback(request));
    return;
  }

  // Everything else: network first
  event.respondWith(networkFirst(request));
});

// ── CACHE STRATEGIES ───────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    if (request.mode === "navigate") {
      const cache = await caches.open(STATIC_CACHE);
      return cache.match(OFFLINE_URL);
    }
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.headers.get("Accept")?.includes("text/html")) {
      const cache = await caches.open(STATIC_CACHE);
      return cache.match(OFFLINE_URL);
    }
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const cache = await caches.open(STATIC_CACHE);
    return cache.match(OFFLINE_URL);
  }
}

// ── PUSH (VAPID Web Push) ─────────────────────────────
self.addEventListener("push", (event) => {
  let data;
  try {
    data = event.data.json();
  } catch {
    try {
      data = JSON.parse(event.data.text());
    } catch {
      return;
    }
  }

  const title = data.title || "Parti2";
  const body = data.body || "";
  const icon = "/icons/icon-192x192.png";
  const badge = "/icons/badge-96x96.png";
  const url = data.url || "/";
  const tag = data.tag || `parti2-${Date.now()}`;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      tag,
      data: { url, timestamp: Date.now() },
      vibrate: [200, 100, 200],
      requireInteraction: true,
      silent: false,
    }),
  );
});

// ── NOTIFICATION CLICK ─────────────────────────────────
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = event.notification.data?.url || "/";
  const urlToOpen = new URL(url, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientList = await clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      for (const client of clientList) {
        if (client.url === urlToOpen && "focus" in client) {
          return client.focus();
        }
      }

      for (const client of clientList) {
        if (
          "navigate" in client &&
          client.url.startsWith(self.location.origin)
        ) {
          await client.navigate(urlToOpen);
          return client.focus();
        }
      }

      return clients.openWindow(urlToOpen);
    })(),
  );
});

// ── MESSAGE CHANNEL ────────────────────────────────────
self.addEventListener("message", (event) => {
  const { data } = event;
  if (!data || !data.type) return;

  switch (data.type) {
    case "SKIP_WAITING":
      self.skipWaiting();
      break;

    case "CLEAR_CACHES":
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
      break;

    case "GET_STATUS":
      event.source?.postMessage({
        type: "SW_STATUS",
        version: CACHE_VERSION,
      });
      break;

    default:
      break;
  }
});
