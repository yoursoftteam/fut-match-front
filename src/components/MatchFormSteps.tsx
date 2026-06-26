"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { matchFormSchema, type MatchFormValues, type MatchFormSubmitData, type MatchTemplateParticipant } from "@/lib/match-schema"
import { getPayingPlayersCount, getTotalCost } from "@/lib/match-pricing"

import { MatchFormProvider, useMatchFormContext } from "@/contexts/MatchFormContext"
import { ProgressBar } from "@/components/ProgressBar"
import { useMatchFormNavigation } from "@/hooks/useMatchFormNavigation"

import StepLocationTime from "@/components/match-form/StepLocationTime"
import StepFormat from "@/components/match-form/StepFormat"
import StepCosts from "@/components/match-form/StepCosts"
import StepParticipantsChoice from "@/components/match-form/StepParticipantsChoice"

export type { MatchFormSubmitData, MatchFormValues }

interface MatchFormStepsProps {
  onMatchCreate: (data: MatchFormSubmitData, participantsToRegister?: { name: string; is_goalkeeper: boolean }[]) => Promise<void>
  disabled?: boolean
  submitLabel?: string
  submitButtonType?: "button" | "submit"
  onSubmitButtonClick?: () => void
  hasTemplate?: boolean
  templateParticipants?: MatchTemplateParticipant[]
  defaultValues?: Partial<MatchFormValues>
}

export default function MatchFormSteps(props: MatchFormStepsProps) {
  const hasTemplate = props.hasTemplate ?? (props.templateParticipants?.length ?? 0) > 0
  const totalSteps = hasTemplate ? 4 : 3

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchFormSchema),
    defaultValues: {
      location: "",
      noLocationYet: false,
      date: "",
      time: "",
      fieldCost: 0,
      playersPerTeam: 6,
      hasRentedGoalkeepers: false,
      rentedGoalkeepersCount: 1,
      rentalCost: 0,
      rules: "",
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
  const { currentStep, handleBack, handleNext } = useMatchFormNavigation()
  const { watch, handleSubmit } = form
  const { formId } = useMatchFormContext()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [overrideParticipantIds, setOverrideParticipantIds] = useState<string[] | null>(null)

  const fieldCost = watch("fieldCost")

  const buildAndSubmit = async (data: MatchFormValues, participantIds: string[]) => {
    setIsSubmitting(true)
    const resolvedLocation = data.noLocationYet ? "Por definir" : data.location.trim()
    const totalPlayers = data.playersPerTeam * 2
    const totalCost = getTotalCost(data.fieldCost, data.rentalCost, data.hasRentedGoalkeepers)
    const payingPlayers = getPayingPlayersCount(
      totalPlayers,
      data.hasRentedGoalkeepers,
      data.rentedGoalkeepersCount,
    )
    const costPerPlayer = totalCost > 0 && payingPlayers > 0
      ? Math.round(totalCost / payingPlayers)
      : 0

    const submitData: MatchFormSubmitData = {
      location: resolvedLocation,
      date: data.date,
      time: data.time,
      fieldCost: data.fieldCost,
      playersPerTeam: data.playersPerTeam,
      hasRentedGoalkeepers: data.hasRentedGoalkeepers,
      rentedGoalkeepersCount: data.rentedGoalkeepersCount,
      rentalCost: data.rentalCost,
      rules: data.rules,
      totalPlayers,
      costPerPlayer,
    }
    const selectedParts = hasTemplate && participantIds.length > 0
      ? templateParticipants
          .filter((p) => participantIds.includes(p.id))
          .map((p) => ({ name: p.name, is_goalkeeper: p.is_goalkeeper }))
      : undefined
    await onMatchCreate(submitData, selectedParts)
    setIsSubmitting(false)
  }

  const onSubmit = async (data: MatchFormValues) => {
    await buildAndSubmit(data, overrideParticipantIds ?? [])
  }

  const handleButtonClick = () => {
    if (onSubmitButtonClick) {
      onSubmitButtonClick()
    } else {
      handleSubmit(onSubmit)()
    }
  }

  const handleChoiceSubmit = (ids: string[]) => {
    setOverrideParticipantIds(ids)
    handleSubmit((data) => buildAndSubmit(data, ids))()
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
                  submitLabel="Continuar"
                  submitButtonType="button"
                  onClick={handleNext}
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
                  <StepParticipantsChoice
                    participants={templateParticipants}
                    isSubmitting={isSubmitting}
                    onChoice={handleChoiceSubmit}
                  />
                  <div className="flex items-center justify-start pt-2">
                    <button
                      type="button"
                      onClick={handleBack}
                      disabled={isSubmitting}
                      className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-muted transition disabled:opacity-50"
                    >
                      Atrás
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
