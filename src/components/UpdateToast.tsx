"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function UpdateToast() {
  const [dismissed, setDismissed] = useState(false);

  const handleUpdate = async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    }
  };

  if (dismissed) return null;

  return (
    <div
      className={cn(
        "fixed bottom-4 right-4 z-50",
        "bg-card border border-border rounded-lg shadow-lg",
        "p-4 max-w-sm",
      )}
      role="alert"
    >
      <p className="text-sm font-medium mb-2">Nueva version disponible</p>
      <div className="flex gap-2">
        <button
          onClick={handleUpdate}
          className="px-3 py-1.5 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Actualizar
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 transition-colors"
        >
          Descartar
        </button>
      </div>
    </div>
  );
}
