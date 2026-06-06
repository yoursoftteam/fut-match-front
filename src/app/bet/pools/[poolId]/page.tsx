"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { ShareInviteModal } from "@/components/bet/ShareInviteModal";
import { PoolRanking } from "@/components/bet/PoolRanking";
import { RemoveMemberDialog } from "@/components/bet/RemoveMemberDialog";
import { cn } from "@/lib/utils";
import { Globe, Lock, Users, ArrowLeft, Share2, Target, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

interface RankingEntry {
  rank: number;
  user_id: string;
  name: string;
  email: string;
  points_total: number;
  exact_predictions: number;
  total_predictions: number;
}

interface PoolDetail {
  id: string;
  tournament_id: string;
  name: string;
  competition_type: "pool" | "predictions";
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
  const [showFullTable, setShowFullTable] = useState(false);
  const [allRankings, setAllRankings] = useState<RankingEntry[]>([]);
  const [rankingsLoading, setRankingsLoading] = useState(false);
  const [rankingsPage, setRankingsPage] = useState(1);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [pendingRemove, setPendingRemove] = useState<{ userId: string; name: string } | null>(null);
  const RANKINGS_PER_PAGE = 10;

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

  const execRemove = async (memberUserId: string) => {
    if (!pool) return;

    setRemovingUserId(memberUserId);
    setPendingRemove(null);
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data: authData } = await supabase.auth.getSession();
      const token = authData?.session?.access_token;
      if (!token) { setRemovingUserId(null); return; }

      const response = await fetch(`/api/v1/bet/pools/${poolId}/members/${memberUserId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        setAllRankings((prev) => prev.filter((e) => e.user_id !== memberUserId));
      }
    } catch {
      // ignore
    } finally {
      setRemovingUserId(null);
    }
  };

  useEffect(() => {
    if (!showFullTable || !poolId) return;
    let cancelled = false;

    async function fetchRankings() {
      setRankingsLoading(true);
      const { supabase } = await import('@/lib/supabase');
      const { data: authData } = await supabase.auth.getSession();
      const token = authData?.session?.access_token;
      if (!token) { setRankingsLoading(false); return; }

      const response = await fetch(`/api/v1/bet/pools/${poolId}/ranking`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();
      if (!cancelled && result.success && Array.isArray(result.data)) {
        setAllRankings(result.data);
      }
      if (!cancelled) setRankingsLoading(false);
    }

    fetchRankings();
    return () => { cancelled = true; };
  }, [showFullTable, poolId]);

  const restRankings = allRankings.length > 5 ? allRankings.slice(5) : [];
  const totalRankingPages = Math.max(1, Math.ceil(restRankings.length / RANKINGS_PER_PAGE));
  const currentRankingPage = Math.min(rankingsPage, totalRankingPages);
  const paginatedRankings = restRankings.slice(
    (currentRankingPage - 1) * RANKINGS_PER_PAGE,
    currentRankingPage * RANKINGS_PER_PAGE
  );

  const isOwner = user && pool && user.id === pool.owner_id;
  const isPredictionCompetition = pool?.competition_type === "predictions";
  const listPath = isPredictionCompetition ? "/bet/predictions" : "/bet/pools";
  const listLabel = isPredictionCompetition ? "Mis competencias" : "Mis pollas";

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
            onClick={() => router.push(listPath)}
            className="mb-4 flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-50 transition-colors"
          >
            <ArrowLeft className="size-4" />
            {listLabel}
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
                onClick={() => router.push(`/bet/matches?pool=${poolId}`)}
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
              onClick={() => router.push(`/bet/matches?pool=${poolId}`)}
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
              onClick={() => {
                setShowFullTable((p) => !p);
                setRankingsPage(1);
              }}
              className={cn(
                "rounded-lg border bg-slate-950/70 p-4 text-left transition-colors hover:border-[#22C55E]/50",
                showFullTable ? "border-[#22C55E]/50" : "border-slate-800"
              )}
            >
              <div className="text-2xl mb-2">🏆</div>
              <p className="text-sm font-medium text-slate-50">Tabla</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {showFullTable ? "Ocultar tabla completa" : "Ver todos los participantes"}
              </p>
            </button>
          </div>
        </div>

        {showFullTable && restRankings.length > 0 && (
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950 overflow-hidden">
            <div className="border-b border-slate-800 bg-slate-900/70 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-200">
                Tabla completa (del #6 al #{allRankings.length})
              </h3>
            </div>

            {rankingsLoading ? (
              <div className="flex items-center justify-center py-12 text-sm text-slate-400">
                <div className="size-5 animate-spin rounded-full border-2 border-slate-700 border-t-emerald-400 mr-3" />
                Cargando…
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px] text-sm">
                    <caption className="sr-only">Clasificación completa de participantes</caption>
                    <colgroup>
                      <col className="w-14" />
                      <col />
                      <col className="w-20" />
                      <col className="w-24" />
                      {isOwner && <col className="w-12" />}
                    </colgroup>
                    <thead className="border-b border-slate-800 bg-slate-900/50 text-left text-[0.6875rem] uppercase text-slate-500">
                      <tr>
                        <th scope="col" className="px-3 py-2 font-semibold">#</th>
                        <th scope="col" className="px-3 py-2 font-semibold">Participante</th>
                        <th scope="col" className="px-3 py-2 text-right font-semibold">Pts</th>
                        <th scope="col" className="px-3 py-2 text-right font-semibold">Exactas</th>
                        {isOwner && <th scope="col" className="px-3 py-2 text-right font-semibold sr-only">Acción</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRankings.map((entry) => (
                        <tr
                          key={entry.user_id}
                          className="border-b border-slate-800/60 transition-colors hover:bg-slate-900/50"
                        >
                          <td className="px-3 py-2.5 font-mono text-xs font-bold tabular-nums text-slate-500">
                            {entry.rank}
                          </td>
                          <td className="max-w-[200px] truncate px-3 py-2.5 font-medium text-slate-100">
                            {entry.name}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-sm font-bold tabular-nums text-slate-200">
                            {entry.points_total}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs tabular-nums text-slate-400">
                            {entry.exact_predictions}
                          </td>
                          {isOwner && (
                            <td className="px-1 py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => setPendingRemove({ userId: entry.user_id, name: entry.name })}
                                disabled={removingUserId === entry.user_id}
                                className="rounded p-1 text-red-400 transition hover:bg-red-900/30 hover:text-red-300 disabled:opacity-40"
                                aria-label={`Eliminar a ${entry.name} de la polla`}
                              >
                                {removingUserId === entry.user_id ? (
                                  <span className="inline-block size-3.5 animate-spin rounded-full border-2 border-red-400 border-t-transparent" />
                                ) : (
                                  <Trash2 size={14} aria-hidden />
                                )}
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {totalRankingPages > 1 && (
                  <div className="flex items-center justify-between border-t border-slate-800 px-4 py-3">
                    <p className="text-xs tabular-nums text-slate-500">
                      Página {currentRankingPage} de {totalRankingPages}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setRankingsPage((p) => Math.max(1, p - 1))}
                        disabled={currentRankingPage === 1}
                        className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft className="size-3.5" />
                        Anterior
                      </button>
                      <button
                        type="button"
                        onClick={() => setRankingsPage((p) => Math.min(totalRankingPages, p + 1))}
                        disabled={currentRankingPage === totalRankingPages}
                        className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Siguiente
                        <ChevronRight className="size-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="mt-6">
          <PoolRanking poolId={poolId} poolName={pool.name} maxEntries={5} isOwner={isOwner ?? undefined} />
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-600">
            Código de invitación: <span className="font-mono text-slate-400">{pool.invite_code}</span>
          </p>
        </div>
      </div>

      <RemoveMemberDialog
        open={!!pendingRemove}
        memberName={pendingRemove?.name ?? ""}
        loading={!!removingUserId}
        onConfirm={() => pendingRemove && execRemove(pendingRemove.userId)}
        onCancel={() => setPendingRemove(null)}
      />

      <ShareInviteModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        poolName={pool.name}
        inviteUrl={inviteUrl}
      />
    </div>
  );
}
