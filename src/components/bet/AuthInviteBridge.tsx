"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function AuthInviteBridge() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processedRef = useRef(false);

  useEffect(() => {
    if (processedRef.current) return;

    const subscription = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event !== "SIGNED_IN" || !session) return;

      processedRef.current = true;

      const inviteCode =
        searchParams.get("invite") ??
        (typeof window !== "undefined"
          ? window.localStorage.getItem("p2:pendingInvite")
          : null);

      if (!inviteCode) {
        router.replace("/dashboard");
        return;
      }

      try {
        const response = await fetch("/api/v1/bet/pools/join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ invite_code: inviteCode }),
        });

        const payload = await response.json();

        if (payload.success) {
          try {
            window.localStorage.removeItem("p2:pendingInvite");
          } catch {
            /* ignore */
          }
          router.replace(payload.data.next);
        } else {
          router.replace("/dashboard");
        }
      } catch {
        router.replace("/dashboard");
      }
    });

    return () => {
      subscription.data.subscription.unsubscribe();
    };
  }, [router, searchParams]);

  return null;
}
