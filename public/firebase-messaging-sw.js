// Firebase Messaging Service Worker
// Must live at /firebase-messaging-sw.js (served from public root)

importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey:            self.FIREBASE_API_KEY            || "REPLACE_WITH_ENV",
  authDomain:        self.FIREBASE_AUTH_DOMAIN        || "parti2-4e211.firebaseapp.com",
  projectId:         self.FIREBASE_PROJECT_ID         || "parti2-4e211",
  storageBucket:     self.FIREBASE_STORAGE_BUCKET     || "parti2-4e211.appspot.com",
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || "REPLACE_WITH_ENV",
  appId:             self.FIREBASE_APP_ID             || "REPLACE_WITH_ENV",
});

const messaging = firebase.messaging();

// Background push handler — fires when the app is NOT in focus
messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification ?? {};
  const data = payload.data ?? {};

  console.log("[sw] background push received:", payload);

  self.registration.showNotification(title ?? "Parti2", {
    body: body ?? "Nuevo movimiento en tu partido",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    data: { match_id: data.match_id, url: `/match/${data.match_id}` },
  });
});

// Tap on notification → open the match
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(clients.openWindow(url));
});
