"use client";

import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { PoolNamePrivacyStep } from "./PoolNamePrivacyStep";
import { ScoringMatrixEditor } from "./ScoringMatrixEditor";
import { CreatePoolReview } from "./CreatePoolReview";
import { ShareInviteModal } from "./ShareInviteModal";

const DEFAULT_CONFIG = {
  lock_minutes: 10,
  pts_winner_selection: 3,
  pts_exact_score: 2,
  pts_team_goals: 1,
  pts_goal_difference: 1,
  pts_qualified_round_2: 5,
  pts_champion: 18,
  pts_subchampion: 15,
  pts_third_place: 12,
  pts_top_scorer: 12,
  pts_top_assistant: 12,
  pts_mvp: 12,
  pts_best_goalkeeper: 12,
  pts_least_conceded: 10,
};

type Step = 1 | 2 | 3;
type CreationStatus = "idle" | "submitting" | "optimistic_success" | "confirmed" | "failed";

interface PoolCreationWizardProps {
  tournamentId: string;
}

export function PoolCreationWizard({ tournamentId }: PoolCreationWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [config, setConfig] = useState<Record<string, number>>({ ...DEFAULT_CONFIG });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [creationStatus, setCreationStatus] = useState<CreationStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [showShareModal, setShowShareModal] = useState(false);

  const handleNameChange = useCallback((newName: string) => {
    setName(newName);
    if (errors.name) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next.name;
        return next;
      });
    }
  }, [errors.name]);

  const handleVisibilityChange = useCallback((v: "public" | "private") => {
    setVisibility(v);
  }, []);

  const handleConfigChange = useCallback((key: string, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleResetDefault = useCallback(() => {
    setConfig({ ...DEFAULT_CONFIG });
  }, []);

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    const trimmed = name.trim();
    if (!trimmed) {
      newErrors.name = "Ponle un nombre a la polla.";
    } else if (trimmed.length < 3) {
      newErrors.name = "Dale un nombre más claro, mínimo 3 letras.";
    } else if (trimmed.length > 60) {
      newErrors.name = "El nombre es muy largo, máximo 60 caracteres.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const advanceStep = useCallback(() => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  }, [step, name]);

  const handleCreatePool = useCallback(async () => {
    if (!user || creationStatus === "submitting") return;

    setCreationStatus("submitting");
    setErrorMessage("");

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      if (!token) {
        throw new Error("No session available");
      }

      const response = await fetch("/api/v1/bet/pools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tournament_id: tournamentId,
          name: name.trim(),
          visibility,
          config,
        }),
      });

      const payload = await response.json();

      if (!payload.success) {
        throw new Error(payload.error?.message || "Error al crear la polla");
      }

      setCreationStatus("confirmed");
      setInviteUrl(payload.data.invite_url);
      setShowShareModal(true);
    } catch (err) {
      setCreationStatus("failed");
      setErrorMessage(
        err instanceof Error ? err.message : "No salió. Dale otra vez."
      );
    }
  }, [user, creationStatus, tournamentId, name, visibility, config]);

  return (
    <div className="min-h-dvh bg-[#0F172A] text-slate-50">
      <div className="mx-auto max-w-lg px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                  s === step
                    ? "bg-[#22C55E] text-slate-950"
                    : s < step
                    ? "bg-[#22C55E]/20 text-[#22C55E]"
                    : "bg-slate-800 text-slate-500"
                }`}
              >
                {s}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                // Use router if available, fallback to location
                window.location.href = "/bet";
              }
            }}
            className="text-sm text-slate-400 hover:text-slate-300 transition-colors"
          >
            Cancelar
          </button>
        </div>

        {step === 1 && (
          <PoolNamePrivacyStep
            name={name}
            onNameChange={handleNameChange}
            visibility={visibility}
            onVisibilityChange={handleVisibilityChange}
            errors={errors}
          />
        )}

        {step === 2 && (
          <ScoringMatrixEditor
            config={config}
            onConfigChange={handleConfigChange}
            onResetDefault={handleResetDefault}
            defaultConfig={DEFAULT_CONFIG}
          />
        )}

        {step === 3 && (
          <CreatePoolReview
            name={name}
            visibility={visibility}
            config={config}
            status={creationStatus}
            errorMessage={errorMessage}
            onCreatePool={handleCreatePool}
          />
        )}

        <div className="mt-8 flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as Step)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-[#22C55E]/50 hover:text-slate-50"
              disabled={creationStatus === "submitting"}
            >
              Atrás
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              onClick={advanceStep}
              className="flex-1 rounded-lg bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:ring-2 focus-visible:ring-[#22C55E]/70"
            >
              {step === 1 ? "Siguiente" : "Siguiente"}
            </button>
          )}
        </div>
      </div>

      <ShareInviteModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        poolName={name}
        inviteUrl={inviteUrl}
      />
    </div>
  );
}
