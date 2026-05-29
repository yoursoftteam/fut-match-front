"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { ShareInviteModal } from "@/components/bet/ShareInviteModal";
import { Globe, Lock, Users, ArrowLeft, Share2, Target } from "lucide-react";

interface PoolDetail {
  id: string;
  tournament_id: string;
  name: string;
  visibility: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  total_participants: number;
}

export default function PoolDetailPage({
  params,
}: {
  params: Promise<{ poolId: string }>;
}) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [poolId, setPoolId] = useState<string | null>(null);
  const [pool, setPool] = useState<PoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    params.then(({ poolId: id }) => setPoolId(id));
  }, [params]);

  useEffect(() => {
    if (!poolId || authLoading) return;

    if (!user) {
      router.replace("/auth?mode=signin");
      return;
    }

    async function fetchPool() {
      setLoading(true);
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;

        if (!token) {
          setLoading(false);
          return;
        }

        const response = await fetch(`/api/v1/bet/pools/${poolId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          router.replace("/bet/pools");
          return;
        }

        const payload = await response.json();
        if (payload.success) {
          setPool(payload.data);
        }
      } catch {
        router.replace("/bet/pools");
      } finally {
        setLoading(false);
      }
    }

    fetchPool();
  }, [poolId, user, authLoading, router]);

  const inviteUrl = pool
    ? typeof window !== "undefined"
      ? `${window.location.origin}/join/${pool.invite_code}`
      : ""
    : "";

  const isOwner = user && pool && user.id === pool.owner_id;

  if (authLoading || loading || !poolId) {
    return (
      <div className="min-h-dvh bg-[#0F172A] flex items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-slate-700 border-t-[#22C55E]" />
      </div>
    );
  }

  if (!pool) {
    return null;
  }

  return (
    <div className="min-h-dvh bg-[#0F172A] text-slate-50">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push("/bet/pools")}
            className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-50 transition-colors"
          >
            <ArrowLeft className="size-4" />
            Mis pollas
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-slate-50 truncate">
                {pool.name}
              </h1>
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
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
                  {pool.total_participants} miembro{pool.total_participants !== 1 ? "s" : ""}
                </span>
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={() => router.push(`/bet/matches`)}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-300 hover:border-[#22C55E]/50 hover:text-slate-50 transition-colors"
              >
                <Target className="size-3.5" />
                Predecir
              </button>
              {(isOwner || pool.visibility === "public") && (
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="flex items-center gap-1.5 rounded-lg bg-[#22C55E] px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
                >
                  <Share2 className="size-3.5" />
                  Invitar
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-3">
            Acciones rápidas
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => router.push(`/bet/matches`)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-left transition-colors hover:border-[#22C55E]/50"
            >
              <div className="text-2xl mb-2">🎯</div>
              <p className="text-sm font-medium text-slate-50">Predicciones</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Marca tus pronósticos
              </p>
            </button>
            <button
              type="button"
              onClick={() => router.push(`/bet/leaderboard`)}
              className="rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-left transition-colors hover:border-[#22C55E]/50"
            >
              <div className="text-2xl mb-2">🏆</div>
              <p className="text-sm font-medium text-slate-50">Tabla</p>
              <p className="text-xs text-slate-500 mt-0.5">
                Clasificación de la polla
              </p>
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-600">
            Código de invitación: <span className="font-mono text-slate-400">{pool.invite_code}</span>
          </p>
        </div>
      </div>

      <ShareInviteModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        poolName={pool.name}
        inviteUrl={inviteUrl}
      />
    </div>
  );
}
