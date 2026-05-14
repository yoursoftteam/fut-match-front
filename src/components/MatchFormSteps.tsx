"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { matchFormSchema, type MatchFormValues, type MatchFormSubmitData } from "@/lib/match-schema";

import { MatchFormProvider } from "@/contexts/MatchFormContext";
import { ProgressBar } from "@/components/ProgressBar";
import { useMatchFormNavigation } from "@/hooks/useMatchFormNavigation";

import StepLocationTime from "@/components/match-form/StepLocationTime";
import StepFormat from "@/components/match-form/StepFormat";
import StepCosts from "@/components/match-form/StepCosts";

export type { MatchFormSubmitData, MatchFormValues };

interface MatchFormStepsProps {
  onMatchCreate: (data: MatchFormSubmitData) => Promise<void>;
  disabled?: boolean;
  submitLabel?: string;
  submitButtonType?: "button" | "submit";
  onSubmitButtonClick?: () => void;
}

export default function MatchFormSteps(props: MatchFormStepsProps) {
  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: {
      location: "",
      date: "",
      time: "",
      fieldCost: 0,
      playersPerTeam: 6,
      hasRentedGoalkeepers: false,
      rentedGoalkeepersCount: 1,
      rentalCost: 0,
    },
    mode: "onBlur",
  });

  const { control, formState, trigger, setValue } = form;

  return (
    <MatchFormProvider
      control={control}
      formState={formState}
      trigger={trigger}
      setValue={setValue}
    >
      <MatchFormStepsInner {...props} form={form} />
    </MatchFormProvider>
  );
}

interface MatchFormStepsInnerProps extends MatchFormStepsProps {
  form: ReturnType<typeof useForm<MatchFormValues>>;
}

function MatchFormStepsInner({
  onMatchCreate,
  disabled = false,
  submitLabel = "Crear Partido",
  submitButtonType = "submit",
  onSubmitButtonClick,
  form,
}: MatchFormStepsInnerProps) {
  const { formId, currentStep } = useMatchFormNavigation();
  const { watch, handleSubmit } = form;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fieldCost = watch("fieldCost");

  const onSubmit = async (data: MatchFormValues) => {
    setIsSubmitting(true);
    const totalPlayers = data.playersPerTeam * 2;
    const totalCost = data.hasRentedGoalkeepers ? data.fieldCost + data.rentalCost : data.fieldCost;
    const costPerPlayer = totalCost > 0 ? Math.round(totalCost / totalPlayers) : 0;

    const submitData: MatchFormSubmitData = {
      location: data.location,
      date: data.date,
      time: data.time,
      fieldCost: data.fieldCost,
      playersPerTeam: data.playersPerTeam,
      hasRentedGoalkeepers: data.hasRentedGoalkeepers,
      rentedGoalkeepersCount: data.rentedGoalkeepersCount,
      rentalCost: data.rentalCost,
      totalPlayers,
      costPerPlayer,
    };
    await onMatchCreate(submitData);
    setIsSubmitting(false);
  };

  const handleButtonClick = () => {
    if (onSubmitButtonClick) {
      onSubmitButtonClick();
    } else {
      handleSubmit(onSubmit)();
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <ProgressBar />

      <form
        id={formId}
        onSubmit={handleSubmit(onSubmit)}
        aria-label="Formulario para crear partido"
      >
        <div className="relative overflow-x-hidden w-full">
          <div
            className="flex w-full transition-transform duration-300 ease-in-out"
            style={{ transform: `translateX(-${(currentStep - 1) * 100}%)` }}
          >
            <div className="w-full shrink-0" aria-hidden={currentStep !== 1}>
              <StepLocationTime stepNumber={1} />
            </div>
            <div className="w-full shrink-0" aria-hidden={currentStep !== 2}>
              <StepFormat stepNumber={2} />
            </div>
            <div className="w-full shrink-0" aria-hidden={currentStep !== 3}>
              <StepCosts
                isValid={fieldCost > 0}
                disabled={disabled || isSubmitting}
                submitLabel={submitLabel}
                submitButtonType={submitButtonType}
                onSubmitButtonClick={onSubmitButtonClick}
                onClick={handleButtonClick}
                fieldCost={fieldCost}
              />
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
