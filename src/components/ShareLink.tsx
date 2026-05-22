"use client";

import { useState, useId, useCallback } from "react";
import { Copy, Check, MessageCircle, Mail, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export default function ShareLink({ matchId, showTitle = true }: { matchId: string; showTitle?: boolean }) {
  const [copied, setCopied] = useState(false);
  const shareableLink =
    typeof window !== "undefined" ? `${window.location.origin}/match/${matchId}` : "";
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const baseId = useId();
  const statusId = `${baseId}-copy-status`;

  const copyToClipboard = useCallback(async () => {
    if (!shareableLink) return;
    try {
      await navigator.clipboard.writeText(shareableLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  }, [shareableLink]);

  const shareVia = useCallback((method: string) => {
    switch (method) {
      case "whatsapp":
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`¡Únete a este partido de fútbol! ${shareableLink}`)}`,
          "_blank",
        );
        break;
      case "email":
        window.open(
          `mailto:?subject=${encodeURIComponent("Partido de fútbol")}&body=${encodeURIComponent(`Únete a este partido: ${shareableLink}`)}`,
          "_blank",
        );
        break;
      case "native":
        if (canShare) {
          navigator.share({
            title: "Partido de fútbol",
            text: "Únete a este partido",
            url: shareableLink,
          }).catch(() => {});
        }
        break;
    }
  }, [shareableLink, canShare]);

  const actions = [
    { id: "copy" as const, icon: copied ? Check : Copy, label: "Copiar link", tooltip: copied ? "¡Copiado!" : "Copiar enlace", action: copyToClipboard },
    { id: "whatsapp" as const, icon: MessageCircle, label: "WhatsApp", tooltip: "Compartir por WhatsApp", action: () => shareVia("whatsapp") },
    { id: "email" as const, icon: Mail, label: "Correo", tooltip: "Compartir por correo", action: () => shareVia("email") },
    ...(canShare
      ? [{ id: "native" as const, icon: Smartphone, label: "Otra app", tooltip: "Compartir en otra app", action: () => shareVia("native") }]
      : []),
  ];

  return (
    <div className="w-full min-w-0">
      {showTitle && <h3 className="mb-4 text-sm font-semibold text-foreground">Compartir partido</h3>}

      <div className="grid grid-cols-4 gap-2 w-full">
        {actions.map(({ id, icon: Icon, tooltip, action }) => (
          <Tooltip key={id}>
            <TooltipTrigger
              render={
                <button
                  type="button"
                  onClick={action}
                  aria-label={tooltip}
                  className={cn(
                    "w-full flex cursor-pointer items-center justify-center rounded-lg border border-border bg-muted/30 py-2.5 transition-colors hover:bg-muted hover:text-foreground",
                    copied && id === "copy" && "border-green-600 text-green-600",
                  )}
                />
              }
            >
              <Icon className={cn("size-4", copied && id === "copy" && "text-green-600")} />
            </TooltipTrigger>
            <TooltipContent side="bottom">{tooltip}</TooltipContent>
          </Tooltip>
        ))}
      </div>

      <p id={statusId} role="status" aria-live="polite" className="sr-only">
        {copied ? "Enlace copiado al portapapeles" : ""}
      </p>
    </div>
  );
}
