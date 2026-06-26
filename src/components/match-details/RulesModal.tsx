"use client";

import { useEffect, useRef } from "react";
import { XIcon, CheckCircleIcon } from "lucide-react";
import RichTextRenderer from "@/components/rich-editor/RichTextRenderer";

interface RulesModalProps {
  open: boolean;
  rulesHtml: string;
  onClose: () => void;
  successMessage?: string;
}

export default function RulesModal({
  open,
  rulesHtml,
  onClose,
  successMessage = "¡Registrado exitosamente!",
}: RulesModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open]);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    const handler = () => onClose();
    el.addEventListener("close", handler);
    return () => el.removeEventListener("close", handler);
  }, [onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      className="fixed inset-0 z-50 m-auto max-h-[85vh] w-[90vw] max-w-lg rounded-2xl border border-border bg-card p-0 shadow-2xl backdrop:bg-black/60 open:flex open:flex-col"
      onClick={(e) => { if (e.target === dialogRef.current) onClose(); }}
    >
      {/* Success banner */}
      <div className="flex items-center gap-3 bg-green-600/15 px-6 py-5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-green-600/25">
          <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-300">{successMessage}</p>
          <p className="text-xs text-green-400/70 mt-0.5">Revisa las reglas del partido antes de comenzar</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-md p-1.5 text-green-400/70 hover:bg-green-600/20 hover:text-green-300"
          aria-label="Cerrar"
        >
          <XIcon className="h-5 w-5" />
        </button>
      </div>

      {/* Rules content */}
      <div className="overflow-y-auto px-6 py-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Reglas del partido
        </h3>
        <div className="text-sm leading-relaxed text-foreground">
          <RichTextRenderer html={rulesHtml} />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center border-t border-border px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-green-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          Cerrar
        </button>
      </div>
    </dialog>
  );
}
