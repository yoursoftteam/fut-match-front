"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePools } from "@/hooks/usePools";
import { JoinByCodeSection, PoolCard, PublicPoolsModal } from "@/components/bet";
import { ArrowLeft, Plus, Target, Compass } from "lucide-react";

export default function PredictionCompetitionsPage() {
  const router = useRouter();
  const {
    pools: competitions,
    loading,
    hasMore,
    loadingMore,
    loadMore,
    joinByCode,
    joinLoading,
    joinError,
    clearJoinError,
  } = usePools({ competitionType: "predictions" });
  const [showPublicModal, setShowPublicModal] = useState(false);

  if (loading) {
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

        {/* Join by code */}
        <JoinByCodeSection
          onJoin={joinByCode}
          loading={joinLoading}
          error={joinError}
          onClearError={clearJoinError}
        />

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
              <PoolCard
                key={competition.id}
                pool={competition}
                onClick={() => router.push(`/bet/predictions/${competition.id}`)}
              >
                <span className="text-xs text-[#22C55E] font-medium">Abrir</span>
              </PoolCard>
            ))}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full rounded-lg border border-slate-700 py-3 text-sm font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-50 disabled:opacity-50"
              >
                {loadingMore ? "Cargando..." : "Cargar más"}
              </button>
            )}
          </div>
        )}
      </div>

      <PublicPoolsModal
        open={showPublicModal}
        onClose={() => setShowPublicModal(false)}
        competitionType="predictions"
      />
    </div>
  );
}
