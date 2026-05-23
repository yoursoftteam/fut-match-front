"use client";

import { useState, useId, useCallback } from "react";
import { Copy, Check, MessageCircle, Mail, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

interface ShareActionsProps {
  title?: string;
  copyText: string;
  copyTooltip?: string;
  copiedStatusText: string;
  whatsappText: string;
  emailSubject: string;
  emailBody: string;
  nativeShare?: ShareData;
}

export function ShareActions({
  title,
  copyText,
  copyTooltip = "Copiar enlace",
  copiedStatusText,
  whatsappText,
  emailSubject,
  emailBody,
  nativeShare,
}: ShareActionsProps) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const baseId = useId();
  const statusId = `${baseId}-copy-status`;

  const copyToClipboard = useCallback(async () => {
    if (!copyText) return;
    try {
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [copyText]);

  const shareVia = useCallback((method: string) => {
    switch (method) {
      case "whatsapp": {
        const whatsappUrl = new URL("https://api.whatsapp.com/send");
        whatsappUrl.searchParams.set("text", whatsappText);
        window.open(whatsappUrl.toString(), "_blank", "noopener,noreferrer");
        break;
      }
      case "email":
        window.open(
          `mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`,
          "_blank",
        );
        break;
      case "native":
        if (canShare && nativeShare) {
          navigator.share(nativeShare).catch(() => {});
        }
        break;
    }
  }, [canShare, emailBody, emailSubject, nativeShare, whatsappText]);

  const actions = [
    {
      id: "copy" as const,
      icon: copied ? Check : Copy,
      tooltip: copied ? "¡Copiado!" : copyTooltip,
      action: copyToClipboard,
    },
    {
      id: "whatsapp" as const,
      icon: MessageCircle,
      tooltip: "Compartir por WhatsApp",
      action: () => shareVia("whatsapp"),
    },
    {
      id: "email" as const,
      icon: Mail,
      tooltip: "Compartir por correo",
      action: () => shareVia("email"),
    },
    ...(canShare && nativeShare
      ? [{
          id: "native" as const,
          icon: Smartphone,
          tooltip: "Compartir en otra app",
          action: () => shareVia("native"),
        }]
      : []),
  ];

  return (
    <div className="w-full min-w-0">
      {title && <h3 className="mb-4 text-sm font-semibold text-foreground">{title}</h3>}

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
        {copied ? copiedStatusText : ""}
      </p>
    </div>
  );
}

export default function ShareLink({ matchId, showTitle = true }: { matchId: string; showTitle?: boolean }) {
  const shareableLink =
    typeof window !== "undefined" ? `${window.location.origin}/match/${matchId}` : "";

  return (
    <ShareActions
      title={showTitle ? "Compartir partido" : undefined}
      copyText={shareableLink}
      copiedStatusText="Enlace copiado al portapapeles"
      whatsappText={`¡Únete a este partido de fútbol! ${shareableLink}`}
      emailSubject="Partido de fútbol"
      emailBody={`Únete a este partido: ${shareableLink}`}
      nativeShare={{
        title: "Partido de fútbol",
        text: "Únete a este partido",
        url: shareableLink,
      }}
    />
  );
}
