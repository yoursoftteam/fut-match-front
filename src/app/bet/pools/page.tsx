"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePools } from "@/hooks/usePools";
import { JoinByCodeSection, PoolCard, PublicPoolsModal } from "@/components/bet";
import { Plus, ArrowLeft, Compass } from "lucide-react";

export default function PoolsPage() {
  const router = useRouter();
  const { pools, loading, joinByCode, joinLoading, joinError, clearJoinError } = usePools();
  const [showPublicModal, setShowPublicModal] = useState(false);

  if (loading) {
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

        {/* Join by code */}
        <JoinByCodeSection
          onJoin={joinByCode}
          loading={joinLoading}
          error={joinError}
          onClearError={clearJoinError}
        />

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
              <PoolCard
                key={pool.id}
                pool={pool}
                onClick={() => router.push(`/bet/pools/${pool.id}`)}
              >
                <span className="text-xs text-slate-500">→</span>
              </PoolCard>
            ))}
          </div>
        )}
      </div>

      <PublicPoolsModal
        open={showPublicModal}
        onClose={() => setShowPublicModal(false)}
        competitionType="pool"
      />
    </div>
  );
}
