"use client"

import { useState } from "react"
import { Heart, Loader2 } from "lucide-react"
import { useFrecuentes } from "@/hooks/useFrecuentes"

interface SaveFrecuenteButtonProps {
  location: string
  playersPerTeam: number
}

export default function SaveFrecuenteButton({ location, playersPerTeam }: SaveFrecuenteButtonProps) {
  const { createTemplate } = useFrecuentes()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    if (saving || saved) return
    setSaving(true)

    const result = await createTemplate({
      name: `Partido en ${location}`,
      location,
      time: "",
      players_per_team: playersPerTeam,
      has_rented_goalkeepers: false,
      rented_goalkeepers_count: 0,
      field_cost: 0,
      rental_cost: 0,
      save_participants: false,
    })

    if (result) {
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    }
    setSaving(false)
  }

  return (
    <button
      type="button"
      onClick={handleSave}
      disabled={saving}
      className="relative flex items-center justify-center rounded-lg p-1.5 transition-all duration-200 hover:bg-red-500/10 group"
      title="Guardar como frecuente"
    >
      {saving ? (
        <Loader2 className="size-5 text-red-400 animate-spin" />
      ) : (
        <Heart
          className={`size-5 transition-all duration-300 ${
            saved
              ? "scale-110 fill-red-400 text-red-400"
              : "text-muted-foreground group-hover:text-red-400 group-hover:scale-110"
          }`}
          style={{
            animation: saved ? "heartBounce 0.4s ease" : undefined,
          }}
        />
      )}
      <style>{`
        @keyframes heartBounce {
          0% { transform: scale(1); }
          30% { transform: scale(1.3); }
          60% { transform: scale(0.9); }
          100% { transform: scale(1.1); }
        }
      `}</style>
    </button>
  )
}
