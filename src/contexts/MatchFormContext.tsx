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
  isNavigating: boolean;
  setNavigating: (value: boolean) => void;
  selectedParticipants: string[];
  toggleParticipant: (id: string) => void;
  setAllParticipants: (ids: string[]) => void;
  clearParticipants: () => void;
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
  const [isNavigating, setIsNavigating] = useState(false);
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const formId = useId();

  const goToStep = (step: number) => {
    setCurrentStep(Math.max(1, Math.min(step, totalSteps)));
  };

  const nextStep = () => goToStep(currentStep + 1);
  const prevStep = () => goToStep(currentStep - 1);

  const toggleParticipant = (id: string) => {
    setSelectedParticipants((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    );
  };

  const setAllParticipants = (ids: string[]) => setSelectedParticipants(ids);
  const clearParticipants = () => setSelectedParticipants([]);

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
      isNavigating,
      setNavigating: setIsNavigating,
      selectedParticipants,
      toggleParticipant,
      setAllParticipants,
      clearParticipants,
    }}>
      {children}
    </MatchFormContext>
  );
}

export { useMatchFormContext };
