"use client"

import { useState } from "react"
import Link from "next/link"
import { Pencil, Trash2, Check, X, Loader2 } from "lucide-react"
import { useFrecuentes } from "@/hooks/useFrecuentes"
import { getNextDateForDayOfWeek } from "@/lib/date-utils"
import type { MatchTemplate } from "@/lib/match-schema"

interface FrecuenteCardProps {
  template: MatchTemplate
}

function getLevelInfo(maxPlayers: number): { label: string; cls: string } {
  if (maxPlayers <= 6)  return { label: "Casual",   cls: "level-casual"  }
  if (maxPlayers <= 10) return { label: "Semi-Pro",  cls: "level-semipro" }
  return                       { label: "Pro",       cls: "level-pro"     }
}

export default function FrecuenteCard({ template }: FrecuenteCardProps) {
  const { updateTemplate, deleteTemplate } = useFrecuentes()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(template.name)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSaveName = async () => {
    if (!editName.trim() || editName === template.name) { setEditing(false); return }
    setSaving(true)
    const ok = await updateTemplate(template.id, { name: editName.trim() })
    if (ok) setEditing(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm("¿Eliminar esta plantilla?")) return
    setDeleting(true)
    try { await deleteTemplate(template.id) } finally { setDeleting(false) }
  }

  const maxPlayers = template.players_per_team * 2
  const level = getLevelInfo(maxPlayers)

  const nextDate = template.match_date
    ? getNextDateForDayOfWeek(new Date(template.match_date).getDay())
    : null

  const formattedDate = nextDate
    ? new Date(`${nextDate}T12:00:00`).toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short" })
    : null

  return (
    <div className="card match-card p-5 relative">
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl shrink-0" aria-hidden>⚽</span>
        <div className="flex items-center gap-1.5">
          <span className={`level-badge ${level.cls}`}>{level.label}</span>
          {template.usage_count > 0 && (
            <span className="level-badge bg-muted text-muted-foreground">×{template.usage_count}</span>
          )}
          <button
            type="button"
            onClick={() => { setEditName(template.name); setEditing(true) }}
            aria-label="Editar nombre"
            className="rounded-lg p-1.5 transition-colors hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <Pencil className="size-4" />
          </button>
        </div>
      </div>

      {editing ? (
        <div className="flex items-center gap-1 mb-2">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            className="flex-1 h-8 rounded border border-border bg-card px-2 text-sm text-foreground"
            autoFocus
          />
          <button type="button" onClick={handleSaveName} disabled={saving}
            className="size-7 flex items-center justify-center text-green-500 hover:bg-green-500/10 rounded">
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          </button>
          <button type="button" onClick={() => setEditing(false)}
            className="size-7 flex items-center justify-center text-muted-foreground hover:bg-muted rounded">
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <h3 className="text-base font-semibold text-card-foreground mb-1 leading-tight">{template.name}</h3>
      )}

      <p className="text-xs text-muted-foreground mb-3">📍 {template.location || "Por definir"}</p>

      <div className="flex items-center justify-between text-xs text-muted-foreground mb-4">
        <span>👥 {maxPlayers} jugadores</span>
        {template.time && <span>🕐 {template.time}</span>}
        {formattedDate && <span>📅 {formattedDate}</span>}
      </div>

      <Link
        href={`/create?template=${template.id}`}
        className="btn-primary-fm px-4 py-2 text-sm inline-block text-center w-full rounded-lg font-semibold mb-2"
      >
        Usar plantilla
      </Link>

      <button
        type="button"
        onClick={handleDelete}
        disabled={deleting}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        {deleting ? "Eliminando..." : "Eliminar frecuente"}
      </button>
    </div>
  )
}
