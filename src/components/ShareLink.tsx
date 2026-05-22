"use client";

import { useState, useId, useCallback } from "react";
import { Copy, Check, LinkIcon, MessageCircle, Mail, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const shareOptions = [
    { id: "whatsapp", icon: MessageCircle, label: "WhatsApp" },
    { id: "email", icon: Mail, label: "Correo" },
    ...(canShare ? [{ id: "native", icon: Smartphone, label: "Otra app" }] : []),
  ];

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <LinkIcon className="size-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Compartir</h3>
        </div>

        <div
          className="flex flex-wrap items-center gap-2"
          role="group"
          aria-label="Opciones para compartir el partido"
        >
          <Button
            variant="default"
            onClick={copyToClipboard}
            className={cn(copied && "bg-green-600 hover:bg-green-700")}
            aria-label={copied ? "Enlace copiado al portapapeles" : "Copiar enlace del partido"}
            aria-describedby={copied ? statusId : undefined}
          >
            {copied ? (
              <>
                <Check className="size-4" />
                ¡Copiado!
              </>
            ) : (
              <>
                <Copy className="size-4" />
                Copiar link
              </>
            )}
          </Button>

          {shareOptions.map(({ id, icon: Icon, label }) => (
            <Button
              key={id}
              variant="outline"
              size="icon"
              onClick={() => shareVia(id)}
              disabled={activeOption !== null}
              className={cn(
                "rounded-full",
                activeOption === id && "border-green-500 bg-green-500/10",
              )}
              aria-label={`Compartir por ${label}`}
            >
              {activeOption === id ? (
                <Check className="size-4 text-green-600" />
              ) : (
                <Icon className="size-4" />
              )}
            </Button>
          ))}
        </div>

        <p id={statusId} role="status" aria-live="polite" className="sr-only">
          {copied ? "Enlace copiado al portapapeles" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
