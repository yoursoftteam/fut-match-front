"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { PublicPoolsModal } from "@/components/bet/PublicPoolsModal";
import { Globe, Lock, Users, Plus, ArrowLeft, KeyRound, Compass } from "lucide-react";
import { Pool, PoolVisibility } from "@/types/bet";

interface PoolWithMemberCount extends Pool {
  member_count: number;
}

export default function PoolsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pools, setPools] = useState<PoolWithMemberCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPublicModal, setShowPublicModal] = useState(false);

  const [inviteCode, setInviteCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [showJoinInput, setShowJoinInput] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/auth?mode=signin");
      return;
    }

    async function fetchPools() {
      setLoading(true);
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;

        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch("/api/v1/bet/pools", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const payload = await response.json();
          if (payload.success) {
            setPools(payload.data.pools);
          }
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    }

    fetchPools();
  }, [user, authLoading, router]);

  const handleJoinByCode = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (!code || code.length !== 10) {
      setJoinError("El código debe tener 10 caracteres");
      return;
    }

    setJoinLoading(true);
    setJoinError(null);

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        setJoinError("Debes iniciar sesión");
        return;
      }

      const res = await fetch("/api/v1/bet/pools/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ invite_code: code }),
      });

      const payload = await res.json();

      if (!res.ok || !payload.success) {
        const msg =
          payload.error?.message === "Pool not found"
            ? "Código inválido. Verifica e intenta de nuevo."
            : payload.error?.message === "User is already a member of this pool"
            ? "Ya eres miembro de esta polla"
            : payload.error?.message || "Error al unirse";
        setJoinError(msg);
        return;
      }

      router.push(payload.data.next);
    } catch {
      setJoinError("Error de conexión. Intenta de nuevo.");
    } finally {
      setJoinLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-dvh bg-[#0F172A] flex items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-slate-700 border-t-[#22C55E]" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0F172A] text-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push("/bet")}
              className="rounded-lg p-2 text-slate-400 hover:text-slate-50 transition-colors shrink-0"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="text-xl font-bold truncate">Mis Pollas</h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowPublicModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-50"
            >
              <Compass className="size-4" />
              <span className="hidden sm:inline">Explorar</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/bet/pools/new")}
              className="flex items-center gap-1.5 rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
            >
              <Plus className="size-4" />
              Crear
            </button>
          </div>
        </div>

        {/* Join by code trigger */}
        <button
          type="button"
          onClick={() => setShowJoinInput(!showJoinInput)}
          className="mb-6 flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-800 px-4 py-2.5 text-sm text-slate-500 transition-colors hover:border-slate-700 hover:text-slate-400"
        >
          <KeyRound className="size-4" />
          {showJoinInput ? "Ocultar" : "¿Tienes un código de invitación?"}
        </button>

        {/* Join by code input */}
        {showJoinInput && (
          <div className="mb-6 rounded-lg border border-slate-800 bg-slate-900/50 p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value.toUpperCase());
                  setJoinError(null);
                }}
                placeholder="Ej: ABC123DEF0"
                maxLength={10}
                className="flex-1 rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-slate-50 placeholder-slate-600 focus:border-[#22C55E]/50 focus:outline-none uppercase tracking-widest"
              />
              <button
                type="button"
                onClick={handleJoinByCode}
                disabled={joinLoading}
                className="rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors disabled:opacity-50 shrink-0"
              >
                {joinLoading ? "..." : "Unirse"}
              </button>
            </div>
            {joinError && (
              <p className="mt-2 text-xs text-red-400">{joinError}</p>
            )}
          </div>
        )}

        {/* Pools list */}
        {pools.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="mb-4 text-5xl">🏟️</div>
            <h2 className="text-lg font-semibold text-slate-300 mb-2">
              No tienes pollas aún
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Creá tu primera polla o explora las públicas disponibles.
            </p>
            <button
              type="button"
              onClick={() => router.push("/bet/pools/new")}
              className="rounded-lg bg-[#22C55E] px-6 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
            >
              Crear mi primera polla
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pools.map((pool) => (
              <button
                key={pool.id}
                type="button"
                onClick={() => router.push(`/bet/pools/${pool.id}`)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-left transition-colors hover:border-[#22C55E]/50"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-slate-50 truncate">
                      {pool.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        {pool.visibility === "public" ? (
                          <Globe className="size-3" />
                        ) : (
                          <Lock className="size-3" />
                        )}
                        {pool.visibility === "public" ? "Pública" : "Privada"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {pool.member_count} miembro{pool.member_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 ml-3 text-slate-500">
                    <span className="text-xs">→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Public pools modal */}
      <PublicPoolsModal
        open={showPublicModal}
        onClose={() => setShowPublicModal(false)}
        competitionType="pool"
      />
    </div>
  );
}
