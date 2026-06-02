"use client"

import { useState } from "react"
import Link from "next/link"
import { createPortal } from "react-dom"
import { Pencil, Trash2, Check, X, Loader2, Share2, Users, UserPlus, Copy, MessageCircle, Mail, Smartphone, ExternalLink } from "lucide-react"
import { useFrecuentes } from "@/hooks/useFrecuentes"
import { getNextDateForDayOfWeek } from "@/lib/date-utils"
import { getLocalTimeInputValue } from "@/lib/date-utils"
import { formatTimeAmPm } from "@/lib/date-utils"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import type { MatchTemplate, MatchTemplateParticipant } from "@/lib/match-schema"

interface FrecuenteCardProps {
  template: MatchTemplate
}

function getLevelInfo(maxPlayers: number): { label: string; cls: string } {
  if (maxPlayers <= 6)  return { label: "Casual",   cls: "level-casual"  }
  if (maxPlayers <= 10) return { label: "Semi-Pro",  cls: "level-semipro" }
  return                       { label: "Pro",       cls: "level-pro"     }
}

export default function FrecuenteCard({ template }: FrecuenteCardProps) {
  const { updateTemplate, deleteTemplate, getTemplateById, createMatchFromTemplate } = useFrecuentes()
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(template.name)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [loadingParticipants, setLoadingParticipants] = useState(false)
  const [creatingAndSharing, setCreatingAndSharing] = useState(false)
  const [shareParticipants, setShareParticipants] = useState<MatchTemplateParticipant[]>([])
  const [shareError, setShareError] = useState<string | null>(null)
  const [shareInfo, setShareInfo] = useState<string | null>(null)
  const [createdMatchLink, setCreatedMatchLink] = useState<string | null>(null)
  const [createdWithPlayers, setCreatedWithPlayers] = useState(false)
  const [copiedShareLink, setCopiedShareLink] = useState(false)

  const handleSaveName = async () => {
    if (!editName.trim() || editName === template.name) { setEditing(false); return }
    setSaving(true)
    const ok = await updateTemplate(template.id, { name: editName.trim() })
    if (ok) setEditing(false)
    setSaving(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    try { await deleteTemplate(template.id) } finally { setDeleting(false); setConfirmDelete(false) }
  }

  const maxPlayers = template.players_per_team * 2
  const level = getLevelInfo(maxPlayers)

  const nextDate = template.match_date
    ? getNextDateForDayOfWeek(new Date(template.match_date).getDay())
    : null

  const formattedDate = nextDate
    ? new Date(`${nextDate}T12:00:00`).toLocaleDateString("es-CO", { weekday: "short", day: "2-digit", month: "short" })
    : null

  const openShareDialog = async () => {
    setShowShareDialog(true)
    setLoadingParticipants(true)
    setShareError(null)
    setShareInfo(null)
    setCreatedMatchLink(null)
    setCreatedWithPlayers(false)
    setCopiedShareLink(false)

    const fullTemplate = await getTemplateById(template.id)
    if (!fullTemplate) {
      setShareParticipants([])
      setShareError("No se pudieron cargar los jugadores guardados de esta plantilla.")
      setLoadingParticipants(false)
      return
    }

    setShareParticipants(fullTemplate.participants)
    setLoadingParticipants(false)
  }

  const createAndShare = async (withPlayers: boolean) => {
    setCreatingAndSharing(true)
    setShareError(null)
    setShareInfo(null)

    const selectedIds = withPlayers ? shareParticipants.map((p) => p.id) : []
    const dateForMatch = nextDate ?? new Date().toISOString().slice(0, 10)
    const timeForMatch = /^\d{2}:\d{2}$/.test(template.time)
      ? template.time
      : template.match_date
        ? getLocalTimeInputValue(template.match_date)
        : "20:00"

    const newMatchId = await createMatchFromTemplate(template.id, dateForMatch, timeForMatch, selectedIds)

    if (!newMatchId) {
      setCreatingAndSharing(false)
      setShareError("No se pudo crear el partido para compartir.")
      return
    }

    const shareableLink = `${window.location.origin}/match/${newMatchId}`
    setCreatedMatchLink(shareableLink)
    setCreatedWithPlayers(withPlayers)
    setShareInfo("Partido creado. Ahora compártelo desde esta ventana.")
    setCopiedShareLink(false)

    setCreatingAndSharing(false)
  }

  const shareText = createdWithPlayers
    ? "Te comparto este partido nuevo creado desde frecuente con los mismos jugadores"
    : "Te comparto este partido nuevo creado desde frecuente"

  const copyCreatedMatchLink = async () => {
    if (!createdMatchLink) return
    try {
      await navigator.clipboard.writeText(createdMatchLink)
      setCopiedShareLink(true)
      setTimeout(() => setCopiedShareLink(false), 2000)
    } catch {
      setShareError("No se pudo copiar el enlace.")
    }
  }

  const shareCreatedMatch = (method: "whatsapp" | "email" | "native") => {
    if (!createdMatchLink) return

    const fullMessage = `${shareText}: ${createdMatchLink}`

    if (method === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(fullMessage)}`, "_blank")
      return
    }

    if (method === "email") {
      window.open(
        `mailto:?subject=${encodeURIComponent("Partido de fútbol")}&body=${encodeURIComponent(fullMessage)}`,
        "_blank"
      )
      return
    }

    if (method === "native" && typeof navigator !== "undefined" && typeof navigator.share === "function") {
      navigator.share({
        title: "Partido de fútbol",
        text: shareText,
        url: createdMatchLink,
      }).catch(() => {})
    }
  }

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
        {template.time && <span>🕐 {formatTimeAmPm(template.time)}</span>}
        {formattedDate && <span>📅 {formattedDate}</span>}
      </div>

      <Link
        href={`/create?template=${template.id}`}
        className="btn-primary-fm px-4 py-2 text-sm inline-block text-center w-full rounded-lg font-semibold mb-2"
      >
        Editar y compartir
      </Link>

      <button
        type="button"
        onClick={openShareDialog}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
      >
        <Share2 className="size-4" />
        Crear y compartir
      </button>

      <button
        type="button"
        onClick={() => setConfirmDelete(true)}
        disabled={deleting}
        className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        {deleting ? "Eliminando..." : "Eliminar frecuente"}
      </button>

      {shareInfo && <p className="mt-2 text-xs text-green-400">{shareInfo}</p>}

      {showShareDialog && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onClick={(e) => { if (e.target === e.currentTarget) setShowShareDialog(false) }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`share-frecuente-title-${template.id}`}
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
          >
            <h3 id={`share-frecuente-title-${template.id}`} className="text-lg font-bold text-foreground">
              Compartir frecuente
            </h3>
            {!createdMatchLink && (
              <p className="mt-2 text-sm text-muted-foreground">
                Se creará un partido nuevo antes de compartirlo. Elige cómo crearlo:
              </p>
            )}

            {loadingParticipants ? (
              <div className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Cargando jugadores…
              </div>
            ) : !createdMatchLink ? (
              <div className="mt-4 space-y-3">
                {shareParticipants.length > 0 && (
                  <button
                    type="button"
                    disabled={creatingAndSharing}
                    onClick={() => createAndShare(true)}
                    className="w-full rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-left transition hover:bg-primary/15 disabled:opacity-60"
                  >
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Users className="size-4" />
                      Crear y compartir con jugadores
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Se inscribirán {shareParticipants.length} jugadores guardados en la plantilla.
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={creatingAndSharing}
                  onClick={() => createAndShare(false)}
                  className="w-full rounded-lg border border-border bg-muted/50 px-4 py-3 text-left transition hover:bg-muted disabled:opacity-60"
                >
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                    <UserPlus className="size-4" />
                    Crear y compartir sin jugadores
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    El partido se crea vacío para convocar desde cero.
                  </span>
                </button>

                {shareParticipants.length > 0 && (
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <p className="mb-1 text-xs font-semibold text-foreground">
                      Jugadores guardados ({shareParticipants.length})
                    </p>
                    <ul className="max-h-28 space-y-0.5 overflow-auto text-xs text-muted-foreground">
                      {shareParticipants.map((p) => (
                        <li key={p.id}>{p.is_goalkeeper ? "🥅" : "⚽"} {p.name}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                <div className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-foreground">
                  <p className="font-semibold">Partido creado exitosamente</p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={copyCreatedMatchLink}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition"
                  >
                    <Copy className="size-4" />
                    {copiedShareLink ? "Copiado" : "Copiar"}
                  </button>
                  <button
                    type="button"
                    onClick={() => shareCreatedMatch("whatsapp")}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition"
                  >
                    <MessageCircle className="size-4" />
                    WhatsApp
                  </button>
                  <button
                    type="button"
                    onClick={() => shareCreatedMatch("email")}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition"
                  >
                    <Mail className="size-4" />
                    Correo
                  </button>
                  {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
                    <button
                      type="button"
                      onClick={() => shareCreatedMatch("native")}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-muted transition"
                    >
                      <Smartphone className="size-4" />
                      Otra app
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => createdMatchLink && window.open(createdMatchLink, "_blank")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  <ExternalLink className="size-4" />
                  Abrir partido
                </button>

                <button
                  type="button"
                  onClick={() => setCreatedMatchLink(null)}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  Crear y compartir otro
                </button>
              </div>
            )}

            {creatingAndSharing && (
              <p className="mt-4 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Creando partido y preparando compartir…
              </p>
            )}
            {shareError && <p className="mt-4 text-sm text-red-400">{shareError}</p>}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShareDialog(false)}
                disabled={creatingAndSharing}
                className="rounded border border-border bg-muted py-2 px-4 text-sm font-medium text-foreground transition hover:bg-secondary disabled:opacity-60"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Eliminar plantilla"
        description={<>¿Eliminar la plantilla <strong className="text-foreground">&quot;{template.name}&quot;</strong>? Esta acción no se puede deshacer.</>}
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        destructive
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  )
}
