"use client";

import { useCallback } from "react";
import { useMatchFormContext } from "@/contexts/MatchFormContext";
import { type MatchFormValues } from "@/lib/match-schema";

interface StepStatus {
  isActive: boolean;
  isPast: boolean;
  isFuture: boolean;
}

interface UseMatchFormNavigationReturn {
  currentStep: number;
  totalSteps: number;
  isNavigating: boolean;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  handleNext: () => Promise<void>;
  handleBack: () => void;
  getStepStatus: (step: number) => StepStatus;
  isStepActive: (step: number) => boolean;
  isStepPast: (step: number) => boolean;
}

const STEP_FIELDS: Record<number, (keyof MatchFormValues)[]> = {
  1: ["location", "date", "time"],
  2: ["playersPerTeam"],
  3: ["fieldCost"],
};

export function useMatchFormNavigation(): UseMatchFormNavigationReturn {
  const {
    currentStep,
    totalSteps,
    goToStep,
    nextStep,
    prevStep,
    isNavigating,
    setNavigating,
    trigger,
  } = useMatchFormContext();

  const handleNext = useCallback(async () => {
    setNavigating(true);

    const fieldsToValidate = STEP_FIELDS[currentStep] || [];
    const isValidStep = await trigger(fieldsToValidate);

    if (isValidStep) {
      nextStep();
    }
    setNavigating(false);
  }, [currentStep, trigger, nextStep, setNavigating]);

  const handleBack = useCallback(() => {
    prevStep();
  }, [prevStep]);

  const getStepStatus = useCallback(
    (step: number): StepStatus => ({
      isActive: currentStep === step,
      isPast: currentStep > step,
      isFuture: currentStep < step,
    }),
    [currentStep]
  );

  const isStepActive = useCallback(
    (step: number) => currentStep === step,
    [currentStep]
  );

  const isStepPast = useCallback(
    (step: number) => currentStep > step,
    [currentStep]
  );

  return {
    currentStep,
    totalSteps,
    isNavigating,
    goToStep,
    nextStep,
    prevStep,
    handleNext,
    handleBack,
    getStepStatus,
    isStepActive,
    isStepPast,
  };
}