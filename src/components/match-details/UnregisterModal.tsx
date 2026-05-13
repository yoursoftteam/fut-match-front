"use client";

import { Trash2 } from "lucide-react";
import { useMatchUnregister } from "@/hooks/useMatchRegistration";

export function UnregisterModal() {
  const { showModal, target, loading, closeModal, handleUnregister } = useMatchUnregister();

  if (!showModal || !target) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overscroll-contain"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="unregister-dialog-title"
        className="max-h-[90dvh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-lg border border-border bg-card p-6"
      >
        <div className="mb-4 flex items-center gap-3">
          <div className="rounded-full bg-red-900/30 p-2">
            <Trash2 className="text-red-400" size={24} aria-hidden />
          </div>
          <h3 id="unregister-dialog-title" className="text-xl font-bold text-foreground">Confirmar baja</h3>
        </div>
        <p className="mb-6 text-muted-foreground">
          ¿Estás seguro de que deseas darte de baja de este partido?
          <br />
          <span className="mt-2 block font-semibold text-foreground">{target.name}</span>
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={closeModal}
            className="flex-1 rounded border border-border bg-muted py-2 px-4 font-medium text-foreground transition hover:bg-secondary"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleUnregister}
            className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded bg-green-500 py-3 px-4 text-base font-semibold text-white transition hover:bg-green-600"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-b-2 border-white" />
                <span>Dando de baja…</span>
              </>
            ) : (
              <>
                <Trash2 size={18} className="shrink-0" aria-hidden />
                <span>Confirmar baja</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}