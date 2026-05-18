"use client"

import { useState } from "react"
import Link from "next/link"
import { Heart, Share2, Pencil, Trash2, Check, X, Loader2 } from "lucide-react"
import { useFrecuentes } from "@/hooks/useFrecuentes"
import type { MatchTemplate } from "@/lib/match-schema"

interface FrecuenteCardProps {
  template: MatchTemplate
}

export default function FrecuenteCard({ template }: FrecuenteCardProps) {
  const { updateTemplate, deleteTemplate } = useFrecuentes()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(template.name)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSaveName = async () => {
    if (!editName.trim() || editName === template.name) {
      setEditing(false)
      return
    }
    setSaving(true)
    const ok = await updateTemplate(template.id, { name: editName.trim() })
    if (ok) setEditing(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!confirm("¿Eliminar esta plantilla?")) return

    setDeleting(true)
    try {
      await deleteTemplate(template.id)
    } finally {
      setDeleting(false)
    }
  }

  const format = `${template.players_per_team} vs ${template.players_per_team}`

  return (
    <div className="card match-card p-5 relative">
      <div className="flex items-start justify-between mb-3">
        <span className="text-red-400" aria-hidden>
          <Heart className="size-5 fill-red-400" />
        </span>
        <div className="flex items-center gap-1">
          {template.usage_count > 0 && (
            <span className="text-xs text-muted-foreground">
              Usado {template.usage_count} vez{template.usage_count !== 1 ? "es" : ""}
            </span>
          )}
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
          <button
            type="button"
            onClick={handleSaveName}
            disabled={saving}
            className="size-7 flex items-center justify-center text-green-500 hover:bg-green-500/10 rounded"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="size-7 flex items-center justify-center text-muted-foreground hover:bg-muted rounded"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <h3 className="text-base font-semibold text-card-foreground mb-1 leading-tight">
          {template.name}
        </h3>
      )}

      <p className="text-xs text-muted-foreground mb-1">📍 {template.location}</p>
      <p className="text-xs text-muted-foreground mb-3">⚽ {format}</p>

      <div className="flex flex-col gap-2">
        <Link
          href={`/create?template=${template.id}`}
          className="btn-primary-fm px-4 py-2 text-sm text-center rounded-lg font-semibold"
        >
          Usar plantilla
        </Link>

        <Link
          href={`/create?template=${template.id}`}
          className="inline-flex items-center justify-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Share2 className="size-3.5" />
          Compartir
        </Link>

        <div className="flex items-center justify-center gap-4 pt-1 border-t border-border/50">
          <button
            type="button"
            onClick={() => { setEditName(template.name); setEditing(true) }}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Pencil className="size-3" />
            Editar nombre
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded border border-red-500/40 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
            {deleting ? "Eliminando..." : "Eliminar frecuente"}
          </button>
        </div>
      </div>
    </div>
  )
}
