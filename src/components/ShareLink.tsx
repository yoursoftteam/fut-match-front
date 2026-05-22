"use client";

import { useState, useId } from "react";
import { Copy, Check, Share2 } from "lucide-react";
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
        <div>
          <h3 className="font-semibold text-foreground">Compartir partido</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Envía este enlace para que se registren
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1 whitespace-nowrap"
            onClick={copyToClipboard}
            aria-label="Copiar enlace"
            aria-describedby={copied ? statusId : undefined}
          >
            {copied ? <Check className="size-4 text-green-600" /> : <Copy className="size-4" />}
            {copied ? "¡Copiado!" : "Copiar link"}
          </Button>

          {canShare && (
            <Button
              variant="outline"
              className="flex-1 whitespace-nowrap"
              onClick={shareLink}
              aria-label="Compartir enlace"
            >
              {shared ? <Check className="size-4 text-green-600" /> : <Share2 className="size-4" />}
              {shared ? "¡Compartido!" : "Compartir"}
            </Button>
          )}
        </div>

        <p id={statusId} role="status" aria-live="polite" className="sr-only">
          {copied ? "Enlace copiado al portapapeles" : shared ? "Enlace compartido" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
