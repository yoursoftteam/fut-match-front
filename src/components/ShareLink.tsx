"use client";

import { useState, useId } from "react";
import { Copy, Check, Share2, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function ShareLink({ matchId }: { matchId: string }) {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const shareableLink =
    typeof window !== "undefined" ? `${window.location.origin}/match/${matchId}` : "";
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const baseId = useId();
  const statusId = `${baseId}-copy-status`;

  const copyToClipboard = async () => {
    if (!shareableLink) return;
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
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
    } catch { /* user cancelled */ }
  };

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <LinkIcon className="size-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Compartir partido</h3>
        </div>

        <div className="flex items-stretch gap-2">
          <div className="flex-1 flex items-center rounded-lg border border-border bg-muted/50 px-3 py-2.5 min-h-10">
            <span className="text-sm text-muted-foreground truncate font-mono">
              {shareableLink}
            </span>
          </div>
          <button
            type="button"
            onClick={copyToClipboard}
            className="shrink-0 inline-flex items-center justify-center size-10 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            aria-label={copied ? "Enlace copiado" : "Copiar enlace"}
            aria-describedby={copied ? statusId : undefined}
          >
            {copied ? (
              <Check className="size-4 text-green-600" />
            ) : (
              <Copy className="size-4 text-muted-foreground" />
            )}
          </button>
        </div>

        <p className="text-xs text-muted-foreground">
          Los jugadores podrán inscribirse como titulares o suplentes
        </p>

        {canShare && (
          <Button
            variant="outline"
            className="w-full"
            onClick={shareLink}
          >
            <Share2 className="size-4" />
            {shared ? "¡Compartido!" : "Compartir vía..."}
          </Button>
        )}

        <p id={statusId} role="status" aria-live="polite" className="sr-only">
          {copied ? "Enlace copiado al portapapeles" : shared ? "Enlace compartido" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
