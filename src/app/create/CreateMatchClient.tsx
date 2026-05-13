"use client";

import MatchFormSteps, { type MatchFormSubmitData } from "@/components/MatchFormSteps";
import { useMatchCreation } from "@/hooks/useMatchCreation";
import { BrandLogo } from "@/components/BrandLogo";

export default function CreateMatchClient() {
  const { loading, error, createMatch } = useMatchCreation();

  const submitLabel = loading
    ? "Creando partido…"
    : "Crear Partido";

  const handleMatchCreate = async (data: MatchFormSubmitData) => {
    await createMatch(data);
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8 mt-4">
          <div className="mb-2 flex justify-center">
            <BrandLogo width={220} height={96} className="h-auto w-[160px] sm:w-[200px]" />
          </div>
          <p className="text-muted-foreground">
            Crea partidos de fútbol y comparte con tus amigos
          </p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg" role="alert">
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        <MatchFormSteps
          onMatchCreate={handleMatchCreate}
          disabled={loading}
          submitLabel={submitLabel}
          submitButtonType="submit"
        />
      </div>
    </div>
  );
}