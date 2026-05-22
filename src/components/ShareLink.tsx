"use client";

import { useState, useId, useCallback } from "react";
import { Copy, Check, Share2, LinkIcon, ChevronDown, MessageCircle, Mail, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function ShareLink({ matchId }: { matchId: string }) {
  const [copied, setCopied] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
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

  return (
    <Card>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <LinkIcon className="size-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Compartir partido</h3>
        </div>

        <div className="flex items-stretch gap-2">
          <div className="flex-1 flex items-center rounded-lg border border-border bg-muted/50 px-3 py-2.5 min-h-10 min-w-0">
            <span className="text-sm text-muted-foreground truncate font-mono">
              {shareableLink}
            </span>
          </div>
          <button
            type="button"
            onClick={copyToClipboard}
            className="shrink-0 inline-flex items-center justify-center size-10 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
            aria-label={copied ? "Enlace copiado" : "Copiar enlace"}
          >
            {copied ? (
              <Check className="size-4 text-green-600" />
            ) : (
              <Copy className="size-4 text-muted-foreground" />
            )}
          </button>
        </div>

        <div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowOptions((prev) => !prev)}
          >
            <Share2 className="size-4" />
            Compartir vía...
            <ChevronDown
              className={cn(
                "size-4 ml-auto transition-transform duration-200",
                showOptions && "rotate-180",
              )}
            />
          </Button>

          <div
            className={cn(
              "grid transition-all duration-200 ease-in-out",
              showOptions
                ? "grid-rows-[1fr] opacity-100 mt-2"
                : "grid-rows-[0fr] opacity-0",
            )}
          >
            <div className="overflow-hidden">
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { id: "whatsapp", icon: MessageCircle, label: "WhatsApp" },
                  { id: "email", icon: Mail, label: "Correo" },
                  { id: "native", icon: Smartphone, label: "Otra app" },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => shareVia(id)}
                    disabled={activeOption !== null}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 transition-all duration-150 cursor-pointer",
                      "hover:bg-muted hover:border-muted-foreground/30",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      activeOption === id && "border-green-500 bg-green-500/10",
                    )}
                  >
                    {activeOption === id ? (
                      <Check className="size-5 text-green-600" />
                    ) : (
                      <Icon className="size-5 text-muted-foreground" />
                    )}
                    <span className="text-xs text-muted-foreground">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <p id={statusId} role="status" aria-live="polite" className="sr-only">
          {copied ? "Enlace copiado al portapapeles" : ""}
        </p>
      </CardContent>
    </Card>
  );
}
