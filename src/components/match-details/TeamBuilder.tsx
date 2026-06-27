"use client";

import { useEffect, useRef, useState } from "react";
import { useMatchDetailsContext } from "@/contexts/MatchDetailsContext";
import { useTeamBuilder } from "@/hooks/useTeamBuilder";
import { useMatches } from "@/hooks/useMatches";
import { POSITIONS, type PositionOption } from "@/lib/positions";
import { TeamFieldImage } from "./TeamFieldImage";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { createPortal } from "react-dom";

type TeamZone = "A" | "B" | "pool";

interface TouchDropTarget {
  zone: TeamZone | null;
  playerId: string | null;
  playerZone: "A" | "B" | null;
}

interface TeamBuilderProps {
  show: boolean;
  onOpen?: () => void;
}

export function TeamBuilder({ show, onOpen }: TeamBuilderProps) {
  const { isCreator, registrationsLoading } = useMatchDetailsContext();

  if (!isCreator) return null;

  if (!show) {
    return (
      <div id="team-builder">
        <div className="rounded border border-border bg-muted p-4">
          <p className="text-sm text-muted-foreground">Inicializa el armado para distribuir titulares con drag and drop.</p>
          <button
            type="button"
            onClick={onOpen}
            disabled={registrationsLoading}
            className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 inline-flex items-center gap-2"
          >
            {registrationsLoading ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" aria-hidden="true" />
                Cargando...
              </>
            ) : (
              "Iniciar equipos"
            )}
          </button>
        </div>
      </div>
    );
  }

  return <TeamBuilderActive />;
}

function TeamBuilderActive() {
  const { registrations, matchId, refreshRegistrations } = useMatchDetailsContext();
  const { clearMatchRegistrations } = useMatches();
  const {
    teamA, teamB, unassigned, draggingId, dragOverZone, teamSaved, hasUnsavedChanges, message,
    playersPerTeamLimit, initTeamBuilder, resetTeamBuilder, randomizeTeams, saveTeams,
    startDraggingPlayer, setDragOverZoneState,
    handlePlayerDragStart, handlePlayerDragEnd, handleDropOnZone,
    assignPlayerToZone, canDropInZone, canSwapWithPlayer, handleDropOnPlayer,
  } = useTeamBuilder();

  const titulares = registrations.slice(0, playersPerTeamLimit * 2);

  useEffect(() => {
    if (teamA.length === 0 && teamB.length === 0 && unassigned.length === 0 && titulares.length > 0) {
      initTeamBuilder(titulares);
    }
  }, [titulares, teamA.length, teamB.length, unassigned.length, initTeamBuilder]);

  const getActiveDraggingId = () => draggingId;
  const { matchData } = useMatchDetailsContext();
  const [hasEverSaved, setHasEverSaved] = useState(false);
  const [showUnsavedAlert, setShowUnsavedAlert] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [showClearRegistrationsConfirm, setShowClearRegistrationsConfirm] = useState(false);
  const [clearRegistrationsLoading, setClearRegistrationsLoading] = useState(false);
  const [clearRegistrationsMessage, setClearRegistrationsMessage] = useState<string | null>(null);
  const touchDropTargetRef = useRef<TouchDropTarget>({ zone: null, playerId: null, playerZone: null });

  useEffect(() => {
    if (teamSaved) setHasEverSaved(true);
  }, [teamSaved]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (!hasUnsavedChanges) return;

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.href;
      if (!href) return;
      if (anchor.target === "_blank") return;
      if (href === window.location.href) return;

      event.preventDefault();
      setPendingHref(href);
      setShowUnsavedAlert(true);
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [hasUnsavedChanges]);

  const continueNavigation = () => {
    if (!pendingHref) return;
    window.location.href = pendingHref;
  };

  const handleSaveAndLeave = () => {
    saveTeams();
    setShowUnsavedAlert(false);
    continueNavigation();
  };

  const handleDiscardAndLeave = () => {
    setShowUnsavedAlert(false);
    continueNavigation();
  };

  const handleStay = () => {
    setShowUnsavedAlert(false);
    setPendingHref(null);
  };

  const handleClearRegistrations = async () => {
    setClearRegistrationsLoading(true);

    try {
      const { error } = await clearMatchRegistrations(matchId);

      if (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : "No se pudieron eliminar los inscritos. Intentalo nuevamente.";
        setClearRegistrationsMessage(errorMessage);
        return;
      }

      await refreshRegistrations();
      resetTeamBuilder();
      setShowClearRegistrationsConfirm(false);
      setClearRegistrationsMessage("Se eliminaron todos los jugadores inscritos correctamente.");
    } finally {
      setClearRegistrationsLoading(false);
    }
  };

  const updateTouchDropTarget = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY);
    const playerDropElement = element?.closest("[data-drop-player-id]") as HTMLElement | null;
    const zoneElement = element?.closest("[data-drop-zone]") as HTMLElement | null;

    const zoneFromPlayer = playerDropElement?.dataset.dropPlayerZone;
    const playerZone = zoneFromPlayer === "A" || zoneFromPlayer === "B" ? zoneFromPlayer : null;

    const zoneFromContainer = zoneElement?.dataset.dropZone;
    const zone: TeamZone | null =
      zoneFromContainer === "A" || zoneFromContainer === "B" || zoneFromContainer === "pool"
        ? zoneFromContainer
        : playerZone;

    const playerId = playerDropElement?.dataset.dropPlayerId ?? null;

    touchDropTargetRef.current = { zone, playerId, playerZone };
    setDragOverZoneState(zone);
  };

  const handleTouchStartPlayer = (playerId: string) => {
    startDraggingPlayer(playerId);
    touchDropTargetRef.current = { zone: null, playerId: null, playerZone: null };
  };

  const handleTouchMoveBoard = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!draggingId) return;
    const touch = event.touches[0];
    if (!touch) return;
    updateTouchDropTarget(touch.clientX, touch.clientY);
    event.preventDefault();
  };

  const handleTouchEndBoard = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!draggingId) return;

    const touch = event.changedTouches[0];
    if (touch) {
      updateTouchDropTarget(touch.clientX, touch.clientY);
    }

    const { zone, playerId, playerZone } = touchDropTargetRef.current;

    if (playerId && playerZone) {
      handleDropOnPlayer(playerZone, playerId);
    } else if (zone) {
      handleDropOnZone(zone);
    }

    touchDropTargetRef.current = { zone: null, playerId: null, playerZone: null };
    setDragOverZoneState(null);
    handlePlayerDragEnd();
  };

  return (
    <div id="team-builder" onTouchMove={handleTouchMoveBoard} onTouchEnd={handleTouchEndBoard}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-foreground">Armar equipos</h2>
        <div className="flex gap-2">
          <button type="button" onClick={randomizeTeams} className="rounded border border-indigo-500/70 bg-indigo-600/80 px-3 py-1.5 text-sm font-semibold text-foreground transition hover:bg-indigo-500">
            Distribuir aleatoriamente
          </button>
          <button
            type="button"
            disabled={teamSaved}
            onClick={saveTeams}
            className={`rounded border px-3 py-1.5 text-sm font-semibold transition ${teamSaved ? "border-green-600 bg-green-600 text-white" : "border-blue-600 bg-blue-600 text-white hover:bg-blue-700"}`}
          >
            {teamSaved ? "✓ Guardado" : "Guardar equipos"}
          </button>
          <button type="button" onClick={resetTeamBuilder} className="rounded border border-border bg-muted px-3 py-1.5 text-sm font-medium text-foreground transition hover:bg-secondary">
            Reiniciar
          </button>
        </div>
      </div>

      <div className="mb-4">
        <button
          type="button"
          onClick={() => setShowClearRegistrationsConfirm(true)}
          disabled={clearRegistrationsLoading || registrations.length === 0}
          className="rounded border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Eliminar todos los inscritos
        </button>
      </div>

      {message && (
        <p role="status" aria-live="polite" className={`mb-3 text-sm ${message.includes("correctamente") ? "text-green-400" : "text-amber-400"}`}>
          {message}
        </p>
      )}

      {clearRegistrationsMessage && (
        <p role="status" aria-live="polite" className={`mb-3 text-sm ${clearRegistrationsMessage.includes("correctamente") ? "text-green-400" : "text-red-400"}`}>
          {clearRegistrationsMessage}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <PoolZone
          unassigned={unassigned}
          draggingId={draggingId}
          dragOverZone={dragOverZone}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={() => handleDropOnZone("pool")}
          onDragStart={handlePlayerDragStart}
          onDragEnd={handlePlayerDragEnd}
          onTouchStartPlayer={handleTouchStartPlayer}
          onAssign={assignPlayerToZone}
        />

        {(["A", "B"] as const).map((team) => {
          const list = team === "A" ? teamA : teamB;
          const isOver = dragOverZone === team;
          const accentColor = team === "A" ? "text-blue-400" : "text-red-400";
          const isTeamFull = list.length >= playersPerTeamLimit;

          return (
            <TeamZoneColumn
              key={team}
              team={team}
              list={list}
              isOver={isOver}
              accentColor={accentColor}
              isTeamFull={isTeamFull}
              playersPerTeamLimit={playersPerTeamLimit}
              draggingId={draggingId}
              canDropInZone={canDropInZone}
              canSwapWithPlayer={canSwapWithPlayer}
              getActiveDraggingId={getActiveDraggingId}
              onDragStart={handlePlayerDragStart}
              onDragEnd={handlePlayerDragEnd}
              onDragOver={(e) => {
                const activeDraggingId = getActiveDraggingId();
                if (!activeDraggingId) return;
                if (canDropInZone(team)) {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  return;
                }
                e.dataTransfer.dropEffect = "none";
              }}
              onDrop={() => handleDropOnZone(team)}
              onDropOnPlayer={(targetPlayerId) => handleDropOnPlayer(team, targetPlayerId)}
              onTouchStartPlayer={handleTouchStartPlayer}
            />
          );
        })}
      </div>

      {(hasEverSaved || (teamA.length > 0 && teamB.length > 0)) && (
        <TeamFieldImage
          teamA={teamA}
          teamB={teamB}
          matchTitle={matchData?.location ?? "Parti2"}
        />
      )}

      {showUnsavedAlert && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="presentation"
          onClick={(event) => { if (event.target === event.currentTarget) handleStay() }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-teams-title"
            className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-2xl"
          >
            <h3 id="unsaved-teams-title" className="text-lg font-bold text-foreground">
              Tienes equipos sin guardar
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Aun no has guardado los cambios del armado de equipos. ¿Quieres guardar antes de salir de esta pagina?
            </p>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleStay}
                className="rounded border border-border bg-muted px-3 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDiscardAndLeave}
                className="rounded border border-red-500/30 px-3 py-2 text-sm font-medium text-red-400 transition hover:bg-red-500/10"
              >
                Omitir
              </button>
              <button
                type="button"
                onClick={handleSaveAndLeave}
                className="rounded bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
              >
                Guardar y salir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmDialog
        open={showClearRegistrationsConfirm}
        title="Eliminar inscritos"
        description="Se eliminaran todos los jugadores inscritos en este partido. Esta accion no se puede deshacer."
        confirmLabel="Si, eliminar todos"
        cancelLabel="Cancelar"
        destructive
        loading={clearRegistrationsLoading}
        onConfirm={handleClearRegistrations}
        onCancel={() => setShowClearRegistrationsConfirm(false)}
      />
    </div>
  );
}

interface PoolZoneProps {
  unassigned: ReturnType<typeof useTeamBuilder>["unassigned"];
  draggingId: string | null;
  dragOverZone: TeamZone | null;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, playerId: string) => void;
  onDragEnd: () => void;
  onTouchStartPlayer: (playerId: string) => void;
  onAssign: (playerId: string, zone: TeamZone) => void;
}

function PoolZone({ unassigned, draggingId, dragOverZone, onDragOver, onDrop, onDragStart, onDragEnd, onTouchStartPlayer, onAssign }: PoolZoneProps) {
  return (
    <div
      data-drop-zone="pool"
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`card match-card rounded-xl border-2 border-dashed p-4 ${dragOverZone === "pool" ? "border-primary/70 bg-card shadow-lg" : "border-border/70 bg-card"}`}
    >
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sin equipo ({unassigned.length})</p>
      <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
        {unassigned.map((player) => (
          <div key={player.id} className="space-y-1">
            <div
              draggable
              onDragStart={(e) => onDragStart(e, player.id)}
              onDragEnd={onDragEnd}
              onTouchStart={() => onTouchStartPlayer(player.id)}
              className={`flex cursor-grab select-none items-center gap-1.5 rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground transition active:cursor-grabbing ${draggingId === player.id ? "opacity-40" : "hover:border-primary/40"}`}
            >
              <span aria-hidden>{player.is_goalkeeper ? "🥅" : "⚽"}</span>
              <span>{player.name}</span>
              {!player.is_goalkeeper && player.position && (
                <span className="ml-auto inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                  {(() => {
                    const p = (POSITIONS as readonly PositionOption[]).find((pos) => pos.value === player.position);
                    if (p) {
                      const Icon = p.icon;
                      return <><Icon className="size-2.5" aria-hidden="true" />{p.label}</>;
                    }
                    return player.position;
                  })()}
                </span>
              )}
            </div>
            <div className="flex flex-wrap justify-end gap-1">
              <button type="button" className="rounded border border-blue-500/60 bg-blue-600/15 px-2 py-0.5 text-xs font-medium text-blue-300 hover:bg-blue-600/25" onClick={() => onAssign(player.id, "A")} aria-label={`Asignar ${player.name} al equipo A`}>
                → A
              </button>
              <button type="button" className="rounded border border-red-500/60 bg-red-600/15 px-2 py-0.5 text-xs font-medium text-red-300 hover:bg-red-600/25" onClick={() => onAssign(player.id, "B")} aria-label={`Asignar ${player.name} al equipo B`}>
                → B
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface TeamZoneColumnProps {
  team: "A" | "B";
  list: ReturnType<typeof useTeamBuilder>["teamA" | "teamB"];
  isOver: boolean;
  accentColor: string;
  isTeamFull: boolean;
  playersPerTeamLimit: number;
  draggingId: string | null;
  canDropInZone: (targetZone: TeamZone) => boolean;
  canSwapWithPlayer: (targetZone: TeamZone, targetPlayerId: string) => boolean;
  getActiveDraggingId: () => string | null;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, playerId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onDropOnPlayer: (targetPlayerId: string) => void;
  onTouchStartPlayer: (playerId: string) => void;
}

function TeamZoneColumn({ team, list, isOver, accentColor, isTeamFull, playersPerTeamLimit, draggingId, canDropInZone, canSwapWithPlayer, onDragStart, onDragEnd, onDragOver, onDrop, onDropOnPlayer, onTouchStartPlayer }: TeamZoneColumnProps) {
  const canDropHere = canDropInZone(team);

  return (
    <div
      data-drop-zone={team}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`card match-card rounded-xl border-2 border-dashed p-4 ${isOver && !isTeamFull ? "border-primary/70 bg-card shadow-lg" : isTeamFull ? "border-red-500/80 bg-red-500/10 shadow-lg" : "border-border/70 bg-card"} ${draggingId && !canDropHere ? "cursor-not-allowed" : ""}`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className={`text-sm font-bold uppercase tracking-wide ${accentColor}`}>
          Equipo {team} ({list.length}/{playersPerTeamLimit})
        </p>
        {isTeamFull && (
          <span className="rounded-full border border-red-500/70 bg-red-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-400">
            Completo
          </span>
        )}
      </div>
      <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
        {list.map((player) => (
          <div
            key={player.id}
            draggable
            onDragStart={(e) => onDragStart(e, player.id)}
            onDragEnd={onDragEnd}
            onTouchStart={() => onTouchStartPlayer(player.id)}
            onDragOver={(e) => {
              if (canSwapWithPlayer(team, player.id)) {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }
            }}
            onDrop={(e) => {
              if (canSwapWithPlayer(team, player.id)) {
                e.preventDefault();
                e.stopPropagation();
                onDropOnPlayer(player.id);
              }
            }}
            data-drop-player-id={player.id}
            data-drop-player-zone={team}
            className={`flex cursor-grab items-center gap-2 rounded-lg border px-3 py-2 text-sm text-foreground transition active:cursor-grabbing ${player.is_goalkeeper ? "border-yellow-600/50 bg-yellow-600/10 hover:border-yellow-500/60" : "border-border/70 bg-background/70 hover:border-primary/40"} ${draggingId === player.id ? "opacity-40" : ""}`}
          >
            <span>{player.is_goalkeeper ? "🥅" : "⚽"}</span>
            <span className="font-medium">{player.name}</span>
            {!player.is_goalkeeper && player.position && (
              <span className="ml-auto inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                {(() => {
                  const p = (POSITIONS as readonly PositionOption[]).find((pos) => pos.value === player.position);
                  if (p) {
                    const Icon = p.icon;
                    return <><Icon className="size-2.5" aria-hidden="true" />{p.label}</>;
                  }
                  return player.position;
                })()}
              </span>
            )}
          </div>
        ))}
        {list.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">Arrastra jugadores aquí</p>
        )}
      </div>
    </div>
  );
}