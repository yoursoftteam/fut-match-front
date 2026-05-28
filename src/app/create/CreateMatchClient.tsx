"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import MatchFormSteps, { type MatchFormSubmitData } from "@/components/MatchFormSteps"
import { useMatchCreation } from "@/hooks/useMatchCreation"
import { useFrecuentes } from "@/hooks/useFrecuentes"
import { BrandLogo } from "@/components/BrandLogo"
import { getNextDateForDayOfWeek } from "@/lib/date-utils"
import type { MatchTemplateParticipant, MatchTemplateWithParticipants } from "@/lib/match-schema"
import { Zap, LayoutTemplate } from "lucide-react"

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
          <p className="text-destructive text-sm">{templateError}</p>
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
        date: templateData.match_date
          ? getNextDateForDayOfWeek(new Date(templateData.match_date).getDay())
          : "",
      }
    : undefined

  const templateParticipants: MatchTemplateParticipant[] =
    templateData?.participants ?? []

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, color-mix(in oklch, var(--primary) 8%, transparent), transparent)",
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-8 sm:py-10">
        {/* Header */}
        <header className="text-center mb-10 mt-2">
          <div className="mb-4 flex justify-center">
            <BrandLogo
              width={220}
              height={96}
              className="h-auto w-[130px] sm:w-[160px]"
            />
          </div>

          {templateData ? (
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-3">
              <LayoutTemplate className="w-3.5 h-3.5" />
              Plantilla: {templateData.name}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-3">
              <Zap className="w-3.5 h-3.5" />
              Nuevo Partido
            </div>
          )}

          <h1 className="text-2xl sm:text-3xl font-heading font-bold text-foreground mb-2">
            {templateData ? "Crear desde plantilla" : "Arma tu partido"}
          </h1>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            {templateData
              ? "Los datos de tu plantilla ya están cargados. Ajusta lo que necesites."
              : "Define lugar, hora, formato y costos. Listo en 2 minutos."}
          </p>
        </header>

        {/* Error global */}
        {error && (
          <div
            className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl"
            role="alert"
          >
            <p className="text-destructive text-sm">{error}</p>
          </div>
        )}

        {loadingTemplate ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-r-transparent mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">Cargando plantilla…</p>
          </div>
        ) : (
          <MatchFormSteps
            onMatchCreate={handleMatchCreate}
            disabled={loading}
            submitLabel={submitLabel}
            submitButtonType="submit"
            hasTemplate={!!templateId}
            templateParticipants={templateParticipants}
            defaultValues={templateDefaultValues}
          />
        )}

        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-center text-xs leading-relaxed text-muted-foreground">
          Al crear el partido aceptas nuestros{" "}
          <Link
            href="/terms"
            className="font-semibold text-foreground underline decoration-primary/40 underline-offset-2 hover:text-primary"
          >
            Terminos y Condiciones
          </Link>{" "}
          y la{" "}
          <Link
            href="/privacy"
            className="font-semibold text-foreground underline decoration-primary/40 underline-offset-2 hover:text-primary"
          >
            Politica de Privacidad
          </Link>
          .
        </div>
      </div>
    </div>
  )
}
