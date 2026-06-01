"use client";

import { useEffect, useRef, useState, startTransition } from "react";

const CONFIRM_PHRASE = "Eliminar participante";

interface RemoveMemberDialogProps {
  open: boolean;
  memberName: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RemoveMemberDialog({
  open,
  memberName,
  loading,
  onConfirm,
  onCancel,
}: RemoveMemberDialogProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      startTransition(() => setValue(""));
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onCancel]);

  if (!open) return null;

  const isExact = value === CONFIRM_PHRASE;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-label="Confirmar eliminación de participante"
    >
      <div
        className="w-full max-w-sm rounded-lg border border-slate-800 bg-slate-950 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-slate-50">
            Eliminar participante
          </h2>
          <p className="mt-1.5 text-sm text-slate-400 leading-relaxed">
            Vas a eliminar a <span className="font-medium text-slate-200">{memberName}</span> de la polla. Esta acción no se puede deshacer.
          </p>
        </div>

        <div className="px-5 pb-3">
          <label htmlFor="confirm-remove-input" className="block text-xs text-slate-500 mb-1.5">
            Escribe <span className="font-mono text-slate-400 bg-slate-900 px-1 rounded">{CONFIRM_PHRASE}</span> para confirmar
          </label>
          <input
            ref={inputRef}
            id="confirm-remove-input"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-50 placeholder-slate-600 outline-none transition-colors focus:border-red-500/50 focus:ring-1 focus:ring-red-500/20"
            placeholder="Escribe para confirmar..."
          />
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-800 px-5 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-slate-50 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isExact || loading}
            className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="inline-block size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Eliminando…
              </span>
            ) : (
              "Eliminar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
