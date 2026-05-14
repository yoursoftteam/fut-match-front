"use client";

import { useEffect } from "react";
import { useMatchDetailsContext } from "@/contexts/MatchDetailsContext";
import { useTeamBuilder } from "@/hooks/useTeamBuilder";

type TeamZone = "A" | "B" | "pool";

interface TeamBuilderProps {
  show: boolean;
  onOpen?: () => void;
}

export function TeamBuilder({ show, onOpen }: TeamBuilderProps) {
  const { isCreator } = useMatchDetailsContext();

  if (!isCreator) return null;

  if (!show) {
    return (
      <div id="team-builder">
        <div className="rounded border border-border bg-muted p-4">
          <p className="text-sm text-muted-foreground">Inicializa el armado para distribuir titulares con drag and drop.</p>
          <button
            type="button"
            onClick={onOpen}
            className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Iniciar equipos
          </button>
        </div>
      </div>
    );
  }

  return <TeamBuilderActive />;
}

function TeamBuilderActive() {
  const { registrations } = useMatchDetailsContext();
  const {
    teamA, teamB, unassigned, draggingId, dragOverZone, teamSaved, message,
    playersPerTeamLimit, initTeamBuilder, resetTeamBuilder, randomizeTeams, saveTeams,
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

  return (
    <div id="team-builder">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold text-foreground">Armar equipos</h2>
        <div className="flex gap-2">
          <button type="button" onClick={randomizeTeams} className="rounded border border-indigo-500/70 bg-indigo-600/80 px-3 py-1.5 text-sm font-semibold text-foreground transition hover:bg-indigo-500">
            Distribuir aleatoriamente
          </button>
          <button
            type="button"
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

      {message && (
        <p role="status" aria-live="polite" className={`mb-3 text-sm ${message.includes("correctamente") ? "text-green-400" : "text-amber-400"}`}>
          {message}
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
            />
          );
        })}
      </div>
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
  onAssign: (playerId: string, zone: TeamZone) => void;
}

function PoolZone({ unassigned, draggingId, dragOverZone, onDragOver, onDrop, onDragStart, onDragEnd, onAssign }: PoolZoneProps) {
  return (
    <div
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
              className={`flex cursor-grab select-none items-center gap-1.5 rounded-lg border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground transition active:cursor-grabbing ${draggingId === player.id ? "opacity-40" : "hover:border-primary/40"}`}
            >
              <span aria-hidden>{player.is_goalkeeper ? "🥅" : "⚽"}</span>
              <span>{player.name}</span>
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
}

function TeamZoneColumn({ team, list, isOver, accentColor, isTeamFull, playersPerTeamLimit, draggingId, canDropInZone, canSwapWithPlayer, onDragStart, onDragEnd, onDragOver, onDrop, onDropOnPlayer }: TeamZoneColumnProps) {
  const canDropHere = canDropInZone(team);

  return (
    <div
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
            className={`flex cursor-grab items-center gap-2 rounded-lg border px-3 py-2 text-sm text-foreground transition active:cursor-grabbing ${player.is_goalkeeper ? "border-yellow-600/50 bg-yellow-600/10 hover:border-yellow-500/60" : "border-border/70 bg-background/70 hover:border-primary/40"} ${draggingId === player.id ? "opacity-40" : ""}`}
          >
            <span>{player.is_goalkeeper ? "🥅" : "⚽"}</span>
            <span className="font-medium">{player.name}</span>
          </div>
        ))}
        {list.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">Arrastra jugadores aquí</p>
        )}
      </div>
    </div>
  );
}