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
  const { formId } = useMatchFormNavigation();
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
        className="space-y-6"
        aria-label="Formulario para crear partido"
      >
        <StepLocationTime stepNumber={1} />

        <StepFormat stepNumber={2} />

        <StepCosts
          isValid={fieldCost > 0}
          disabled={disabled || isSubmitting}
          submitLabel={submitLabel}
          submitButtonType={submitButtonType}
          onSubmitButtonClick={onSubmitButtonClick}
          onClick={handleButtonClick}
          fieldCost={fieldCost}
        />
      </form>
    </div>
  );
}
