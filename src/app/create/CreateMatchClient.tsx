"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import MatchFormSteps, { type MatchFormSubmitData } from "@/components/MatchFormSteps"
import { useMatchCreation } from "@/hooks/useMatchCreation"
import { useFrecuentes } from "@/hooks/useFrecuentes"
import { BrandLogo } from "@/components/BrandLogo"
import type { MatchTemplateParticipant, MatchTemplateWithParticipants } from "@/lib/match-schema"

export default function CreateMatchClient() {
  const { loading, error, createMatch } = useMatchCreation()
  const { getTemplateById } = useFrecuentes()
  const searchParams = useSearchParams()
  const templateId = searchParams.get("template")

  const [templateData, setTemplateData] = useState<MatchTemplateWithParticipants | null>(null)
  const [templateError, setTemplateError] = useState<string | null>(null)

  useEffect(() => {
    if (!templateId) return

    getTemplateById(templateId).then((data) => {
      if (data) {
        setTemplateData(data)
      } else {
        setTemplateError("No se pudo cargar la plantilla")
      }
    })
  }, [templateId, getTemplateById])

  const loadingTemplate = !!templateId && !templateData && !templateError

  if (templateError) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-destructive">{templateError}</p>
        </div>
      </div>
    )
  }

  const submitLabel = loading ? "Creando partido…" : "Crear Partido"

  const handleMatchCreate = async (
    data: MatchFormSubmitData,
    participantsToRegister?: { name: string; is_goalkeeper: boolean }[]
  ) => {
    await createMatch(data, participantsToRegister, templateId)
  }

  const templateDefaultValues = templateData
    ? {
        location: templateData.location,
        noLocationYet: !templateData.location?.trim(),
        time: templateData.time,
        playersPerTeam: templateData.players_per_team,
        hasRentedGoalkeepers: templateData.has_rented_goalkeepers,
        rentedGoalkeepersCount: templateData.rented_goalkeepers_count,
        fieldCost: templateData.field_cost,
        rentalCost: templateData.rental_cost,
      }
    : undefined

  const templateParticipants: MatchTemplateParticipant[] = templateData?.participants ?? []

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
          {templateData && (
            <p className="text-sm text-primary mt-1">
              Usando plantilla: <strong>{templateData.name}</strong>
            </p>
          )}
        </header>

        {loadingTemplate ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando plantilla…</p>
          </div>
        ) : (
          <>
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
              templateParticipants={templateParticipants}
              defaultValues={templateDefaultValues}
            />
          </>
        )}
      </div>
    </div>
  )
}
