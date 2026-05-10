import { createContext, useContext, useId, useState } from "react";
import { type Control, type FormState, type UseFormTrigger, type UseFormSetValue } from "react-hook-form";
import { type MatchFormValues } from "@/lib/match-schema";

interface MatchFormContextValue {
  currentStep: number;
  totalSteps: number;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  labels: string[];
  formId: string;
  control: Control<MatchFormValues>;
  formState: FormState<MatchFormValues>;
  trigger: UseFormTrigger<MatchFormValues>;
  setValue: UseFormSetValue<MatchFormValues>;
}

const MatchFormContext = createContext<MatchFormContextValue | null>(null);

function useMatchFormContext() {
  const ctx = useContext(MatchFormContext);
  if (!ctx) {
    throw new Error("useMatchFormContext must be used within MatchFormProvider");
  }
  return ctx;
}

interface MatchFormProviderProps {
  children: React.ReactNode;
  totalSteps?: number;
  labels?: string[];
  control: Control<MatchFormValues>;
  formState: FormState<MatchFormValues>;
  trigger: UseFormTrigger<MatchFormValues>;
  setValue: UseFormSetValue<MatchFormValues>;
}

export function MatchFormProvider({
  children,
  totalSteps = 3,
  labels = ["Lugar & Hora", "Formato", "Costos"],
  control,
  formState,
  trigger,
  setValue,
}: MatchFormProviderProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const formId = useId();

  const goToStep = (step: number) => {
    setCurrentStep(Math.max(1, Math.min(step, totalSteps)));
  };

  const nextStep = () => goToStep(currentStep + 1);
  const prevStep = () => goToStep(currentStep - 1);

  return (
    <MatchFormContext value={{
      currentStep,
      totalSteps,
      goToStep,
      nextStep,
      prevStep,
      labels,
      formId,
      control,
      formState,
      trigger,
      setValue,
    }}>
      {children}
    </MatchFormContext>
  );
}

export { useMatchFormContext };
