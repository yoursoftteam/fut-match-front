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
self.addEventListener("push", function(event) {
  console.log("[sw] RAW push event received");
  if (event.data) {
    try {
      var payload = event.data.json();
      console.log("[sw] push payload:", JSON.stringify(payload));
      var title = payload.notification?.title || payload.data?.title || "Parti2";
      var body = payload.notification?.body || payload.data?.body || "Nuevo movimiento";
      var matchId = payload.data?.match_id || "";
      event.waitUntil(
        self.registration.showNotification(title, {
          body: body,
          icon: "/p2-logo.png",
          badge: "/p2-logo.png",
          data: { match_id: matchId, url: matchId ? "/match/" + matchId : "/dashboard" },
        })
      );
    } catch(e) {
      console.log("[sw] push data not JSON:", event.data.text());
      self.registration.showNotification("Parti2", { body: event.data.text() || "Nuevo movimiento", icon: "/p2-logo.png" });
    }
  } else {
    console.log("[sw] push event with no data");
    self.registration.showNotification("Parti2", { body: "Nuevo movimiento", icon: "/p2-logo.png" });
  }
});

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
    var data = payload.data || {};
    self.registration.showNotification(payload.notification?.title || "Parti2", {
      body: payload.notification?.body || "Nuevo movimiento en tu partido",
      icon: "/p2-logo.png",
      badge: "/p2-logo.png",
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
      "Service-Worker-Allowed": "/",
    },
  });
}
