"use client";

import { useEffect, useRef, useState } from "react";

interface PWAState {
  isInstalled: boolean;
  isUpdateAvailable: boolean;
  isOnline: boolean;
  registration: ServiceWorkerRegistration | null;
}

interface SWConfig {
  appUrl: string;
  vapidPublicKey: string;
}

export function usePWA(config?: SWConfig): PWAState {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    isUpdateAvailable: false,
    isOnline: true,
    registration: null,
  });

  const configRef = useRef(config);
  configRef.current = config;

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;

    setState((prev) => ({ ...prev, isInstalled: isStandalone }));

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    const handleDisplayMode = (e: MediaQueryListEvent) => {
      setState((prev) => ({ ...prev, isInstalled: e.matches }));
    };
    mediaQuery.addEventListener("change", handleDisplayMode);

    const handleOnline = () =>
      setState((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () =>
      setState((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setState((prev) => ({ ...prev, isOnline: navigator.onLine }));

    if (!("serviceWorker" in navigator)) return;

    let refreshing = false;

    const registerSW = async () => {
      try {
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });

        setState((prev) => ({ ...prev, registration: reg }));

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              setState((prev) => ({ ...prev, isUpdateAvailable: true }));
            }
          });
        });

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });

        if (reg.active) {
          const cfg = configRef.current;
          reg.active.postMessage({
            type: "CONFIG",
            appUrl: cfg?.appUrl || window.location.origin,
            vapidPublicKey: cfg?.vapidPublicKey || "",
          });
        }
      } catch (err) {
        console.error("SW registration failed:", err);
      }
    };

    registerSW();

    return () => {
      mediaQuery.removeEventListener("change", handleDisplayMode);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return state;
}

export function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
