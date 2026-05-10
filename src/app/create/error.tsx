"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Create match error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-foreground mb-4">Error al crear el partido</h1>
        <p className="text-muted-foreground mb-6">
          Ocurrió un error inesperado. Por favor intenta de nuevo.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={reset}
            className="btn btn-primary"
          >
            Intentar de nuevo
          </button>
          <Link href="/" className="btn btn-outline">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
