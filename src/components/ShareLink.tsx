"use client";

import { useState, useId } from "react";
import { Copy, Check } from "lucide-react";

export default function ShareLink({ matchId }: { matchId: string }) {
  const [copied, setCopied] = useState(false);
  const shareableLink =
    typeof window !== "undefined" ? `${window.location.origin}/match/${matchId}` : "";
  const baseId = useId();
  const fieldId = `${baseId}-share-url`;
  const statusId = `${baseId}-copy-status`;

  const copyToClipboard = () => {
    if (!shareableLink) return;
    void navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-6 p-5 card">
      <h3 className="font-bold text-card-foreground mb-3">Compartir partido</h3>
      <p className="text-muted-foreground mb-4">
        Envía este enlace a tus amigos para que se registren en el partido:
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={fieldId} className="sr-only">
          Enlace del partido
        </label>
        <div className="relative flex-1">
          <input
            id={fieldId}
            type="text"
            readOnly
            value={shareableLink}
            className="w-full h-9 rounded-lg border border-border bg-card px-4 pr-10 text-foreground"
          />
          <button
            type="button"
            onClick={copyToClipboard}
            className="absolute inset-y-0 right-0 flex items-center justify-center w-9 text-muted-foreground"
            aria-label="Copiar enlace"
            aria-describedby={copied ? statusId : undefined}
          >
            {copied ? (
              <Check className="size-4 text-green-600" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
        </div>
      </div>

      <p id={statusId} role="status" aria-live="polite" className="sr-only">
        {copied ? "Enlace copiado al portapapeles" : ""}
      </p>

      
    </div>
  );
}
