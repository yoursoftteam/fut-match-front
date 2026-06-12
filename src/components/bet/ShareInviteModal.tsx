"use client";

import { useEffect, useRef, useCallback } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ShareInviteActions } from "./ShareInviteActions";

interface ShareInviteModalProps {
  open: boolean;
  onClose: () => void;
  poolName: string;
  inviteUrl: string;
  loading?: boolean;
  competitionLabel?: "polla" | "competencia";
}

export function ShareInviteModal({
  open,
  onClose,
  poolName,
  inviteUrl,
  loading = false,
  competitionLabel = "polla",
}: ShareInviteModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const initialFocusRef = useRef<HTMLButtonElement>(null);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
      if (e.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      initialFocusRef.current?.focus();
    }, 50);
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-invite-title"
    >
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        className={cn(
          "relative z-10 w-full max-w-md rounded-t-2xl sm:rounded-2xl",
          "border border-border bg-card text-foreground shadow-2xl",
          "animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 sm:zoom-in-90 duration-200"
        )}
      >
        <button
          ref={initialFocusRef}
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-[#22C55E]/70"
          aria-label="Cerrar"
        >
          <X className="size-5" />
        </button>

        <div className="mb-5 pr-8">
          <h2 id="share-invite-title" className="text-lg font-bold text-foreground">
            Link ready. Suelta la bomba.
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Comparte la {competitionLabel} y que el squad meta sus marcadores.
          </p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <div className="size-6 animate-spin rounded-full border-2 border-border border-t-[#22C55E]" />
            <p className="text-sm text-muted-foreground">Link en camino...</p>
          </div>
        ) : (
          <ShareInviteActions
            poolName={poolName}
            inviteUrl={inviteUrl}
            competitionLabel={competitionLabel}
          />
        )}
      </div>
    </div>
  );
}
