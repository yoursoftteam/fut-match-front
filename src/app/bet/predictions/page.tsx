"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Globe, Lock, Plus, Target, Users, KeyRound, Compass } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { PublicPoolsModal } from "@/components/bet/PublicPoolsModal";
import { Pool, PoolVisibility } from "@/types/bet";

interface CompetitionWithMemberCount extends Pool {
  member_count: number;
}

export default function PredictionCompetitionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [competitions, setCompetitions] = useState<CompetitionWithMemberCount[]>([]);
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

    async function fetchCompetitions() {
      setLoading(true);
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;

        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch("/api/v1/bet/pools?competition_type=predictions", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const payload = await response.json();
          if (payload.success) {
            setCompetitions(payload.data.pools);
          }
        }
      } catch {
        // Ignore fetch failures and keep the empty state.
      } finally {
        setLoading(false);
      }
    }

    fetchCompetitions();
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
            ? "Ya eres miembro de esta competencia"
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
      <div className="flex min-h-dvh items-center justify-center bg-[#0F172A]">
        <div className="size-8 animate-spin rounded-full border-2 border-slate-700 border-t-[#22C55E]" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0F172A] text-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/bet")}
              className="rounded-lg p-2 text-slate-400 transition-colors hover:text-slate-50 shrink-0"
              aria-label="Volver a Parti2 Bet"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold">Mis competencias</h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Solo marcadores, tabla y bragging rights.
              </p>
            </div>
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
              onClick={() => router.push("/bet/predictions/new")}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
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
                className="rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 disabled:opacity-50 shrink-0"
              >
                {joinLoading ? "..." : "Unirse"}
              </button>
            </div>
            {joinError && (
              <p className="mt-2 text-xs text-red-400">{joinError}</p>
            )}
          </div>
        )}

        {/* Competitions list */}
        {competitions.length === 0 ? (
          <div className="mt-12 rounded-lg border border-slate-800 bg-slate-900/70 px-5 py-10 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-[#22C55E]/10 text-[#22C55E]">
              <Target className="size-6" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-slate-300">
              Aun no tienes competencias
            </h2>
            <p className="mb-6 text-sm text-slate-500">
              Creá una tabla de predicciones o explora las públicas disponibles.
            </p>
            <button
              type="button"
              onClick={() => router.push("/bet/predictions/new")}
              className="rounded-lg bg-[#22C55E] px-6 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400"
            >
              Crear competencia
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {competitions.map((competition) => (
              <button
                key={competition.id}
                type="button"
                onClick={() => router.push(`/bet/predictions/${competition.id}`)}
                className="w-full rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-left transition-colors hover:border-[#22C55E]/50"
              >
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-slate-50">
                      {competition.name}
                    </h3>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        {competition.visibility === PoolVisibility.PUBLIC ? (
                          <Globe className="size-3" />
                        ) : (
                          <Lock className="size-3" />
                        )}
                        {competition.visibility === PoolVisibility.PUBLIC ? "Publica" : "Privada"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="size-3" />
                        {competition.member_count} miembro{competition.member_count !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="ml-3 shrink-0 text-xs text-[#22C55E]">
                    Abrir
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
        competitionType="predictions"
      />
    </div>
  );
}
