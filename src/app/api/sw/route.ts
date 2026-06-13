import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyDZbpFVdzHPJ6C_bpAUmjL4DiaYTXNhLaI",
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "parti2-4e211.firebaseapp.com",
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "parti2-4e211",
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "parti2-4e211.appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1022726336826",
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1022726336826:web:4ab41c7ed69eee92d32003",
  };

  const swScript = `
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

var config = ${JSON.stringify(firebaseConfig)};

try {
  firebase.initializeApp(config);
} catch (e) {
  console.error("[sw] Firebase init error:", e);
}

var messaging;
try {
  messaging = firebase.messaging();
} catch (e) {
  console.error("[sw] Firebase messaging init error:", e);
}

if (messaging) {
  messaging.onBackgroundMessage(function(payload) {
    var title = payload.notification ? payload.notification.title : null;
    var body = payload.notification ? payload.notification.body : null;
    var data = payload.data || {};

    self.registration.showNotification(title || "Parti2", {
      body: body || "Nuevo movimiento en tu partido",
      icon: "/icon-192.png",
      badge: "/badge-72.png",
      data: { match_id: data.match_id, url: "/match/" + data.match_id },
    });
  });
}

self.addEventListener("notificationclick", function(event) {
  event.notification.close();
  var url = event.notification.data ? event.notification.data.url : "/dashboard";
  event.waitUntil(clients.openWindow(url));
});
`.trim();

  return new NextResponse(swScript, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "no-cache",
    },
  });
}
