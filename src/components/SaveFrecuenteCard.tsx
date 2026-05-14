"use client"

import { useState } from "react"
import { Heart, Loader2, Check } from "lucide-react"
import { useFrecuentes } from "@/hooks/useFrecuentes"

interface SaveFrecuenteCardProps {
  location: string
  defaultName?: string
  playersPerTeam?: number
  hasRentedGoalkeepers?: boolean
  rentedGoalkeepersCount?: number
  fieldCost?: number
  rentalCost?: number
  time?: string
  matchId?: string | null
  participants?: { name: string; is_goalkeeper: boolean }[]
  onSaved?: () => void
}

export default function SaveFrecuenteCard({
  location,
  defaultName,
  playersPerTeam = 5,
  hasRentedGoalkeepers = false,
  rentedGoalkeepersCount = 0,
  fieldCost = 0,
  rentalCost = 0,
  time = "",
  matchId,
  participants,
  onSaved,
}: SaveFrecuenteCardProps) {
  const [name, setName] = useState(defaultName || `Partido en ${location}`)
  const [saveParts, setSaveParts] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { createTemplate } = useFrecuentes()

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError(null)

    const partsToSave = saveParts && participants && participants.length > 0
      ? participants
      : undefined

    const result = await createTemplate({
      name: name.trim(),
      location,
      time,
      players_per_team: playersPerTeam,
      has_rented_goalkeepers: hasRentedGoalkeepers,
      rented_goalkeepers_count: rentedGoalkeepersCount,
      field_cost: fieldCost,
      rental_cost: rentalCost,
      save_participants: !!partsToSave,
      match_id: matchId,
      participants: partsToSave,
    })

    if (result) {
      setSaved(true)
      onSaved?.()
    } else {
      setError("No se pudo guardar la plantilla")
    }
    setSaving(false)
  }

  if (saved) {
    return (
      <div className="card p-5 text-center">
        <Check className="size-8 text-green-500 mx-auto mb-2" />
        <p className="text-card-foreground font-semibold">¡Guardado como frecuente!</p>
        <p className="text-muted-foreground text-sm mt-1">
          Lo encontrarás en &quot;Tus Frecuentes&quot; del Dashboard.
        </p>
      </div>
    )
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Heart className="size-5 text-red-400" />
        <h3 className="font-bold text-card-foreground">Guardar como frecuente</h3>
      </div>
      <p className="text-muted-foreground text-sm mb-4">
        ¿Este partido se repite? Guárdalo como plantilla para usarlo después.
      </p>

      <label htmlFor="template-name" className="sr-only">
        Nombre de la plantilla
      </label>
      <input
        id="template-name"
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Ej: Partido sabatino"
        className="w-full h-9 rounded-lg border border-border bg-card px-4 text-foreground mb-3"
      />

      {participants && participants.length > 0 && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground mb-3 cursor-pointer">
          <input
            type="checkbox"
            checked={saveParts}
            onChange={(e) => setSaveParts(e.target.checked)}
            className="rounded border-border"
          />
          Incluir {participants.length} participante{participants.length !== 1 ? "s" : ""} actuales
        </label>
      )}

      {error && <p className="text-destructive text-sm mb-2">{error}</p>}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !name.trim()}
        className="btn-primary-fm px-4 py-2 text-sm rounded-lg font-semibold w-full disabled:opacity-50"
      >
        {saving ? (
          <span className="inline-flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" /> Guardando...
          </span>
        ) : (
          "Guardar como frecuente"
        )}
      </button>
    </div>
  )
}
