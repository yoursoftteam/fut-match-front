"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { usePools } from "@/hooks/usePools";
import { JoinByCodeSection, PoolCard, PublicPoolsModal } from "@/components/bet";
import { Plus, ArrowLeft, Compass } from "lucide-react";

export default function PoolsPage() {
  const router = useRouter();
  const {
    pools, loading, hasMore, loadingMore, loadMore,
    joinByCode, joinLoading, joinError, clearJoinError,
  } = usePools();
  const [showPublicModal, setShowPublicModal] = useState(false);
  interface PoolExtra {
    kickoffAt: string
    rank: number
    totalMembers: number
    predicted: boolean
  }
  const [poolExtras, setPoolExtras] = useState<Record<string, PoolExtra>>({});

  const poolIds = useMemo(() => pools.map((p) => p.id), [pools]);
  const uniqueTournamentIds = useMemo(
    () => [...new Set(pools.map((p) => p.tournament_id))],
    [pools]
  );

  useEffect(() => {
    if (poolIds.length === 0 || uniqueTournamentIds.length === 0) return
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
          .in('pool_id', poolIds)
          .eq('mode', 'pool'),
      ])
      if (cancelled) return

      // Next match per tournament
      const tournamentNext: Record<string, { id: string; kickoff_at: string }> = {}
      for (const row of matches ?? []) {
        if (!tournamentNext[row.tournament_id]) {
          tournamentNext[row.tournament_id] = row
        }
      }
      const nextMatchIds = Object.values(tournamentNext).map((m) => m.id)

      // Check predictions for next matches
      let predictedSet = new Set<string>()
      if (nextMatchIds.length > 0) {
        const { data: preds } = await supabase
          .from('bet_match_predictions')
          .select('match_id, pool_id')
          .in('match_id', nextMatchIds)
          .in('pool_id', poolIds)
          .eq('user_id', userId)
          .eq('mode', 'pool')
        if (cancelled) return
        predictedSet = new Set((preds ?? []).map((p) => `${p.pool_id}:${p.match_id}`))
      }

      // Calculate ranks per pool
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
      for (const pool of pools) {
        const nextMatch = tournamentNext[pool.tournament_id]
        extras[pool.id] = {
          kickoffAt: nextMatch?.kickoff_at ?? '',
          rank: ranks[pool.id] ?? 1,
          totalMembers: totals[pool.id] ?? pool.member_count,
          predicted: nextMatch ? predictedSet.has(`${pool.id}:${nextMatch.id}`) : true,
        }
      }
      setPoolExtras(extras)
    })()
    return () => { cancelled = true }
  }, [poolIds, uniqueTournamentIds, pools])

  if (loading) {
    return (
      <div className="min-h-dvh bg-muted flex items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-border border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-muted text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push("/bet")}
              className="rounded-lg p-2 text-muted-foreground hover:text-foreground transition-colors shrink-0"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="text-xl font-bold truncate">Mis Pollas</h1>
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
              onClick={() => router.push("/bet/pools/new")}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
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
            <h2 className="text-lg font-semibold text-foreground mb-2">
              No tienes pollas aún
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Creá tu primera polla o explora las públicas disponibles.
            </p>
            <button
              type="button"
              onClick={() => router.push("/bet/pools/new")}
              className="rounded-lg bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-emerald-400 transition-colors"
            >
              Crear mi primera polla
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {pools.map((pool) => {
              const extra = poolExtras[pool.id]
              return (
                <PoolCard
                  key={pool.id}
                  pool={pool}
                  onClick={() => router.push(`/bet/pools/${pool.id}`)}
                  nextMatchKickoffAt={extra?.kickoffAt}
                  rank={extra?.rank ?? 0}
                  totalMembers={extra?.totalMembers ?? pool.member_count}
                  predicted={extra?.predicted}
                >
                  <span className="text-xs text-muted-foreground">→</span>
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
        competitionType="pool"
      />
    </div>
  );
}
