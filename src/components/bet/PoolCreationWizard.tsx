"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { sanitizeText } from "@/lib/sanitize";
import { PoolCompetitionType, PREDICTION_COMPETITION_CONFIG } from "@/types/bet";
import { PoolNamePrivacyStep } from "./PoolNamePrivacyStep";
import { ScoringMatrixEditor } from "./ScoringMatrixEditor";
import { PredictionScoringSummary } from "./PredictionScoringSummary";
import { CreatePoolReview } from "./CreatePoolReview";
import { ShareInviteModal } from "./ShareInviteModal";

const DEFAULT_POOL_CONFIG = {
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
  pts_mvp: 12,
};

type Step = 1 | 2 | 3;
type CreationStatus = "idle" | "submitting" | "optimistic_success" | "confirmed" | "failed";

interface PoolCreationWizardProps {
  tournamentId: string;
  competitionType?: PoolCompetitionType;
}

const PREDICTION_COPY = {
  title: "Arma tu competencia",
  subtitle: "Crea la tabla, suelta el link y que el squad meta marcadores.",
  nameLabel: "Nombre de la competencia",
  namePlaceholder: "Predicciones de la oficina",
  descriptionPlaceholder: "Premio, reglas de desempate o lo que vale el pique...",
  publicHint: "Aparece en listados publicos. Cualquiera puede unirse.",
  privateHint: "No aparece en exploracion. Solo con el codigo de invitacion.",
};

export function PoolCreationWizard({
  tournamentId,
  competitionType = "pool",
}: PoolCreationWizardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const isPredictions = competitionType === "predictions";
  const defaultConfig = isPredictions
    ? PREDICTION_COMPETITION_CONFIG
    : DEFAULT_POOL_CONFIG;
  const [step, setStep] = useState<Step>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [config, setConfig] = useState<Record<string, number>>({ ...defaultConfig });
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

  const handleConfigChange = useCallback((key: string, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleResetDefault = useCallback(() => {
    setConfig({ ...defaultConfig });
  }, [defaultConfig]);

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    const trimmed = name.trim();

    if (!trimmed) {
      newErrors.name = isPredictions
        ? "Ponle un nombre a la competencia."
        : "Ponle un nombre a la polla.";
    } else if (trimmed.length < 3) {
      newErrors.name = "Dale un nombre mas claro, minimo 3 letras.";
    } else if (trimmed.length > 60) {
      newErrors.name = "El nombre es muy largo, maximo 60 caracteres.";
    }

    if (description.length > 1000) {
      newErrors.description = "La descripcion es muy larga, maximo 1000 caracteres.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const advanceStep = () => {
    if (step === 1) {
      if (!validateStep1()) return;
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  const handleCreatePool = useCallback(async () => {
    if (!user || creationStatus === "submitting" || creationStatus === "confirmed") return;

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
          name: sanitizeText(name, 60),
          description: description ? sanitizeText(description, 1000) : undefined,
          competition_type: competitionType,
          visibility,
          config,
        }),
      });

      const payload = await response.json();

      if (!payload.success) {
        throw new Error(payload.error?.message || "Error al crear la reta");
      }

      setCreationStatus("confirmed");
      setInviteUrl(payload.data.invite_url);
      setShowShareModal(true);
    } catch (err) {
      setCreationStatus("failed");
      setErrorMessage(
        err instanceof Error ? err.message : "No salio. Dale otra vez."
      );
    }
  }, [
    user,
    creationStatus,
    tournamentId,
    name,
    description,
    visibility,
    config,
    competitionType,
  ]);

  const closePath = isPredictions ? "/bet/predictions" : "/bet/pools";

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
              router.push(closePath);
            }}
            className="text-sm text-slate-400 transition-colors hover:text-slate-300"
          >
            Cancelar
          </button>
        </div>

        {step === 1 && (
          <PoolNamePrivacyStep
            name={name}
            onNameChange={handleNameChange}
            description={description}
            onDescriptionChange={setDescription}
            visibility={visibility}
            onVisibilityChange={setVisibility}
            errors={errors}
            copy={isPredictions ? PREDICTION_COPY : undefined}
          />
        )}

        {step === 2 && (
          isPredictions ? (
            <PredictionScoringSummary />
          ) : (
            <ScoringMatrixEditor
              config={config}
              onConfigChange={handleConfigChange}
              onResetDefault={handleResetDefault}
              defaultConfig={DEFAULT_POOL_CONFIG}
            />
          )
        )}

        {step === 3 && (
          <CreatePoolReview
            name={name}
            description={description}
            visibility={visibility}
            config={config}
            status={creationStatus}
            errorMessage={errorMessage}
            competitionType={competitionType}
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
              Atras
            </button>
          )}
          {step < 3 && (
            <button
              type="button"
              onClick={advanceStep}
              className="flex-1 rounded-lg bg-[#22C55E] px-4 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-emerald-400 focus-visible:ring-2 focus-visible:ring-[#22C55E]/70"
            >
              Siguiente
            </button>
          )}
        </div>
      </div>

      <ShareInviteModal
        open={showShareModal}
        onClose={() => {
          router.push(closePath);
        }}
        poolName={name}
        inviteUrl={inviteUrl}
        competitionLabel={isPredictions ? "competencia" : "polla"}
      />
    </div>
  );
}
