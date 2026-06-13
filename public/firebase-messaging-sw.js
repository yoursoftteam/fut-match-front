importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js");

var config = self.__FIREBASE_CONFIG__;

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
