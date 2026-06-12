"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
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
  interface PoolExtra {
    kickoffAt: string
    rank: number
    totalMembers: number
    predicted: boolean
  }
  const [poolExtras, setPoolExtras] = useState<Record<string, PoolExtra>>({});

  const competitionIds = useMemo(() => competitions.map((p) => p.id), [competitions]);
  const uniqueTournamentIds = useMemo(
    () => [...new Set(competitions.map((p) => p.tournament_id))],
    [competitions]
  );

  useEffect(() => {
    if (competitionIds.length === 0 || uniqueTournamentIds.length === 0) return
    let cancelled = false
    ;(async () => {
      const { data: authData } = await supabase.auth.getSession()
      const userId = authData.session?.user.id
      if (!userId) return

      const [{ data: matches }, { data: allScores }] = await Promise.all([
        supabase
          .from('bet_matches')
          .select('id, tournament_id, kickoff_at')
          .in('tournament_id', uniqueTournamentIds)
          .gte('kickoff_at', new Date().toISOString())
          .order('kickoff_at', { ascending: true }),
        supabase
          .from('bet_scores_aggregate')
          .select('pool_id, user_id, points_total')
          .in('pool_id', competitionIds)
          .eq('mode', 'pool'),
      ])
      if (cancelled) return

      const tournamentNext: Record<string, { id: string; kickoff_at: string }> = {}
      for (const row of matches ?? []) {
        if (!tournamentNext[row.tournament_id]) {
          tournamentNext[row.tournament_id] = row
        }
      }
      const nextMatchIds = Object.values(tournamentNext).map((m) => m.id)

      let predictedSet = new Set<string>()
      if (nextMatchIds.length > 0) {
        const { data: preds } = await supabase
          .from('bet_match_predictions')
          .select('match_id, pool_id')
          .in('match_id', nextMatchIds)
          .in('pool_id', competitionIds)
          .eq('user_id', userId)
          .eq('mode', 'pool')
        if (cancelled) return
        predictedSet = new Set((preds ?? []).map((p) => `${p.pool_id}:${p.match_id}`))
      }

      const poolScoresMap: Record<string, { user_id: string; points_total: number }[]> = {}
      for (const s of allScores ?? []) {
        if (!poolScoresMap[s.pool_id]) poolScoresMap[s.pool_id] = []
        poolScoresMap[s.pool_id].push(s)
      }
      const ranks: Record<string, number> = {}
      const totals: Record<string, number> = {}
      for (const [pid, scores] of Object.entries(poolScoresMap)) {
        scores.sort((a, b) => b.points_total - a.points_total)
        totals[pid] = scores.length
        const idx = scores.findIndex((s) => s.user_id === userId)
        ranks[pid] = idx >= 0 ? idx + 1 : totals[pid] + 1
      }

      const extras: Record<string, PoolExtra> = {}
      for (const comp of competitions) {
        const nextMatch = tournamentNext[comp.tournament_id]
        extras[comp.id] = {
          kickoffAt: nextMatch?.kickoff_at ?? '',
          rank: ranks[comp.id] ?? 1,
          totalMembers: totals[comp.id] ?? comp.member_count,
          predicted: nextMatch ? predictedSet.has(`${comp.id}:${nextMatch.id}`) : true,
        }
      }
      setPoolExtras(extras)
    })()
    return () => { cancelled = true }
  }, [competitionIds, uniqueTournamentIds, competitions])

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-muted">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-muted text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/bet")}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground shrink-0"
              aria-label="Volver a Parti2 Bet"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold">Mis competencias</h1>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Solo marcadores, tabla y bragging rights.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowPublicModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground"
            >
              <Compass className="size-4" />
              <span className="hidden sm:inline">Explorar</span>
            </button>
            <button
              type="button"
              onClick={() => router.push("/bet/predictions/new")}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
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
          <div className="mt-12 rounded-lg border border-border bg-card px-5 py-10 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Target className="size-6" aria-hidden="true" />
            </div>
            <h2 className="mb-2 text-lg font-semibold text-foreground">
              Aun no tienes competencias
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Creá una tabla de predicciones o explora las públicas disponibles.
            </p>
            <button
              type="button"
              onClick={() => router.push("/bet/predictions/new")}
              className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
            >
              Crear competencia
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {competitions.map((competition) => {
              const extra = poolExtras[competition.id]
              return (
                <PoolCard
                  key={competition.id}
                  pool={competition}
                  onClick={() => router.push(`/bet/predictions/${competition.id}`)}
                  nextMatchKickoffAt={extra?.kickoffAt}
                  rank={extra?.rank ?? 0}
                  totalMembers={extra?.totalMembers ?? competition.member_count}
                  predicted={extra?.predicted}
                >
                  <span className="text-xs text-emerald-500 font-medium">Abrir</span>
                </PoolCard>
              )
            })}
            {hasMore && (
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full rounded-lg border border-border py-3 text-sm font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground disabled:opacity-50"
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
