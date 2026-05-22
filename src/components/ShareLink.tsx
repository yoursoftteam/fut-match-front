"use client";

import { useState, useId, useCallback } from "react";
import { Copy, Check, LinkIcon, MessageCircle, Mail, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function ShareLink({ matchId }: { matchId: string }) {
  const [copied, setCopied] = useState(false);
  const [activeOption, setActiveOption] = useState<string | null>(null);
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

  const shareVia = useCallback(async (method: string) => {
    switch (method) {
      case "whatsapp":
        setActiveOption("whatsapp");
        setTimeout(() => setActiveOption(null), 2000);
        window.open(
          `https://wa.me/?text=${encodeURIComponent(`¡Únete a este partido de fútbol! ${shareableLink}`)}`,
          "_blank",
        );
        break;
      case "email":
        setActiveOption("email");
        setTimeout(() => setActiveOption(null), 2000);
        window.open(
          `mailto:?subject=${encodeURIComponent("Partido de fútbol")}&body=${encodeURIComponent(`Únete a este partido: ${shareableLink}`)}`,
          "_blank",
        );
        break;
      case "native":
        if (canShare) {
          try {
            setActiveOption("native");
            await navigator.share({
              title: "Partido de fútbol",
              text: "Únete a este partido",
              url: shareableLink,
            });
          } catch { /* user cancelled */ }
          setActiveOption(null);
        }
        break;
    }
  }, [shareableLink, canShare]);

  const actions: {
    id: string;
    icon: typeof Copy;
    label: string;
    successLabel?: string;
    action: () => void;
    isActive: boolean;
  }[] = [
    {
      id: "copy",
      icon: copied ? Check : Copy,
      label: "Copiar link",
      successLabel: "¡Copiado!",
      action: copyToClipboard,
      isActive: copied,
    },
    {
      id: "whatsapp",
      icon: MessageCircle,
      label: "WhatsApp",
      action: () => shareVia("whatsapp"),
      isActive: activeOption === "whatsapp",
    },
    {
      id: "email",
      icon: Mail,
      label: "Correo",
      action: () => shareVia("email"),
      isActive: activeOption === "email",
    },
    ...(canShare
      ? [
          {
            id: "native" as const,
            icon: Smartphone,
            label: "Otra app",
            action: () => shareVia("native"),
            isActive: activeOption === "native",
          },
        ]
      : []),
  ];

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <LinkIcon className="size-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Compartir</h3>
        </div>

        <div
          className="inline-flex items-center rounded-lg border border-border bg-muted/30 p-0.5"
          role="group"
          aria-label="Opciones para compartir el partido"
        >
          {actions.map(({ id, icon: Icon, label, successLabel, action, isActive }) => (
            <Tooltip key={id}>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={action}
                    disabled={id !== "copy" && activeOption !== null && !isActive}
                    aria-label={isActive && successLabel ? successLabel : label}
                    className={cn(isActive && "text-green-600")}
                  />
                }
              >
                <Icon className={cn("size-4", isActive && "text-green-600")} />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                {isActive && successLabel ? successLabel : label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>

        <p id={statusId} role="status" aria-live="polite" className="sr-only">
          {copied ? "Enlace copiado al portapapeles" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
