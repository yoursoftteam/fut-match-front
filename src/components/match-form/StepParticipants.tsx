"use client"

import { useMatchFormContext } from "@/contexts/MatchFormContext"
import type { MatchTemplateParticipant } from "@/lib/match-schema"

interface StepParticipantsProps {
  participants: MatchTemplateParticipant[]
}

export default function StepParticipants({ participants }: StepParticipantsProps) {
  const { selectedParticipants, toggleParticipant } = useMatchFormContext()

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Selecciona los participantes frecuentes que quieres incluir en este partido.
        </p>
      </div>

      <div className="space-y-2">
        {participants.map((p) => {
          const checked = selectedParticipants.includes(p.id)
          return (
            <label
              key={p.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                checked
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleParticipant(p.id)}
                className="rounded border-border size-4"
              />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-card-foreground">{p.name}</span>
              </div>
              {p.is_goalkeeper && (
                <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded font-medium">
                  Arquero
                </span>
              )}
            </label>
          )
        })}
      </div>

      {participants.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {selectedParticipants.length} de {participants.length} seleccionados
        </p>
      )}
    </div>
  )
}
