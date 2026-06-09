"use client";

import { useEffect } from "react";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage } from "firebase/messaging";
import { supabase } from "@/lib/supabase";

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
 * Subscribes the current device to a Firebase topic via the FCM v1 API.
 * Requires the FCM token and a server-side call to iid.googleapis.com.
 * Here we store the token in Supabase and let the Worker handle topic subscription
 * when it receives the registration event.
 */
export function useMatchPushSubscription(matchId: string | null) {
  useEffect(() => {
    if (!matchId || typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (!process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY) return;

    let cancelled = false;

    const subscribe = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          console.log("[push] notification permission denied");
          return;
        }

        const app = getFirebaseApp();
        const messaging = getMessaging(app);

        const token = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
          serviceWorkerRegistration: await navigator.serviceWorker.register(
            "/firebase-messaging-sw.js"
          ),
        });

        if (!token || cancelled) return;

        console.log("[push] FCM token obtained, subscribing to match topic");

        // Subscribe this token to the match topic via Supabase Edge Function or directly.
        // We call the Worker endpoint to register the token to the topic.
        await fetch("/api/push/subscribe-topic", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, match_id: matchId }),
        });

        // Foreground push handler
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
    return () => { cancelled = true; };
  }, [matchId]);
}
