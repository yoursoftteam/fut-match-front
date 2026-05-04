"use client";

import { useState, useId } from "react";
import { Button } from "@/components/ui/button";

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
      <h3 className="font-bold text-card-foreground mb-3">Compartir encuentro</h3>
      <p className="text-muted-foreground mb-4">
        Envía este enlace a tus amigos para que se registren en el encuentro:
      </p>

      <div className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor={fieldId} className="sr-only">
          Enlace del encuentro
        </label>
        <input
          id={fieldId}
          type="text"
          readOnly
          value={shareableLink}
          className="min-w-0 flex-1 rounded-l-lg rounded-r-lg border border-border bg-card px-4 py-3 text-foreground sm:rounded-r-none"
        />
        <Button
          type="button"
          variant="primary"
          onClick={copyToClipboard}
          className={`rounded-l-lg rounded-r-lg sm:rounded-l-none sm:rounded-r-lg px-5 py-3 ${
            copied ? "bg-green-600 hover:bg-green-600" : ""
          }`}
          aria-describedby={copied ? statusId : undefined}
        >
          {copied ? "¡Copiado!" : "Copiar"}
        </Button>
      </div>

      <p id={statusId} role="status" aria-live="polite" className="sr-only">
        {copied ? "Enlace copiado al portapapeles" : ""}
      </p>

      <div className="mt-4 text-sm text-muted-foreground">
        <p>Los usuarios necesitan tener una cuenta en la plataforma para registrarse.</p>
      </div>
    </div>
  );
}
