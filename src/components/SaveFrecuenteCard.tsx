"use client"

import { useState } from "react"
import { Heart, Loader2, Check } from "lucide-react"
import { useFrecuentes } from "@/hooks/useFrecuentes"
import { getMatchTitleFromLocation } from "@/lib/match-title"
import { supabase } from "@/lib/supabase"

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
  matchDate?: string | null
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
  matchDate,
  participants: participantsProp,
  onSaved,
}: SaveFrecuenteCardProps) {
  const [name, setName] = useState(defaultName || getMatchTitleFromLocation(location))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedCount, setSavedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const { createTemplate } = useFrecuentes()

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError(null)

    // Fetch fresh registrations from DB to avoid stale prop issues
    let freshParticipants: { name: string; is_goalkeeper: boolean }[] = participantsProp ?? []
    if (matchId) {
      const { data, error: fetchErr } = await supabase
        .from("match_registrations")
        .select("name, is_goalkeeper")
        .eq("match_id", matchId)
      if (data && data.length > 0) {
        freshParticipants = data
      }
    }

    const result = await createTemplate({
      name: name.trim(),
      location,
      time,
      players_per_team: playersPerTeam,
      has_rented_goalkeepers: hasRentedGoalkeepers,
      rented_goalkeepers_count: rentedGoalkeepersCount,
      field_cost: fieldCost,
      rental_cost: rentalCost,
      save_participants: freshParticipants.length > 0,
      match_id: matchId,
      match_date: matchDate,
      participants: freshParticipants.length > 0 ? freshParticipants : undefined,
    })

    if (result) {
      setSavedCount(freshParticipants.length)
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
          {savedCount > 0 && (
            <span className="block mt-1 text-xs text-green-400">
              Se guardaron {savedCount} jugadores.
            </span>
          )}
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
        {matchId && (
          <span className="block mt-1 text-xs text-green-400">
            ✓ Se incluirán los jugadores inscritos
          </span>
        )}
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
