"use client";

import { useState, useId } from "react";
import { Copy, Check, Share2 } from "lucide-react";

export default function ShareLink({ matchId }: { matchId: string }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const shareableLink =
    typeof window !== "undefined" ? `${window.location.origin}/match/${matchId}` : "";
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const baseId = useId();
  const statusId = `${baseId}-copy-status`;

  const copyToClipboard = () => {
    if (!shareableLink) return;
    void navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (!shareableLink || !canShare) return;

    try {
      await navigator.share({
        title: "Partido de fútbol",
        text: "Únete a este partido",
        url: shareableLink,
      });
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch {
      // User may cancel the share sheet; keep silent and let copy remain available.
    }
  };

  return (
    <div className="mt-6 p-5 card">
      <h3 className="font-bold text-card-foreground mb-3">Compartir partido</h3>
      <p className="text-muted-foreground mb-4">
        Envía este enlace a tus amigos para que se registren en el partido:
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={copyToClipboard}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
          aria-label="Copiar enlace"
          aria-describedby={copied ? statusId : undefined}
        >
          {copied ? (
            <Check className="size-4 text-green-600" />
          ) : (
            <Copy className="size-4" />
          )}
          <span>{copied ? "Copiado" : "Copiar link"}</span>
        </button>

        <button
          type="button"
          onClick={shareLink}
          disabled={!canShare}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Compartir enlace"
        >
          <Share2 className="size-4" />
          <span>{shared ? "Compartido" : "Compartir"}</span>
        </button>
      </div>

      <p id={statusId} role="status" aria-live="polite" className="sr-only">
        {copied ? "Enlace copiado al portapapeles" : shared ? "Enlace compartido" : ""}
      </p>

      
    </div>
  );
}
