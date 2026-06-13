"use client";

import { useEffect } from "react";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function getFirebaseApp() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

/**
 * Subscribes the current device to a Firebase topic so it receives
 * push notifications when players join or leave the match.
 * Unsubscribes automatically on cleanup (navigate away / unmount).
 */
export function useMatchPushSubscription(matchId: string | null) {
  useEffect(() => {
    if (!matchId || typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) return;

    let cancelled = false;
    let currentToken: string | null = null;

    const subscribe = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.log("[push] notification permission denied");
          return;
        }

        const app = getFirebaseApp();
        const messaging = getMessaging(app);

        try {
          await navigator.serviceWorker.register(
            "/api/sw",
            { scope: "/" },
          );
        } catch (swErr) {
          console.warn("[push] SW registration failed:", swErr);
        }

        const swRegistration = await navigator.serviceWorker.ready;
        if (!swRegistration || !swRegistration.active) {
          console.warn("[push] no active service worker available");
          return;
        }

        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: swRegistration,
        });

        if (!token || cancelled) return;
        currentToken = token;

        console.log("[push] FCM token obtained, subscribing to match topic");

        await fetch("/api/push/subscribe-topic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, match_id: matchId }),
        });

        onMessage(messaging, (payload) => {
          console.log("[push] foreground message:", payload);
          const { title, body } = payload.notification ?? {};
          if (title) {
            new Notification(title, { body: body ?? "", icon: "/icon-192.png" });
          }
        });
      } catch (err) {
        if (!cancelled) console.error("[push] subscription error:", err);
      }
    };

    subscribe();

    return () => {
      cancelled = true;
      if (currentToken) {
        fetch("/api/push/subscribe-topic", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: currentToken, match_id: matchId }),
        }).catch(() => {});
      }
    };
  }, [matchId]);
}
