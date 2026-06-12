"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

type JoinStatus =
  | "validating_invite"
  | "invalid_code"
  | "redirecting";

interface PoolPreview {
  pool_id: string;
  tournament_id: string;
  pool_name: string;
  owner_name: string;
  visibility: string;
  total_members: number;
  created_at: string;
}

interface JoinInviteGateProps {
  inviteCode: string;
}

export function JoinInviteGate({ inviteCode }: JoinInviteGateProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<JoinStatus>("validating_invite");
  const [poolPreview, setPoolPreview] = useState<PoolPreview | null>(null);

  const normalizedCode = inviteCode.toUpperCase();

  // Validate invite code on mount
  useEffect(() => {
    let cancelled = false;

    async function validateInvite() {
      try {
        const response = await fetch(`/api/v1/bet/invites/${normalizedCode}`);
        const payload = await response.json();

        if (cancelled) return;

        if (!payload.success) {
          setStatus("invalid_code");
          return;
        }

        setPoolPreview(payload.data);
      } catch {
        if (!cancelled) {
          setStatus("invalid_code");
        }
      }
    }

    validateInvite();

    return () => {
      cancelled = true;
    };
  }, [normalizedCode]);

  // Handle join when user is authenticated
  const executeJoin = useCallback(async (userId: string) => {
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        return;
      }

      const response = await fetch("/api/v1/bet/pools/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invite_code: normalizedCode }),
      });

      const payload = await response.json();

      if (!payload.success) {
        setStatus("invalid_code");
        return;
      }

      try {
        window.localStorage.removeItem("p2:pendingInvite");
      } catch {
        /* ignore */
      }

      setStatus("redirecting");
      router.replace(payload.data.next);
    } catch {
      setStatus("invalid_code");
    }
  }, [normalizedCode, router]);

  // When auth finishes loading, decide what to do
  useEffect(() => {
    if (authLoading) return;

    if (user) {
      Promise.resolve().then(() => executeJoin(user.id));
    } else {
      try {
        window.localStorage.setItem("p2:pendingInvite", normalizedCode);
      } catch {
        /* ignore */
      }

      const timer = setTimeout(() => {
        const inviteParam = encodeURIComponent(normalizedCode);
        router.replace(
          `/auth?mode=signup&invite=${inviteParam}&redirectTo=/join/${normalizedCode}`
        );
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [authLoading, user, executeJoin, normalizedCode, router]);

  // Show pool preview when user is not authenticated (before redirect to auth)
  const showPoolPreview = !user && !authLoading && status === "validating_invite" && poolPreview;

  if (status === "validating_invite" && !showPoolPreview) {
    return (
      <div className="min-h-dvh bg-[#0F172A] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="size-8 animate-spin rounded-full border-2 border-slate-700 border-t-[#22C55E] mx-auto" />
          <p className="text-slate-400 text-sm">Chequeando el código...</p>
        </div>
      </div>
    );
  }

  if (status === "invalid_code") {
    return (
      <div className="min-h-dvh bg-[#0F172A] flex items-center justify-center px-4">
        <div className="text-center max-w-sm space-y-4">
          <div className="rounded-full bg-red-500/10 p-3 mx-auto w-fit">
            <span className="text-2xl">🔗</span>
          </div>
          <h1 className="text-xl font-bold text-slate-50">
            Ese link no existe o ya murió.
          </h1>
          <p className="text-sm text-slate-400">
            El código de invitación no es válido o la polla ya no está activa.
          </p>
          <a
            href="/bet"
            className="inline-block rounded-lg bg-[#22C55E] px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
          >
            Ir a Parti2 Bet
          </a>
        </div>
      </div>
    );
  }

  if (status === "redirecting") {
    return (
      <div className="min-h-dvh bg-[#0F172A] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="rounded-full bg-[#22C55E]/10 p-3 mx-auto w-fit">
            <svg className="size-6 text-[#22C55E]" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <p className="text-slate-300 text-sm font-medium">
            Ya estás fichado. Abriendo la tabla...
          </p>
        </div>
      </div>
    );
  }

  if (showPoolPreview) {
    return (
      <div className="min-h-dvh bg-[#0F172A] flex items-center justify-center px-4">
        <div className="text-center max-w-sm space-y-4">
          <h1 className="text-xl font-bold text-slate-50">{poolPreview.pool_name}</h1>
          <p className="text-sm text-slate-400">
            Creada por {poolPreview.owner_name} &middot;{" "}
            {poolPreview.total_members} miembro{poolPreview.total_members !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-slate-500">
            Estás a un paso de entrar a esta polla.
          </p>
          <div className="size-6 animate-spin rounded-full border-2 border-slate-700 border-t-[#22C55E] mx-auto" />
        </div>
      </div>
    );
  }

  // Fallback while loading preview
  return (
    <div className="min-h-dvh bg-[#0F172A] flex items-center justify-center">
      <div className="size-8 animate-spin rounded-full border-2 border-slate-700 border-t-[#22C55E]" />
    </div>
  );
}
