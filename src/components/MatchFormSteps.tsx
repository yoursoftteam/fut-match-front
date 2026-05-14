"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { matchFormSchema, type MatchFormValues, type MatchFormSubmitData, type MatchTemplateParticipant } from "@/lib/match-schema"

import { MatchFormProvider, useMatchFormContext } from "@/contexts/MatchFormContext"
import { ProgressBar } from "@/components/ProgressBar"
import { useMatchFormNavigation } from "@/hooks/useMatchFormNavigation"

import StepLocationTime from "@/components/match-form/StepLocationTime"
import StepFormat from "@/components/match-form/StepFormat"
import StepCosts from "@/components/match-form/StepCosts"
import StepParticipants from "@/components/match-form/StepParticipants"

export type { MatchFormSubmitData, MatchFormValues }

interface MatchFormStepsProps {
  onMatchCreate: (data: MatchFormSubmitData, participantsToRegister?: { name: string; is_goalkeeper: boolean }[]) => Promise<void>
  disabled?: boolean
  submitLabel?: string
  submitButtonType?: "button" | "submit"
  onSubmitButtonClick?: () => void
  templateParticipants?: MatchTemplateParticipant[]
  defaultValues?: Partial<MatchFormValues>
}

export default function MatchFormSteps(props: MatchFormStepsProps) {
  const hasTemplate = (props.templateParticipants?.length ?? 0) > 0
  const totalSteps = hasTemplate ? 4 : 3

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
      ...props.defaultValues,
    },
    mode: "onBlur",
  })

  const { control, formState, trigger, setValue } = form

  const labels = hasTemplate
    ? ["Lugar & Hora", "Formato", "Costos", "Participantes"]
    : ["Lugar & Hora", "Formato", "Costos"]

  return (
    <MatchFormProvider
      control={control}
      formState={formState}
      trigger={trigger}
      setValue={setValue}
      totalSteps={totalSteps}
      labels={labels}
    >
      <MatchFormStepsInner {...props} form={form} hasTemplate={hasTemplate} />
    </MatchFormProvider>
  )
}

interface MatchFormStepsInnerProps extends MatchFormStepsProps {
  form: ReturnType<typeof useForm<MatchFormValues>>
  hasTemplate: boolean
}

function MatchFormStepsInner({
  onMatchCreate,
  disabled = false,
  submitLabel = "Crear Partido",
  submitButtonType = "submit",
  onSubmitButtonClick,
  form,
  hasTemplate,
  templateParticipants = [],
}: MatchFormStepsInnerProps) {
  const { currentStep, totalSteps, handleBack } = useMatchFormNavigation()
  const { watch, handleSubmit } = form
  const { formId, selectedParticipants } = useMatchFormContext()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fieldCost = watch("fieldCost")
  const isLastStep = currentStep === totalSteps

  const onSubmit = async (data: MatchFormValues) => {
    setIsSubmitting(true)
    const totalPlayers = data.playersPerTeam * 2
    const totalCost = data.hasRentedGoalkeepers ? data.fieldCost + data.rentalCost : data.fieldCost
    const costPerPlayer = totalCost > 0 ? Math.round(totalCost / totalPlayers) : 0

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
    }
    const selectedParts = hasTemplate
      ? templateParticipants
          .filter((p) => selectedParticipants.includes(p.id))
          .map((p) => ({ name: p.name, is_goalkeeper: p.is_goalkeeper }))
      : undefined
    await onMatchCreate(submitData, selectedParts)
    setIsSubmitting(false)
  }

  const handleButtonClick = () => {
    if (onSubmitButtonClick) {
      onSubmitButtonClick()
    } else {
      handleSubmit(onSubmit)()
    }
  }

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
              {hasTemplate ? (
                <StepCosts
                  isValid={fieldCost > 0}
                  disabled={disabled || isSubmitting}
                  submitLabel={submitLabel}
                  submitButtonType={submitButtonType}
                  onSubmitButtonClick={onSubmitButtonClick}
                  onClick={handleButtonClick}
                  fieldCost={fieldCost}
                />
              ) : (
                <StepCosts
                  isValid={fieldCost > 0}
                  disabled={disabled || isSubmitting}
                  submitLabel={submitLabel}
                  submitButtonType={submitButtonType}
                  onSubmitButtonClick={onSubmitButtonClick}
                  onClick={handleButtonClick}
                  fieldCost={fieldCost}
                />
              )}
            </div>
            {hasTemplate && (
              <div className="w-full shrink-0" aria-hidden={currentStep !== 4}>
                <div className="space-y-6">
                  <StepParticipants participants={templateParticipants} />
                  {isLastStep && (
                    <div className="flex items-center justify-between pt-4">
                      <button
                        type="button"
                        onClick={handleBack}
                        className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition"
                      >
                        Atrás
                      </button>
                      <button
                        type={submitButtonType === "submit" ? "submit" : "button"}
                        onClick={handleButtonClick}
                        disabled={disabled || isSubmitting}
                        className="btn-primary-fm neon-glow px-8 py-3 rounded-lg font-semibold text-sm"
                      >
                        {isSubmitting ? "Creando partido..." : submitLabel}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
