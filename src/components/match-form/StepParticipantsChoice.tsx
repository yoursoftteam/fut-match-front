"use client"

import { Loader2 } from "lucide-react"
import type { MatchTemplateParticipant } from "@/lib/match-schema"

interface StepParticipantsChoiceProps {
  participants: MatchTemplateParticipant[]
  isSubmitting?: boolean
  onChoice: (selectedIds: string[]) => void
}

export default function StepParticipantsChoice({ participants, isSubmitting, onChoice }: StepParticipantsChoiceProps) {
  const allIds = participants.map((p) => p.id)

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h3 className="text-lg font-bold text-foreground">¿Cómo quieres crear este partido?</h3>
        {participants.length > 0 ? (
          <p className="text-sm text-muted-foreground">
            Esta plantilla tiene {participants.length} jugador{participants.length !== 1 ? "es" : ""} guardado{participants.length !== 1 ? "s" : ""}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Esta plantilla no tiene jugadores guardados
          </p>
        )}
      </div>

      <div className="grid gap-4">
        {participants.length > 0 && (
        <button
          type="button"
          onClick={() => onChoice(allIds)}
          disabled={isSubmitting}
          className="w-full rounded-xl border-2 border-primary/40 bg-primary/10 p-5 text-left transition hover:border-primary hover:bg-primary/20 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl">{isSubmitting ? <Loader2 className="mt-1 size-8 animate-spin text-primary" /> : "👥"}</span>
            <div>
              <p className="font-bold text-foreground">Con los mismos jugadores</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Se inscribirán automáticamente los {participants.length} jugadores de la plantilla
              </p>
              <ul className="mt-2 space-y-0.5">
                {participants.slice(0, 5).map((p) => (
                  <li key={p.id} className="text-xs text-muted-foreground">
                    {p.is_goalkeeper ? "🥅" : "⚽"} {p.name}
                  </li>
                ))}
                {participants.length > 5 && (
                  <li className="text-xs text-muted-foreground">…y {participants.length - 5} más</li>
                )}
              </ul>
            </div>
          </div>
        </button>
        )}

        <button
          type="button"
          onClick={() => onChoice([])}
          disabled={isSubmitting}
          className="w-full rounded-xl border-2 border-border bg-muted/50 p-5 text-left transition hover:border-muted-foreground/50 hover:bg-muted active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="flex items-start gap-4">
            <span className="text-3xl">🆕</span>
            <div>
              <p className="font-bold text-foreground">Convocar desde cero</p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                El partido se crea vacío, los jugadores se inscriben por el link de convocatoria
              </p>
            </div>
          </div>
        </button>
      </div>
    </div>
  )
}
