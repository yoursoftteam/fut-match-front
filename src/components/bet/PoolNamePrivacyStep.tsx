"use client";

import { cn } from "@/lib/utils";

interface PoolNamePrivacyStepProps {
  name: string;
  onNameChange: (name: string) => void;
  description: string;
  onDescriptionChange: (description: string) => void;
  visibility: "public" | "private";
  onVisibilityChange: (v: "public" | "private") => void;
  errors: Record<string, string>;
  copy?: {
    title?: string;
    subtitle?: string;
    nameLabel?: string;
    namePlaceholder?: string;
    descriptionLabel?: string;
    descriptionPlaceholder?: string;
    publicLabel?: string;
    privateLabel?: string;
    publicHint?: string;
    privateHint?: string;
  };
}

export function PoolNamePrivacyStep({
  name,
  onNameChange,
  description,
  onDescriptionChange,
  visibility,
  onVisibilityChange,
  errors,
  copy,
}: PoolNamePrivacyStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-50">
          {copy?.title ?? "Arma tu polla"}
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          {copy?.subtitle ?? "Ponle nombre a la reta y suelta el link al squad."}
        </p>
      </div>

      <div className="space-y-2">
        <label htmlFor="pool-name" className="text-sm font-medium text-slate-300">
          {copy?.nameLabel ?? "Nombre de la polla"}
        </label>
        <input
          id="pool-name"
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder={copy?.namePlaceholder ?? "La reta de la oficina"}
          maxLength={60}
          className={cn(
            "w-full rounded-lg border bg-slate-950/70 px-4 py-2.5 text-slate-50 placeholder:text-slate-500",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/70",
            errors.name
              ? "border-red-500/40 focus-visible:ring-red-500/70"
              : "border-slate-700"
          )}
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "pool-name-error" : undefined}
        />
        {errors.name && (
          <p id="pool-name-error" className="text-sm text-red-300" role="alert">
            {errors.name}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="pool-description" className="text-sm font-medium text-slate-300">
          {copy?.descriptionLabel ?? "Descripcion"}{" "}
          <span className="text-slate-500">(opcional)</span>
        </label>
        <textarea
          id="pool-description"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder={copy?.descriptionPlaceholder ?? "Reglas de la casa, premio, bragging rights..."}
          maxLength={1000}
          rows={3}
          className={cn(
            "w-full resize-none rounded-lg border bg-slate-950/70 px-4 py-2.5 text-slate-50 placeholder:text-slate-500",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/70",
            errors.description
              ? "border-red-500/40 focus-visible:ring-red-500/70"
              : "border-slate-700"
          )}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? "pool-description-error" : undefined}
        />
        <div className="flex items-center justify-between">
          {errors.description ? (
            <p id="pool-description-error" className="text-sm text-red-300" role="alert">
              {errors.description}
            </p>
          ) : (
            <span />
          )}
          <span className="text-xs text-slate-500">{description.length}/1000</span>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-300">Visibilidad</label>
        <div className="flex rounded-lg border border-slate-800 bg-slate-900/70 p-1" role="radiogroup">
          <button
            type="button"
            role="radio"
            aria-checked={visibility === "public"}
            onClick={() => onVisibilityChange("public")}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/70",
              visibility === "public"
                ? "bg-[#22C55E] text-slate-950"
                : "text-slate-400 hover:text-slate-300"
            )}
          >
            {copy?.publicLabel ?? "Abierta al barrio"}
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={visibility === "private"}
            onClick={() => onVisibilityChange("private")}
            className={cn(
              "flex-1 rounded-md px-4 py-2 text-sm font-medium transition-all",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]/70",
              visibility === "private"
                ? "bg-[#22C55E] text-slate-950"
                : "text-slate-400 hover:text-slate-300"
            )}
          >
            {copy?.privateLabel ?? "Solo con codigo"}
          </button>
        </div>
        <p className="text-xs text-slate-500">
          {visibility === "public"
            ? copy?.publicHint ?? "Aparece en listados publicos. Cualquiera puede unirse."
            : copy?.privateHint ?? "No aparece en exploracion. Solo con el codigo de invitacion."}
        </p>
      </div>
    </div>
  );
}
