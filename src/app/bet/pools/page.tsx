"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Globe, Lock, Users, Plus, ArrowLeft } from "lucide-react";
import { Pool, PoolVisibility } from "@/types/bet";

interface PoolWithMemberCount extends Pool {
  member_count: number;
}

export default function PoolsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [pools, setPools] = useState<PoolWithMemberCount[]>([]);
  const [loading, setLoading] = useState(true);

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

        // Get member pools via the service role API
        const response = await fetch("/api/v1/bet/pools", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
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
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.push("/bet")}
              className="rounded-lg p-2 text-slate-400 hover:text-slate-50 transition-colors"
            >
              <ArrowLeft className="size-5" />
            </button>
            <h1 className="text-xl font-bold">Mis Pollas</h1>
          </div>
          <button
            type="button"
            onClick={() => router.push("/bet/pools/new")}
            className="flex items-center gap-1.5 rounded-lg bg-[#22C55E] px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400 transition-colors"
          >
            <Plus className="size-4" />
            Crear polla
          </button>
        </div>

        {pools.length === 0 ? (
          <div className="mt-12 text-center">
            <div className="mb-4 text-5xl">🏟️</div>
            <h2 className="text-lg font-semibold text-slate-300 mb-2">
              No tienes pollas aún
            </h2>
            <p className="text-sm text-slate-500 mb-6">
              Crea tu primera polla o únete con un código de invitación.
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
    </div>
  );
}
