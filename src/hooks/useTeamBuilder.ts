"use client";

import { useState, useCallback, useRef } from "react";
import { useMatchDetailsContext, type PlayerRegistration } from "@/contexts/MatchDetailsContext";

type TeamZone = "A" | "B" | "pool";

interface ZonePlayer {
  player: PlayerRegistration;
  sourceZone: TeamZone;
}

function findPlayerInZones(playerId: string, teamA: PlayerRegistration[], teamB: PlayerRegistration[], pool: PlayerRegistration[]): ZonePlayer | null {
  const zones: [TeamZone, PlayerRegistration[]][] = [["A", teamA], ["B", teamB], ["pool", pool]];
  for (const [zone, list] of zones) {
    const found = list.find((p) => p.id === playerId);
    if (found) return { player: found, sourceZone: zone };
  }
  return null;
}

function removePlayerFromZone(zone: TeamZone, playerId: string, teamA: PlayerRegistration[], teamB: PlayerRegistration[], pool: PlayerRegistration[]): [PlayerRegistration[], PlayerRegistration[], PlayerRegistration[]] {
  const withoutPlayer = (list: PlayerRegistration[]) => list.filter((p) => p.id !== playerId);
  let newA = teamA, newB = teamB, newPool = pool;
  if (zone === "A") newA = withoutPlayer(teamA);
  else if (zone === "B") newB = withoutPlayer(teamB);
  else newPool = withoutPlayer(pool);
  return [newA, newB, newPool];
}

function addPlayerToZone(zone: TeamZone, player: PlayerRegistration, teamA: PlayerRegistration[], teamB: PlayerRegistration[], pool: PlayerRegistration[]): [PlayerRegistration[], PlayerRegistration[], PlayerRegistration[]] {
  let newA = teamA, newB = teamB, newPool = pool;
  if (zone === "A") newA = [...teamA, player];
  else if (zone === "B") newB = [...teamB, player];
  else newPool = [...pool, player];
  return [newA, newB, newPool];
}

function movePlayer(fromZone: TeamZone, toZone: TeamZone, playerId: string, teamA: PlayerRegistration[], teamB: PlayerRegistration[], pool: PlayerRegistration[]): [PlayerRegistration[], PlayerRegistration[], PlayerRegistration[]] {
  const found = findPlayerInZones(playerId, teamA, teamB, pool);
  if (!found || found.sourceZone === toZone) return [teamA, teamB, pool];

  let [newA, newB, newPool] = removePlayerFromZone(found.sourceZone, playerId, teamA, teamB, pool);
  [newA, newB, newPool] = addPlayerToZone(toZone, found.player, newA, newB, newPool);
  return [newA, newB, newPool];
}

interface UseTeamBuilderReturn {
  teamA: PlayerRegistration[];
  teamB: PlayerRegistration[];
  unassigned: PlayerRegistration[];
  draggingId: string | null;
  dragOverZone: TeamZone | null;
  teamSaved: boolean;
  message: string | null;
  playersPerTeamLimit: number;
  initTeamBuilder: (players: PlayerRegistration[]) => void;
  resetTeamBuilder: () => void;
  randomizeTeams: () => void;
  saveTeams: () => void;
  handlePlayerDragStart: (event: React.DragEvent<HTMLDivElement>, playerId: string) => void;
  handlePlayerDragEnd: () => void;
  handleDropOnZone: (targetZone: TeamZone) => void;
  assignPlayerToZone: (playerId: string, targetZone: TeamZone) => void;
  canDropInZone: (targetZone: TeamZone) => boolean;
  canSwapWithPlayer: (targetZone: TeamZone, targetPlayerId: string) => boolean;
  handleDropOnPlayer: (targetZone: TeamZone, targetPlayerId: string) => void;
  getSourceZoneByPlayerId: (playerId: string) => TeamZone | null;
}

export function useTeamBuilder(): UseTeamBuilderReturn {
  const { matchId, matchData, registrations } = useMatchDetailsContext();

  const [teamA, setTeamA] = useState<PlayerRegistration[]>([]);
  const [teamB, setTeamB] = useState<PlayerRegistration[]>([]);
  const [unassigned, setUnassigned] = useState<PlayerRegistration[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<TeamZone | null>(null);
  const [teamSaved, setTeamSaved] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const playersPerTeamLimit = matchData ? Math.ceil(matchData.max_players / 2) : 0;

  const getActiveDraggingId = useCallback(() => draggingIdRef.current ?? draggingId, [draggingId]);

  const loadSavedTeams = useCallback((players: PlayerRegistration[]) => {
    try {
      const saved = localStorage.getItem(`teams-${matchId}`);
      if (!saved) return false;

      const { teamA: savedTeamA, teamB: savedTeamB, unassigned: savedUnassigned } = JSON.parse(saved) as {
        teamA: PlayerRegistration[];
        teamB: PlayerRegistration[];
        unassigned: PlayerRegistration[];
      };

      const savedIds = new Set([...savedTeamA, ...savedTeamB, ...savedUnassigned].map((p) => p.id));
      const currentIds = new Set(players.map((p) => p.id));
      const isSameRoster = savedIds.size === currentIds.size && [...currentIds].every((id) => savedIds.has(id));

      if (!isSameRoster) return false;

      const limit = Math.ceil((matchData?.max_players ?? 0) / 2);
      if (limit > 0 && (savedTeamA.length > limit || savedTeamB.length > limit)) return false;

      setTeamA(savedTeamA);
      setTeamB(savedTeamB);
      setUnassigned(savedUnassigned);
      setDraggingId(null);
      setDragOverZone(null);
      setMessage(null);
      return true;
    } catch {
      return false;
    }
  }, [matchId, matchData]);

  const initTeamBuilder = useCallback((players: PlayerRegistration[]) => {
    if (loadSavedTeams(players)) return;

    const goalkeepers = players.filter((p) => p.is_goalkeeper);
    const fieldPlayers = players.filter((p) => !p.is_goalkeeper);
    setTeamA(goalkeepers[0] ? [goalkeepers[0]] : []);
    setTeamB(goalkeepers[1] ? [goalkeepers[1]] : []);
    setUnassigned(fieldPlayers);
    setDraggingId(null);
    setDragOverZone(null);
    setMessage(null);
  }, [loadSavedTeams]);

  const resetTeamBuilder = useCallback(() => {
    try { localStorage.removeItem(`teams-${matchId}`); } catch { /* ignore */ }
    setTeamSaved(false);
    setMessage(null);
    const titulares = registrations.slice(0, matchData?.max_players ?? 0);
    const goalkeepers = titulares.filter((p) => p.is_goalkeeper);
    const fieldPlayers = titulares.filter((p) => !p.is_goalkeeper);
    setTeamA(goalkeepers[0] ? [goalkeepers[0]] : []);
    setTeamB(goalkeepers[1] ? [goalkeepers[1]] : []);
    setUnassigned(fieldPlayers);
    setDraggingId(null);
    setDragOverZone(null);
  }, [matchId, matchData?.max_players, registrations]);

  const shuffle = useCallback((arr: PlayerRegistration[]) => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, []);

  const randomizeTeams = useCallback(() => {
    if (playersPerTeamLimit <= 0) {
      setMessage("No se pudo calcular el límite de jugadores por equipo.");
      return;
    }

    const currentPlayers = [...teamA, ...teamB, ...unassigned];
    if (currentPlayers.length === 0) {
      setMessage("No hay jugadores para distribuir.");
      return;
    }

    const shuffled = shuffle(currentPlayers);
    const goalkeepers = shuffled.filter((p) => p.is_goalkeeper);
    const fieldPlayers = shuffled.filter((p) => !p.is_goalkeeper);

    const nextTeamA: PlayerRegistration[] = [];
    const nextTeamB: PlayerRegistration[] = [];

    if (goalkeepers[0]) nextTeamA.push(goalkeepers[0]);
    if (goalkeepers[1]) nextTeamB.push(goalkeepers[1]);

    const remainingPlayers = shuffle([...goalkeepers.slice(2), ...fieldPlayers]);

    remainingPlayers.forEach((player) => {
      const canAddToA = nextTeamA.length < playersPerTeamLimit;
      const canAddToB = nextTeamB.length < playersPerTeamLimit;

      if (canAddToA && canAddToB) {
        (nextTeamA.length === nextTeamB.length ? (Math.random() < 0.5 ? nextTeamA : nextTeamB) : nextTeamA.length < nextTeamB.length ? nextTeamA : nextTeamB).push(player);
        return;
      }
      if (canAddToA) { nextTeamA.push(player); return; }
      if (canAddToB) { nextTeamB.push(player); }
    });

    const assignedIds = new Set([...nextTeamA, ...nextTeamB].map((p) => p.id));
    const nextUnassigned = shuffled.filter((p) => !assignedIds.has(p.id));

    setTeamA(nextTeamA);
    setTeamB(nextTeamB);
    setUnassigned(nextUnassigned);
    setDraggingId(null);
    draggingIdRef.current = null;
    setDragOverZone(null);
    setMessage("Jugadores distribuidos aleatoriamente.");
  }, [playersPerTeamLimit, teamA, teamB, unassigned, shuffle]);

  const saveTeams = useCallback(() => {
    try {
      localStorage.setItem(`teams-${matchId}`, JSON.stringify({ teamA, teamB, unassigned }));
      setTeamSaved(true);
      setMessage("Equipos guardados correctamente.");
      setTimeout(() => setTeamSaved(false), 2500);
      setTimeout(() => setMessage(null), 2500);
    } catch {
      setMessage("No se pudieron guardar los equipos.");
    }
  }, [matchId, teamA, teamB, unassigned]);

  const handlePlayerDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, playerId: string) => {
    draggingIdRef.current = playerId;
    setDraggingId(playerId);
    event.dataTransfer.setData("text/plain", playerId);
    event.dataTransfer.effectAllowed = "move";
  }, []);

  const handlePlayerDragEnd = useCallback(() => {
    draggingIdRef.current = null;
    setDraggingId(null);
    setDragOverZone(null);
  }, []);

  const getSourceZoneByPlayerId = useCallback((playerId: string): TeamZone | null => {
    if (teamA.some((p) => p.id === playerId)) return "A";
    if (teamB.some((p) => p.id === playerId)) return "B";
    if (unassigned.some((p) => p.id === playerId)) return "pool";
    return null;
  }, [teamA, teamB, unassigned]);

  const canDropInZone = useCallback((targetZone: TeamZone): boolean => {
    const activeDraggingId = getActiveDraggingId();
    if (!activeDraggingId) return false;
    const sourceZone = getSourceZoneByPlayerId(activeDraggingId);
    if (!sourceZone || sourceZone === targetZone) return false;
    if (targetZone === "A") return teamA.length < playersPerTeamLimit;
    if (targetZone === "B") return teamB.length < playersPerTeamLimit;
    return true;
  }, [getActiveDraggingId, getSourceZoneByPlayerId, teamA.length, teamB.length, playersPerTeamLimit]);

  const canSwapWithPlayer = useCallback((targetZone: TeamZone, targetPlayerId: string): boolean => {
    const activeDraggingId = getActiveDraggingId();
    if (!activeDraggingId || (targetZone !== "A" && targetZone !== "B")) return false;
    const sourceZone = getSourceZoneByPlayerId(activeDraggingId);
    if (!sourceZone || sourceZone === "pool" || sourceZone === targetZone) return false;
    const targetList = targetZone === "A" ? teamA : teamB;
    const sourceList = sourceZone === "A" ? teamA : teamB;
    if (targetList.length < playersPerTeamLimit || sourceList.length < playersPerTeamLimit) return false;
    return targetList.some((p) => p.id === targetPlayerId);
  }, [getActiveDraggingId, getSourceZoneByPlayerId, teamA, teamB, playersPerTeamLimit]);

  const handleDropOnZone = useCallback((targetZone: TeamZone) => {
    const activeDraggingId = getActiveDraggingId();
    if (!activeDraggingId) return;
    setDragOverZone(null);

    const found = findPlayerInZones(activeDraggingId, teamA, teamB, unassigned);
    if (!found || found.sourceZone === targetZone) return;

    const limit = Math.ceil((matchData?.max_players ?? 0) / 2);
    if (targetZone === "A" && teamA.length >= limit) { setMessage(`El equipo A ya está completo (${limit}).`); return; }
    if (targetZone === "B" && teamB.length >= limit) { setMessage(`El equipo B ya está completo (${limit}).`); return; }

    setMessage(null);
    const [newA, newB, newPool] = movePlayer(found.sourceZone, targetZone, activeDraggingId, teamA, teamB, unassigned);
    setTeamA(newA);
    setTeamB(newB);
    setUnassigned(newPool);
    draggingIdRef.current = null;
    setDraggingId(null);
  }, [getActiveDraggingId, teamA, teamB, unassigned, matchData?.max_players]);

  const assignPlayerToZone = useCallback((playerId: string, targetZone: TeamZone) => {
    if (!matchData) return;

    const found = findPlayerInZones(playerId, teamA, teamB, unassigned);
    if (!found || found.sourceZone === targetZone) return;

    const limit = Math.ceil(matchData.max_players / 2);
    if (targetZone === "A" && teamA.length >= limit) { setMessage(`El equipo A ya está completo (${limit}).`); return; }
    if (targetZone === "B" && teamB.length >= limit) { setMessage(`El equipo B ya está completo (${limit}).`); return; }

    setMessage(null);
    const [newA, newB, newPool] = movePlayer(found.sourceZone, targetZone, playerId, teamA, teamB, unassigned);
    setTeamA(newA);
    setTeamB(newB);
    setUnassigned(newPool);
  }, [matchData, teamA, teamB, unassigned]);

  const handleDropOnPlayer = useCallback((targetZone: TeamZone, targetPlayerId: string) => {
    const activeDraggingId = getActiveDraggingId();
    if (!activeDraggingId || !canSwapWithPlayer(targetZone, targetPlayerId)) return;

    const sourceZone = getSourceZoneByPlayerId(activeDraggingId);
    if (!sourceZone || sourceZone === "pool" || sourceZone === targetZone) return;

    const sourceList = sourceZone === "A" ? [...teamA] : [...teamB];
    const targetList = targetZone === "A" ? [...teamA] : [...teamB];

    const sourceIndex = sourceList.findIndex((p) => p.id === activeDraggingId);
    const targetIndex = targetList.findIndex((p) => p.id === targetPlayerId);

    if (sourceIndex < 0 || targetIndex < 0) return;

    const sourcePlayer = sourceList[sourceIndex];
    const targetPlayer = targetList[targetIndex];

    sourceList[sourceIndex] = targetPlayer;
    targetList[targetIndex] = sourcePlayer;

    if (sourceZone === "A") { setTeamA(sourceList); setTeamB(targetList); }
    else { setTeamB(sourceList); setTeamA(targetList); }

    draggingIdRef.current = null;
    setDraggingId(null);
    setDragOverZone(null);
    setMessage(`Intercambio realizado entre Equipo ${sourceZone} y Equipo ${targetZone}.`);
  }, [getActiveDraggingId, canSwapWithPlayer, getSourceZoneByPlayerId, teamA, teamB]);

  return {
    teamA, teamB, unassigned, draggingId, dragOverZone, teamSaved, message, playersPerTeamLimit,
    initTeamBuilder, resetTeamBuilder, randomizeTeams, saveTeams,
    handlePlayerDragStart, handlePlayerDragEnd, handleDropOnZone,
    assignPlayerToZone, canDropInZone, canSwapWithPlayer, handleDropOnPlayer,
    getSourceZoneByPlayerId,
  };
}