"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { X, Globe, Users, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Pool, PoolCompetitionType } from "@/types/bet";

interface PublicPoolEntry extends Pool {
  member_count: number;
}

interface PublicPoolsModalProps {
  open: boolean;
  onClose: () => void;
  competitionType: PoolCompetitionType;
}

export function PublicPoolsModal({
  open,
  onClose,
  competitionType,
}: PublicPoolsModalProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [pools, setPools] = useState<PublicPoolEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    setLoading(true);
    setPools([]);

    const fetchPublic = async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) return;

        const res = await fetch(
          `/api/v1/bet/pools?scope=public&competition_type=${competitionType}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const payload = await res.json();
        if (payload.success) {
          setPools(payload.data.pools);
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false);
      }
    };

    fetchPublic();

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, competitionType, handleKeyDown]);

  const handleJoin = async (pool: PublicPoolEntry) => {
    setJoiningId(pool.id);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      if (token) {
        await fetch("/api/v1/bet/pools/join", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ invite_code: pool.invite_code }),
        });
      }
    } catch {
      // Proceed anyway
    }
    const basePath =
      competitionType === "predictions" ? "/bet/predictions" : "/bet/pools";
    router.push(`${basePath}/${pool.id}`);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="public-pools-title"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className={cn(
          "relative z-10 flex max-h-[85vh] w-full max-w-md flex-col rounded-t-2xl sm:rounded-2xl",
          "border border-slate-800 bg-slate-950 text-slate-50 shadow-2xl",
          "animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-90 duration-200"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 id="public-pools-title" className="text-lg font-bold">
              Explorar públicas
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {competitionType === "predictions"
                ? "Competencias de predicciones abiertas"
                : "Pollas públicas disponibles"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:text-slate-50 focus-visible:ring-2 focus-visible:ring-[#22C55E]/70"
            aria-label="Cerrar"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center gap-3 py-12">
              <div className="size-6 animate-spin rounded-full border-2 border-slate-700 border-t-[#22C55E]" />
              <p className="text-sm text-slate-400">Buscando...</p>
            </div>
          ) : pools.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-slate-800 text-slate-500">
                <Search className="size-6" />
              </div>
              <p className="text-sm text-slate-400">
                No hay {competitionType === "predictions" ? "competencias" : "pollas"} públicas disponibles
              </p>
              <p className="text-xs text-slate-600">
                Todas las públicas a las que puedes unirte aparecerán aquí.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {pools.map((pool) => (
                <button
                  key={pool.id}
                  type="button"
                  disabled={joiningId === pool.id}
                  onClick={() => handleJoin(pool)}
                  className={cn(
                    "w-full rounded-lg border border-slate-800 bg-slate-900/70 p-4 text-left transition-all",
                    "hover:border-[#22C55E]/50 hover:bg-slate-900",
                    "disabled:opacity-50"
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-semibold text-slate-50 truncate">
                        {pool.name}
                      </h3>
                      <div className="mt-1 flex items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <Globe className="size-3" />
                          Pública
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="size-3" />
                          {pool.member_count} miembro
                          {pool.member_count !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors",
                        joiningId === pool.id
                          ? "bg-slate-700 text-slate-400"
                          : "bg-[#22C55E] text-slate-950 hover:bg-emerald-400"
                      )}
                    >
                      {joiningId === pool.id ? "Entrando..." : "Unirse"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
