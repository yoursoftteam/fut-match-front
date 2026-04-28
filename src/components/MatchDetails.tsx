"use client";

import { useEffect, useRef, useState } from "react";
import { useMatches } from "@/hooks/useMatches";
import { useMatchRegistrationsRealtime } from "@/hooks/useMatchRegistrationsRealtime";
import { useAuth } from "@/hooks/useAuth";
import { formatCurrency } from "@/lib/currency";
import { Trash2 } from "lucide-react";

interface MatchData {
  id: string;
  title: string;
  location: string;
  date: string;
  max_players: number;
  created_by: string;
  created_at: string;
  time?: string;
}

interface PlayerRegistration {
  id: string;
  name: string;
  is_goalkeeper: boolean;
  registered_at: string;
}

interface StoredMatchPricing {
  id: string;
  fieldCost: number;
  costPerPlayer: number;
  playersPerTeam: number;
  hasRentedGoalkeepers?: boolean;
  rentedGoalkeepersCount?: number;
  rentalCost?: number;
}

interface MatchEditFormData {
  location: string;
  date: string;
  time: string;
  playersPerTeam: number;
  fieldCost: number;
  hasRentedGoalkeepers: boolean;
  rentedGoalkeepersCount: number;
  rentalCost: number;
}

const PLAYER_OPTIONS = [6, 7, 8, 9, 10, 11] as const;
const MAX_SUBSTITUTE_SLOTS = 5;

type TeamZone = "A" | "B" | "pool";
type PanelTab = "register" | "players" | "teams";

function clampPlayersPerTeam(value: number): number {
  if (value < PLAYER_OPTIONS[0]) {
    return PLAYER_OPTIONS[0];
  }

  if (value > PLAYER_OPTIONS[PLAYER_OPTIONS.length - 1]) {
    return PLAYER_OPTIONS[PLAYER_OPTIONS.length - 1];
  }

  return value;
}

export default function MatchDetails({ matchId }: { matchId: string }) {
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRegistrationForm, setShowRegistrationForm] = useState(false);
  const [registrationForm, setRegistrationForm] = useState({
    name: "",
    isGoalkeeper: false,
  });
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [registrationMessage, setRegistrationMessage] = useState<string | null>(null);
  const [showUnregisterModal, setShowUnregisterModal] = useState(false);
  const [unregisterTarget, setUnregisterTarget] = useState<PlayerRegistration | null>(null);
  const [unregisterLoading, setUnregisterLoading] = useState(false);
  const [storedMatchPricing, setStoredMatchPricing] = useState<StoredMatchPricing | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editMessage, setEditMessage] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<MatchEditFormData>({
    location: "",
    date: "",
    time: "",
    playersPerTeam: PLAYER_OPTIONS[0],
    fieldCost: 0,
    hasRentedGoalkeepers: false,
    rentedGoalkeepersCount: 1,
    rentalCost: 0,
  });
  const [editFieldCostInput, setEditFieldCostInput] = useState("");
  const [editRentalCostInput, setEditRentalCostInput] = useState("");
  const editFieldCostRef = useRef<HTMLInputElement>(null);
  const editRentalCostRef = useRef<HTMLInputElement>(null);

  const [showTeamBuilder, setShowTeamBuilder] = useState(false);
  const [teamA, setTeamA] = useState<PlayerRegistration[]>([]);
  const [teamB, setTeamB] = useState<PlayerRegistration[]>([]);
  const [unassigned, setUnassigned] = useState<PlayerRegistration[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const draggingIdRef = useRef<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState<TeamZone | null>(null);
  const [teamSaved, setTeamSaved] = useState(false);
  const [teamBuilderMessage, setTeamBuilderMessage] = useState<string | null>(null);
  const [hasAutoLoadedTeams, setHasAutoLoadedTeams] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>("register");

  const { getMatchById, updateMatch, registerForMatch, unregisterFromMatch, registerRentedGoalkeepers } = useMatches();
  const { registrations = [], loading: registrationsLoading } = useMatchRegistrationsRealtime(matchId);
  const { user } = useAuth();

  useEffect(() => {
    const fetchMatchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const matchResult = await getMatchById(matchId);

        if (matchResult.error) {
          setError("Error al cargar el partido");
          setLoading(false);
          return;
        }

        if (!matchResult.data) {
          setError("Partido no encontrado");
          setLoading(false);
          return;
        }

        setMatchData(matchResult.data);
        setLoading(false);

      } catch (err) {
        console.error('Error en fetchMatchData:', err);
        setError("Error al cargar los datos del partido");
        setLoading(false);
      }
    };

    fetchMatchData();
  }, [getMatchById, matchId]);

  useEffect(() => {
    try {
      const storedMatches = localStorage.getItem("matches");

      if (!storedMatches) {
        setStoredMatchPricing(null);
        return;
      }

      const parsedMatches = JSON.parse(storedMatches) as Array<Partial<StoredMatchPricing>>;
      const storedMatch = parsedMatches.find((match) => match.id === matchId);

      if (
        storedMatch &&
        typeof storedMatch.fieldCost === "number" &&
        typeof storedMatch.costPerPlayer === "number" &&
        typeof storedMatch.playersPerTeam === "number"
      ) {
        setStoredMatchPricing({
          id: matchId,
          fieldCost: storedMatch.fieldCost,
          costPerPlayer: storedMatch.costPerPlayer,
          playersPerTeam: storedMatch.playersPerTeam,
        });
        return;
      }

      setStoredMatchPricing(null);
    } catch (err) {
      console.error("Error loading match pricing from localStorage", err);
      setStoredMatchPricing(null);
    }
  }, [matchId]);

  useEffect(() => {
    if (!matchData) {
      return;
    }

    const [datePart = "", timePartRaw = ""] = matchData.date.split("T");

    const initialFieldCost = storedMatchPricing?.fieldCost ?? 0;
    const initialHasRentedGoalkeepers = storedMatchPricing?.hasRentedGoalkeepers ?? false;
    const initialRentedGoalkeepersCount = storedMatchPricing?.rentedGoalkeepersCount ?? 1;
    const initialRentalCost = storedMatchPricing?.rentalCost ?? 0;

    setEditForm({
      location: matchData.location,
      date: datePart,
      time: timePartRaw.slice(0, 5),
      playersPerTeam: clampPlayersPerTeam(Math.round(matchData.max_players / 2)),
      fieldCost: initialFieldCost,
      hasRentedGoalkeepers: initialHasRentedGoalkeepers,
      rentedGoalkeepersCount: initialRentedGoalkeepersCount,
      rentalCost: initialRentalCost,
    });

    setEditFieldCostInput(
      initialFieldCost > 0 ? formatCurrency(initialFieldCost) : "",
    );
    setEditRentalCostInput(
      initialRentalCost > 0 ? formatCurrency(initialRentalCost) : "",
    );
  }, [matchData, storedMatchPricing]);

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationForm.name.trim()) return;

    setRegistrationLoading(true);
    setRegistrationMessage(null);

    try {
      console.log('[Register] Intentando registrarse con:', {
        matchId,
        name: registrationForm.name,
        isGoalkeeper: registrationForm.isGoalkeeper
      });

      const { data, error } = await registerForMatch(
        matchId,
        registrationForm.name.trim(),
        registrationForm.isGoalkeeper
      );

      console.log('[Register] Respuesta de registerForMatch:', { data, error });

      if (error) {
        console.error('[Register] Error:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : typeof error === "string"
              ? error
              : "Error al registrarte. Inténtalo de nuevo.";
        setRegistrationMessage(errorMessage);
      } else {
        console.log('[Register] ✅ Registrado exitosamente');
        setRegistrationMessage("¡Te has registrado exitosamente!");
        setRegistrationForm({ name: "", isGoalkeeper: false });
        setShowRegistrationForm(false);
      }
    } catch (err) {
      console.error('[Register] Exception:', err);
      setRegistrationMessage("Error al registrarte. Inténtalo de nuevo.");
    } finally {
      setRegistrationLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setRegistrationForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setRegistrationForm(prev => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleEditInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "fieldCost") {
      const selectionStart =
        e.target instanceof HTMLInputElement ? (e.target.selectionStart ?? value.length) : value.length;
      const digitsBeforeCursor = value.slice(0, selectionStart).replace(/\D/g, "").length;
      const numericValue = value.replace(/\D/g, "");
      const formattedValue = numericValue === "" ? "" : formatCurrency(Number(numericValue));

      setEditFieldCostInput(formattedValue);
      setEditForm(prev => ({ ...prev, fieldCost: numericValue === "" ? 0 : Number(numericValue) }));

      requestAnimationFrame(() => {
        const input = editFieldCostRef.current;
        if (!input) return;

        let digitsSeen = 0;
        let nextPos = formattedValue.length;
        for (let i = 0; i < formattedValue.length; i += 1) {
          if (/\d/.test(formattedValue[i])) digitsSeen += 1;
          if (digitsSeen >= Math.min(digitsBeforeCursor, numericValue.length)) {
            nextPos = i + 1;
            break;
          }
        }
        input.setSelectionRange(nextPos, nextPos);
      });
      return;
    }

    if (name === "rentalCost") {
      const selectionStart =
        e.target instanceof HTMLInputElement ? (e.target.selectionStart ?? value.length) : value.length;
      const digitsBeforeCursor = value.slice(0, selectionStart).replace(/\D/g, "").length;
      const numericValue = value.replace(/\D/g, "");
      const formattedValue = numericValue === "" ? "" : formatCurrency(Number(numericValue));

      setEditRentalCostInput(formattedValue);
      setEditForm(prev => ({ ...prev, rentalCost: numericValue === "" ? 0 : Number(numericValue) }));

      requestAnimationFrame(() => {
        const input = editRentalCostRef.current;
        if (!input) return;

        let digitsSeen = 0;
        let nextPos = formattedValue.length;
        for (let i = 0; i < formattedValue.length; i += 1) {
          if (/\d/.test(formattedValue[i])) digitsSeen += 1;
          if (digitsSeen >= Math.min(digitsBeforeCursor, numericValue.length)) {
            nextPos = i + 1;
            break;
          }
        }
        input.setSelectionRange(nextPos, nextPos);
      });
      return;
    }

    if (name === "hasRentedGoalkeepers") {
      setEditForm(prev => ({
        ...prev,
        [name]: e.target instanceof HTMLInputElement && e.target.checked,
      }));
      return;
    }

    setEditForm(prev => ({
      ...prev,
      [name]: name === "playersPerTeam" || name === "rentedGoalkeepersCount" ? Number(value) : value,
    }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!matchData || !user || user.id !== matchData.created_by) {
      setEditMessage("Solo el creador del partido puede editar esta información.");
      return;
    }

    if (!editForm.location.trim() || !editForm.date || !editForm.time) {
      setEditMessage("Completa todos los campos para guardar los cambios.");
      return;
    }

    const selectedPlayersPerTeam = clampPlayersPerTeam(editForm.playersPerTeam);
    const nextMaxPlayers = selectedPlayersPerTeam * 2;

    const nextTotalCapacity = nextMaxPlayers + MAX_SUBSTITUTE_SLOTS;
    if (registrations.length > nextTotalCapacity) {
      setEditMessage(
        `No puedes reducir el formato a ${selectedPlayersPerTeam} vs ${selectedPlayersPerTeam} porque hay ${registrations.length} inscritos y el nuevo límite total sería ${nextTotalCapacity} (incluyendo suplentes).`,
      );
      return;
    }

    setEditLoading(true);
    setEditMessage(null);

    try {
      const nextLocation = editForm.location.trim();
      const nextDate = `${editForm.date}T${editForm.time}:00`;

      console.log('[EditMatch] Intentando guardar cambios:', {
        location: nextLocation,
        date: nextDate,
        max_players: nextMaxPlayers,
      });

      const { data, error } = await updateMatch(matchId, {
        title: `Partido en ${nextLocation}`,
        location: nextLocation,
        date: nextDate,
        max_players: nextMaxPlayers,
      });

      if (error || !data) {
        console.error('[EditMatch] Error en respuesta:', error);
        throw error || new Error("No se pudieron guardar los cambios");
      }

      console.log('[EditMatch] ✅ Cambios guardados exitosamente:', data);
      
      setMatchData(data as MatchData);
      setEditMessage("✓ ¡Partido actualizado correctamente!");

      // Register or update rented goalkeepers if configured
      if (editForm.hasRentedGoalkeepers && editForm.rentedGoalkeepersCount > 0) {
        const { error: rentedError } = await registerRentedGoalkeepers(matchId, editForm.rentedGoalkeepersCount);
        if (rentedError) {
          console.error("Error registering rented goalkeepers:", rentedError);
        }
      } else {
        // Remove rented goalkeepers if disabled
        const { error: rentedError } = await registerRentedGoalkeepers(matchId, 0);
        if (rentedError) {
          console.error("Error removing rented goalkeepers:", rentedError);
        }
      }

      // Update localStorage with new pricing info
      setStoredMatchPricing((currentPricing) => {
        if (!currentPricing) {
          return currentPricing;
        }

        const nextFieldCost = editForm.fieldCost > 0 ? editForm.fieldCost : currentPricing.fieldCost;
        const totalCost = editForm.hasRentedGoalkeepers 
          ? nextFieldCost + editForm.rentalCost 
          : nextFieldCost;

        const updatedPricing: StoredMatchPricing = {
          ...currentPricing,
          fieldCost: nextFieldCost,
          playersPerTeam: selectedPlayersPerTeam,
          costPerPlayer: Math.round(totalCost / nextMaxPlayers),
          hasRentedGoalkeepers: editForm.hasRentedGoalkeepers,
          rentedGoalkeepersCount: editForm.rentedGoalkeepersCount,
          rentalCost: editForm.hasRentedGoalkeepers ? editForm.rentalCost : 0,
        };

        try {
          const storedMatches = localStorage.getItem("matches");
          if (storedMatches) {
            const parsedMatches = JSON.parse(storedMatches) as Array<Record<string, unknown>>;
            const nextMatches = parsedMatches.map((storedMatch) => {
              if (storedMatch.id !== matchId) {
                return storedMatch;
              }

              return {
                ...storedMatch,
                location: nextLocation,
                date: editForm.date,
                time: editForm.time,
                fieldCost: updatedPricing.fieldCost,
                playersPerTeam: selectedPlayersPerTeam,
                totalPlayers: nextMaxPlayers,
                costPerPlayer: updatedPricing.costPerPlayer,
                hasRentedGoalkeepers: editForm.hasRentedGoalkeepers,
                rentedGoalkeepersCount: editForm.rentedGoalkeepersCount,
                rentalCost: editForm.hasRentedGoalkeepers ? editForm.rentalCost : 0,
              };
            });
            localStorage.setItem("matches", JSON.stringify(nextMatches));
          }
        } catch (err) {
          console.error("Error updating match pricing in localStorage", err);
        }

        return updatedPricing;
      });

      // Close form after a short delay to show success message
      setTimeout(() => {
        setShowEditForm(false);
        setEditMessage(null);
      }, 1500);

    } catch (err) {
      console.error("[EditMatch] Exception:", err);
      const errorMessage = err instanceof Error ? err.message : "No se pudo actualizar el partido. Intenta nuevamente.";
      setEditMessage(`❌ ${errorMessage}`);
    } finally {
      setEditLoading(false);
    }
  };

  const handleUnregisterClick = (registration: PlayerRegistration) => {
    setUnregisterTarget(registration);
    setShowUnregisterModal(true);
  };

  const loadSavedTeamBuilder = (players: PlayerRegistration[]) => {
    try {
      const saved = localStorage.getItem(`teams-${matchId}`);
      if (!saved) {
        return false;
      }

      const { teamA: savedTeamA, teamB: savedTeamB, unassigned: savedUnassigned } = JSON.parse(saved) as {
        teamA: PlayerRegistration[];
        teamB: PlayerRegistration[];
        unassigned: PlayerRegistration[];
      };

      const savedIds = new Set([...savedTeamA, ...savedTeamB, ...savedUnassigned].map((player) => player.id));
      const currentIds = new Set(players.map((player) => player.id));
      const isSameRoster = savedIds.size === currentIds.size && [...currentIds].every((id) => savedIds.has(id));

      if (!isSameRoster) {
        return false;
      }

      const playersPerTeamLimit = Math.ceil((matchData?.max_players ?? 0) / 2);
      if (playersPerTeamLimit > 0 && (savedTeamA.length > playersPerTeamLimit || savedTeamB.length > playersPerTeamLimit)) {
        return false;
      }

      setTeamA(savedTeamA);
      setTeamB(savedTeamB);
      setUnassigned(savedUnassigned);
      setDraggingId(null);
      setDragOverZone(null);
      setTeamBuilderMessage(null);

      return true;
    } catch {
      return false;
    }
  };

  const initTeamBuilder = (players: PlayerRegistration[]) => {
    if (loadSavedTeamBuilder(players)) {
      return;
    }

    // Default: goalkeepers auto-assigned, field players in pool
    const goalkeepers = players.filter((p) => p.is_goalkeeper);
    const fieldPlayers = players.filter((p) => !p.is_goalkeeper);
    setTeamA(goalkeepers[0] ? [goalkeepers[0]] : []);
    setTeamB(goalkeepers[1] ? [goalkeepers[1]] : []);
    setUnassigned(fieldPlayers);
    setDraggingId(null);
    setDragOverZone(null);
    setTeamBuilderMessage(null);
  };

  const resetTeamBuilder = () => {
    try { localStorage.removeItem(`teams-${matchId}`); } catch { /* ignore */ }
    setTeamSaved(false);
    setTeamBuilderMessage(null);
    const goalkeepers = titulares.filter((p) => p.is_goalkeeper);
    const fieldPlayers = titulares.filter((p) => !p.is_goalkeeper);
    setTeamA(goalkeepers[0] ? [goalkeepers[0]] : []);
    setTeamB(goalkeepers[1] ? [goalkeepers[1]] : []);
    setUnassigned(fieldPlayers);
    setDraggingId(null);
    setDragOverZone(null);
  };

  const shufflePlayers = (players: PlayerRegistration[]) => {
    const shuffled = [...players];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const randomizeTeams = () => {
    const playersPerTeam = playersPerTeamLimit;
    if (playersPerTeam <= 0) {
      setTeamBuilderMessage("No se pudo calcular el límite de jugadores por equipo.");
      return;
    }

    const currentPlayers = [...teamA, ...teamB, ...unassigned];
    if (currentPlayers.length === 0) {
      setTeamBuilderMessage("No hay jugadores para distribuir.");
      return;
    }

    const shuffled = shufflePlayers(currentPlayers);
    const goalkeepers = shuffled.filter((player) => player.is_goalkeeper);
    const fieldPlayers = shuffled.filter((player) => !player.is_goalkeeper);

    const nextTeamA: PlayerRegistration[] = [];
    const nextTeamB: PlayerRegistration[] = [];

    if (goalkeepers[0]) nextTeamA.push(goalkeepers[0]);
    if (goalkeepers[1]) nextTeamB.push(goalkeepers[1]);

    const remainingPlayers = shufflePlayers([...goalkeepers.slice(2), ...fieldPlayers]);

    remainingPlayers.forEach((player) => {
      const canAddToA = nextTeamA.length < playersPerTeam;
      const canAddToB = nextTeamB.length < playersPerTeam;

      if (canAddToA && canAddToB) {
        if (nextTeamA.length === nextTeamB.length) {
          (Math.random() < 0.5 ? nextTeamA : nextTeamB).push(player);
        } else if (nextTeamA.length < nextTeamB.length) {
          nextTeamA.push(player);
        } else {
          nextTeamB.push(player);
        }
        return;
      }

      if (canAddToA) {
        nextTeamA.push(player);
        return;
      }

      if (canAddToB) {
        nextTeamB.push(player);
      }
    });

    const assignedIds = new Set([...nextTeamA, ...nextTeamB].map((player) => player.id));
    const nextUnassigned = shuffled.filter((player) => !assignedIds.has(player.id));

    setTeamA(nextTeamA);
    setTeamB(nextTeamB);
    setUnassigned(nextUnassigned);
    setDraggingId(null);
    draggingIdRef.current = null;
    setDragOverZone(null);
    setTeamBuilderMessage("Jugadores distribuidos aleatoriamente.");
  };

  const saveTeams = () => {
    try {
      localStorage.setItem(`teams-${matchId}`, JSON.stringify({ teamA, teamB, unassigned }));
      setTeamSaved(true);
      setTeamBuilderMessage("Equipos guardados correctamente.");
      setTimeout(() => setTeamSaved(false), 2500);
      setTimeout(() => setTeamBuilderMessage(null), 2500);
    } catch {
      setTeamBuilderMessage("No se pudieron guardar los equipos.");
    }
  };

  const getActiveDraggingId = () => draggingIdRef.current ?? draggingId;

  const handlePlayerDragStart = (event: React.DragEvent<HTMLDivElement>, playerId: string) => {
    draggingIdRef.current = playerId;
    setDraggingId(playerId);
    event.dataTransfer.setData("text/plain", playerId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handlePlayerDragEnd = () => {
    draggingIdRef.current = null;
    setDraggingId(null);
    setDragOverZone(null);
  };

  const handleDropOnZone = (targetZone: TeamZone) => {
    const activeDraggingId = getActiveDraggingId();
    if (!activeDraggingId) return;
    setDragOverZone(null);

    const allZones: [TeamZone, PlayerRegistration[]][] = [
      ["A", teamA],
      ["B", teamB],
      ["pool", unassigned],
    ];
    let player: PlayerRegistration | undefined;
    let sourceZone: TeamZone | undefined;
    for (const [zone, list] of allZones) {
      const found = list.find((p) => p.id === activeDraggingId);
      if (found) { player = found; sourceZone = zone; break; }
    }

    draggingIdRef.current = null;
    setDraggingId(null);
    if (!player || !sourceZone || sourceZone === targetZone) return;

    const playersPerTeamLimit = Math.ceil((matchData?.max_players ?? 0) / 2);
    if (targetZone === "A" && teamA.length >= playersPerTeamLimit) {
      setTeamBuilderMessage(`El equipo A ya está completo (${playersPerTeamLimit}).`);
      return;
    }

    if (targetZone === "B" && teamB.length >= playersPerTeamLimit) {
      setTeamBuilderMessage(`El equipo B ya está completo (${playersPerTeamLimit}).`);
      return;
    }

    setTeamBuilderMessage(null);

    const withoutPlayer = (list: PlayerRegistration[]) => list.filter((p) => p.id !== player!.id);
    if (sourceZone === "A") setTeamA(withoutPlayer(teamA));
    else if (sourceZone === "B") setTeamB(withoutPlayer(teamB));
    else setUnassigned(withoutPlayer(unassigned));

    if (targetZone === "A") setTeamA((prev) => [...prev, player!]);
    else if (targetZone === "B") setTeamB((prev) => [...prev, player!]);
    else setUnassigned((prev) => [...prev, player!]);
  };

  /** Same move logic as drag-and-drop, for keyboard / button alternative (WCAG). */
  const assignPlayerToZone = (playerId: string, targetZone: TeamZone) => {
    if (!matchData) return;

    const allZones: [TeamZone, PlayerRegistration[]][] = [
      ["A", teamA],
      ["B", teamB],
      ["pool", unassigned],
    ];
    let player: PlayerRegistration | undefined;
    let sourceZone: TeamZone | undefined;
    for (const [zone, list] of allZones) {
      const found = list.find((p) => p.id === playerId);
      if (found) {
        player = found;
        sourceZone = zone;
        break;
      }
    }

    if (!player || !sourceZone || sourceZone === targetZone) return;

    const limit = Math.ceil(matchData.max_players / 2);
    if (targetZone === "A" && teamA.length >= limit) {
      setTeamBuilderMessage(`El equipo A ya está completo (${limit}).`);
      return;
    }

    if (targetZone === "B" && teamB.length >= limit) {
      setTeamBuilderMessage(`El equipo B ya está completo (${limit}).`);
      return;
    }

    setTeamBuilderMessage(null);

    const withoutPlayer = (list: PlayerRegistration[]) => list.filter((p) => p.id !== player!.id);
    if (sourceZone === "A") setTeamA(withoutPlayer(teamA));
    else if (sourceZone === "B") setTeamB(withoutPlayer(teamB));
    else setUnassigned(withoutPlayer(unassigned));

    if (targetZone === "A") setTeamA((prev) => [...prev, player!]);
    else if (targetZone === "B") setTeamB((prev) => [...prev, player!]);
    else setUnassigned((prev) => [...prev, player!]);
  };

  const getSourceZoneByPlayerId = (playerId: string): TeamZone | null => {
    if (teamA.some((player) => player.id === playerId)) return "A";
    if (teamB.some((player) => player.id === playerId)) return "B";
    if (unassigned.some((player) => player.id === playerId)) return "pool";
    return null;
  };

  const canDropInZone = (targetZone: TeamZone): boolean => {
    const activeDraggingId = getActiveDraggingId();
    if (!activeDraggingId) return false;

    const sourceZone = getSourceZoneByPlayerId(activeDraggingId);
    if (!sourceZone || sourceZone === targetZone) {
      return false;
    }

    if (targetZone === "A") {
      return teamA.length < playersPerTeamLimit;
    }

    if (targetZone === "B") {
      return teamB.length < playersPerTeamLimit;
    }

    return true;
  };

  const canSwapWithPlayer = (targetZone: TeamZone, targetPlayerId: string): boolean => {
    const activeDraggingId = getActiveDraggingId();
    if (!activeDraggingId || (targetZone !== "A" && targetZone !== "B")) {
      return false;
    }

    const sourceZone = getSourceZoneByPlayerId(activeDraggingId);
    if (!sourceZone || sourceZone === "pool" || sourceZone === targetZone) {
      return false;
    }

    const targetList = targetZone === "A" ? teamA : teamB;
    const sourceList = sourceZone === "A" ? teamA : teamB;

    if (targetList.length < playersPerTeamLimit || sourceList.length < playersPerTeamLimit) {
      return false;
    }

    return targetList.some((player) => player.id === targetPlayerId);
  };

  const handleDropOnPlayer = (targetZone: TeamZone, targetPlayerId: string) => {
    const activeDraggingId = getActiveDraggingId();
    if (!activeDraggingId || !canSwapWithPlayer(targetZone, targetPlayerId)) {
      return;
    }

    const sourceZone = getSourceZoneByPlayerId(activeDraggingId);
    if (!sourceZone || sourceZone === "pool" || sourceZone === targetZone) {
      return;
    }

    const sourceList = sourceZone === "A" ? [...teamA] : [...teamB];
    const targetList = targetZone === "A" ? [...teamA] : [...teamB];

    const sourceIndex = sourceList.findIndex((player) => player.id === activeDraggingId);
    const targetIndex = targetList.findIndex((player) => player.id === targetPlayerId);

    if (sourceIndex < 0 || targetIndex < 0) {
      return;
    }

    const sourcePlayer = sourceList[sourceIndex];
    const targetPlayer = targetList[targetIndex];

    sourceList[sourceIndex] = targetPlayer;
    targetList[targetIndex] = sourcePlayer;

    if (sourceZone === "A") {
      setTeamA(sourceList);
      setTeamB(targetList);
    } else {
      setTeamB(sourceList);
      setTeamA(targetList);
    }

    draggingIdRef.current = null;
    setDraggingId(null);
    setDragOverZone(null);
    setTeamBuilderMessage(`Intercambio realizado entre Equipo ${sourceZone} y Equipo ${targetZone}.`);
  };

  const handleUnregister = async () => {
    if (!unregisterTarget) return;

    setUnregisterLoading(true);
    try {
      const { error } = await unregisterFromMatch(unregisterTarget.id);
      if (!error) {
        setShowUnregisterModal(false);
        setUnregisterTarget(null);
      }
    } catch (err) {
      console.error('Error unregistering:', err);
    } finally {
      setUnregisterLoading(false);
    }
  };

  const isCreator = Boolean(user && matchData && user.id === matchData.created_by);

  useEffect(() => {
    if (hasAutoLoadedTeams || registrationsLoading || !isCreator || !matchData) {
      return;
    }

    const currentTitulares = registrations.slice(0, matchData.max_players);
    if (loadSavedTeamBuilder(currentTitulares)) {
      setShowTeamBuilder(true);
    }

    setHasAutoLoadedTeams(true);
  }, [
    hasAutoLoadedTeams,
    isCreator,
    loadSavedTeamBuilder,
    matchData,
    registrations,
    registrationsLoading,
  ]);

  useEffect(() => {
    if (showTeamBuilder) {
      setActiveTab("teams");
    }
  }, [showTeamBuilder]);

  useEffect(() => {
    if (!showUnregisterModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowUnregisterModal(false);
        setUnregisterTarget(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showUnregisterModal]);

  if (loading) {
    return <div className="text-center py-8">Cargando detalles del partido...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  if (!matchData) {
    return <div className="text-center py-8">No se encontró información del partido</div>;
  }

  const formattedDate = new Date(matchData.date).toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const formattedTime = matchData.time || new Date(matchData.date).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const titulares = registrations.slice(0, matchData.max_players);
  const suplentes = registrations.slice(matchData.max_players);
  const playersPerTeamLimit = Math.ceil(matchData.max_players / 2);

  const playersRemaining = Math.max(0, matchData.max_players - titulares.length);
  const substituteSlotsFree = Math.max(0, MAX_SUBSTITUTE_SLOTS - suplentes.length);
  const registeredPercent = matchData.max_players > 0 ? Math.round((titulares.length / matchData.max_players) * 100) : 0;
  const maxGoalkeepers = Math.min(2, matchData.max_players);
  const maxFieldPlayers = Math.max(0, matchData.max_players - maxGoalkeepers);
  const goalkeepersCount = titulares.filter((registration) => registration.is_goalkeeper).length;
  const fieldPlayersCount = titulares.length - goalkeepersCount;
  const goalkeepersRemaining = Math.max(0, maxGoalkeepers - goalkeepersCount);
  const fieldPlayersRemaining = Math.max(0, maxFieldPlayers - fieldPlayersCount);
  const isTitularFull = titulares.length >= matchData.max_players;
  const isSubstituteFull = suplentes.length >= MAX_SUBSTITUTE_SLOTS;

  return (
    <div className="min-h-screen py-10 px-4 text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
          <div className="rounded-lg border border-slate-800 bg-[hsl(220,18%,10%)] p-5 shadow">
            <h1 className="text-2xl font-bold text-white">{matchData.title}</h1>
            <p className="mt-2 text-sm text-slate-300">Fecha: {formattedDate}</p>
            <p className="mt-1 text-sm text-slate-300">Hora: {formattedTime}</p>
            <p className="mt-1 text-sm text-slate-300">Ubicación: {matchData.location}</p>
            <p className="mt-3 text-sm text-slate-300">
              Titulares: {titulares.length}/{matchData.max_players} ({registeredPercent}% completo)
            </p>
            {suplentes.length > 0 && (
              <p className="mt-1 text-sm text-slate-300">Suplentes: {suplentes.length}/{MAX_SUBSTITUTE_SLOTS}</p>
            )}

            {storedMatchPricing && (
              <div className="mt-4 space-y-2 rounded border border-slate-700 bg-[hsl(220,16%,14%)] p-3 text-sm text-slate-200">
                <p><span className="text-slate-400">Cancha:</span> {formatCurrency(storedMatchPricing.fieldCost)}</p>
                {storedMatchPricing.hasRentedGoalkeepers && storedMatchPricing.rentalCost ? (
                  <p><span className="text-slate-400">Alquiler arqueros ({storedMatchPricing.rentedGoalkeepersCount}):</span> {formatCurrency(storedMatchPricing.rentalCost)}</p>
                ) : null}
                <p><span className="text-slate-400">Por jugador:</span> {formatCurrency(storedMatchPricing.costPerPlayer)}</p>
                <p><span className="text-slate-400">Formato:</span> {storedMatchPricing.playersPerTeam} vs {storedMatchPricing.playersPerTeam}</p>
              </div>
            )}

            {playersRemaining > 0 ? (
              <p className="mt-3 text-sm text-green-400">{playersRemaining} cupos titulares libres</p>
            ) : substituteSlotsFree > 0 ? (
              <p className="mt-3 text-sm text-amber-400">Titulares completos · {substituteSlotsFree} cupo{substituteSlotsFree !== 1 ? "s" : ""} de suplente</p>
            ) : (
              <p className="mt-3 text-sm text-red-400">Partido y lista de suplentes completos</p>
            )}

            {isCreator && !showEditForm && (
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(true);
                    setEditMessage(null);
                    setEditLoading(false);
                  }}
                  className="rounded border border-green-500/40 bg-green-500/20 px-4 py-2 text-sm font-semibold text-green-300 transition hover:bg-green-500/30"
                >
                  Editar partido
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!showTeamBuilder) {
                      initTeamBuilder(titulares);
                    }
                    setShowTeamBuilder(true);
                    setActiveTab("teams");
                  }}
                  className="rounded border border-blue-500/40 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/30"
                >
                  Armar equipos
                </button>
              </div>
            )}

            {isCreator && !showEditForm && editMessage && (
              <p className={`mt-3 text-sm ${editMessage.includes("correctamente") ? "text-green-400" : "text-red-400"}`}>
                {editMessage}
              </p>
            )}
          </div>
        </aside>

        <section className="space-y-6">
          {isCreator && showEditForm && (
            <div className="rounded-lg border border-green-700/50 bg-[hsl(220,18%,10%)] p-6 shadow">
              <h2 className="mb-4 text-2xl font-bold text-white">Editar partido</h2>
              <form onSubmit={handleEditSubmit} className="space-y-4">
                <div>
                  <label htmlFor="edit-location" className="mb-2 block text-sm font-medium text-slate-200">
                    Ubicación
                  </label>
                  <input
                    id="edit-location"
                    name="location"
                    value={editForm.location}
                    onChange={handleEditInputChange}
                    className="w-full rounded border border-slate-700 bg-[hsl(220,16%,14%)] px-4 py-3 text-white"
                    placeholder="Ej: Cancha Central"
                    required
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="edit-date" className="mb-2 block text-sm font-medium text-slate-200">Fecha</label>
                    <input
                      type="date"
                      id="edit-date"
                      name="date"
                      value={editForm.date}
                      onChange={handleEditInputChange}
                      className="w-full rounded border border-slate-700 bg-[hsl(220,16%,14%)] px-4 py-3 text-white"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="edit-time" className="mb-2 block text-sm font-medium text-slate-200">Hora</label>
                    <input
                      type="time"
                      id="edit-time"
                      name="time"
                      value={editForm.time}
                      onChange={handleEditInputChange}
                      className="w-full rounded border border-slate-700 bg-[hsl(220,16%,14%)] px-4 py-3 text-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="edit-playersPerTeam" className="mb-2 block text-sm font-medium text-slate-200">Jugadores por equipo</label>
                  <select
                    id="edit-playersPerTeam"
                    name="playersPerTeam"
                    value={editForm.playersPerTeam}
                    onChange={handleEditInputChange}
                    className="w-full rounded border border-slate-700 bg-[hsl(220,16%,14%)] px-4 py-3 text-white"
                  >
                    {PLAYER_OPTIONS.map((num) => (
                      <option key={num} value={num}>{num} vs {num}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-fieldCost" className="mb-2 block text-sm font-medium text-slate-200">Valor de la Cancha ($)</label>
                  <input
                    id="edit-fieldCost"
                    name="fieldCost"
                    ref={editFieldCostRef}
                    value={editFieldCostInput}
                    onChange={handleEditInputChange}
                    inputMode="numeric"
                    autoComplete="off"
                    className="w-full rounded border border-slate-700 bg-[hsl(220,16%,14%)] px-4 py-3 text-white"
                    placeholder="Ej: $ 200.000"
                  />
                </div>

                <div className="rounded border border-slate-700 bg-[hsl(220,16%,14%)] p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <input
                      type="checkbox"
                      id="edit-hasRentedGoalkeepers"
                      name="hasRentedGoalkeepers"
                      checked={editForm.hasRentedGoalkeepers}
                      onChange={handleEditInputChange}
                      className="h-5 w-5 cursor-pointer"
                      disabled={goalkeepersCount >= 2}
                    />
                    <label 
                      htmlFor="edit-hasRentedGoalkeepers" 
                      className={`text-sm font-medium cursor-pointer ${goalkeepersCount >= 2 ? 'text-slate-500' : 'text-slate-200'}`}
                    >
                      ¿Habrá arqueros alquilados?
                    </label>
                  </div>
                  {goalkeepersCount >= 2 && (
                    <p className="text-xs text-amber-400 mb-3">Ya hay 2 arqueros inscritos. No se puede configurar alquiler.</p>
                  )}

                  {editForm.hasRentedGoalkeepers && (
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="edit-rentedGoalkeepersCount" className="mb-2 block text-sm font-medium text-slate-200">
                          Cantidad de arqueros alquilados
                        </label>
                        <select
                          id="edit-rentedGoalkeepersCount"
                          name="rentedGoalkeepersCount"
                          value={editForm.rentedGoalkeepersCount}
                          onChange={handleEditInputChange}
                          className="w-full rounded border border-slate-700 bg-[hsl(220,16%,14%)] px-4 py-3 text-white"
                        >
                          <option value={1}>1 arquero</option>
                          <option value={2}>2 arqueros</option>
                        </select>
                      </div>
                      <div>
                        <label htmlFor="edit-rentalCost" className="mb-2 block text-sm font-medium text-slate-200">
                          Valor del alquiler ({editForm.rentedGoalkeepersCount} arquero{editForm.rentedGoalkeepersCount > 1 ? "s" : ""}) ($)
                        </label>
                        <input
                          id="edit-rentalCost"
                          name="rentalCost"
                          ref={editRentalCostRef}
                          value={editRentalCostInput}
                          onChange={handleEditInputChange}
                          inputMode="numeric"
                          autoComplete="off"
                          className="w-full rounded border border-slate-700 bg-[hsl(220,16%,14%)] px-4 py-3 text-white"
                          placeholder="Ej: $ 50.000"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {editMessage && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`rounded px-4 py-3 text-sm font-medium ${
                      editMessage.includes("✓")
                        ? "border border-green-500 bg-green-500/20 text-green-300"
                        : "border border-red-500 bg-red-500/20 text-red-300"
                    }`}
                  >
                    {editMessage}
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    type="submit"
                    className={`flex-1 rounded px-4 py-2 font-semibold text-white transition ${
                      editLoading || editMessage?.includes("✓")
                        ? "cursor-not-allowed bg-slate-600 opacity-60"
                        : "bg-green-500 hover:bg-green-600"
                    }`}
                    disabled={editLoading || editMessage?.includes("✓")}
                  >
                    {editLoading ? "Guardando..." : editMessage?.includes("✓") ? "✓ Guardado" : "Guardar cambios"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditForm(false);
                      setEditMessage(null);
                    }}
                    className="flex-1 rounded bg-slate-700 px-4 py-2 text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={editLoading}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="rounded-lg border border-slate-800 bg-[hsl(220,18%,10%)] p-4 shadow sm:p-6">
            <div
              className="mb-4 flex flex-wrap gap-2"
              role="tablist"
              aria-label="Secciones del partido"
            >
              <button
                type="button"
                role="tab"
                id="tab-register"
                aria-selected={activeTab === "register"}
                aria-controls="panel-register"
                tabIndex={activeTab === "register" ? 0 : -1}
                onClick={() => setActiveTab("register")}
                className={`rounded px-3 py-1.5 text-sm font-semibold transition ${
                  activeTab === "register" ? "bg-green-600 text-white" : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                }`}
              >
                Inscripción
              </button>
              <button
                type="button"
                role="tab"
                id="tab-players"
                aria-selected={activeTab === "players"}
                aria-controls="panel-players"
                tabIndex={activeTab === "players" ? 0 : -1}
                onClick={() => setActiveTab("players")}
                className={`rounded px-3 py-1.5 text-sm font-semibold transition ${
                  activeTab === "players" ? "bg-green-600 text-white" : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                }`}
              >
                Jugadores
              </button>
              {isCreator && (
                <button
                  type="button"
                  role="tab"
                  id="tab-teams"
                  aria-selected={activeTab === "teams"}
                  aria-controls="panel-teams"
                  tabIndex={activeTab === "teams" ? 0 : -1}
                  onClick={() => {
                    if (!showTeamBuilder) {
                      initTeamBuilder(titulares);
                    }
                    setShowTeamBuilder(true);
                    setActiveTab("teams");
                  }}
                  className={`rounded px-3 py-1.5 text-sm font-semibold transition ${
                    activeTab === "teams" ? "bg-blue-600 text-white" : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                  }`}
                >
                  Equipos
                </button>
              )}
            </div>

            {activeTab === "register" && (
              <div id="panel-register" role="tabpanel" aria-labelledby="tab-register">
                <h2 className="mb-2 text-xl font-bold text-white">Inscribirme al partido</h2>
                <p className="mb-4 text-sm text-slate-300">Deja tu nombre y elige si vienes como portero.</p>
                <div className="mb-4 rounded border border-slate-700 bg-[hsl(220,16%,14%)] p-3 text-sm text-slate-300">
                  <p>Jugadores de campo: {fieldPlayersCount}/{maxFieldPlayers}</p>
                  <p>Arqueros: {goalkeepersCount}/{maxGoalkeepers}</p>
                  <p className="mt-1 text-green-400">Cupos disponibles para arqueros: {goalkeepersRemaining}</p>
                </div>

                {registrationMessage && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`mb-4 rounded p-3 text-sm ${registrationMessage.includes("exitosamente") ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"}`}
                  >
                    {registrationMessage}
                  </div>
                )}

                {!showRegistrationForm ? (
                  <button
                    type="button"
                    onClick={() => setShowRegistrationForm(true)}
                    className={`w-full rounded py-2 px-4 font-semibold transition ${
                      isTitularFull && !isSubstituteFull
                        ? "bg-amber-500 text-white hover:bg-amber-600"
                        : isTitularFull && isSubstituteFull
                          ? "cursor-not-allowed bg-slate-700 text-slate-400"
                          : "bg-green-500 text-white hover:bg-green-600"
                    }`}
                    disabled={isTitularFull && isSubstituteFull}
                  >
                    {isTitularFull && isSubstituteFull ? "Sin cupos disponibles" : isTitularFull ? "Inscribirme como suplente" : "Inscribirme"}
                  </button>
                ) : (
                  <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                    <div>
                      <label htmlFor="register-fullname" className="mb-2 block text-sm font-medium text-slate-200">
                        Nombre completo
                      </label>
                      <input
                        id="register-fullname"
                        type="text"
                        name="name"
                        autoComplete="name"
                        value={registrationForm.name}
                        onChange={handleInputChange}
                        className="w-full rounded border border-slate-700 bg-[hsl(220,16%,14%)] px-4 py-3 text-white"
                        placeholder="Ingresa tu nombre…"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-3 rounded border border-slate-700 bg-[hsl(220,16%,14%)] p-3">
                      <input
                        id="register-gk"
                        type="checkbox"
                        name="isGoalkeeper"
                        checked={registrationForm.isGoalkeeper}
                        onChange={handleCheckboxChange}
                        className="h-5 w-5"
                        disabled={goalkeepersRemaining <= 0}
                      />
                      <label htmlFor="register-gk" className="text-sm text-slate-200">
                        Me registro como portero
                      </label>
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="flex-1 rounded bg-green-500 py-2 px-4 font-semibold text-white transition hover:bg-green-600"
                        disabled={
                          registrationLoading ||
                          (isTitularFull && isSubstituteFull) ||
                          (!isTitularFull && registrationForm.isGoalkeeper && goalkeepersRemaining <= 0) ||
                          (!isTitularFull && !registrationForm.isGoalkeeper && fieldPlayersRemaining <= 0)
                        }
                      >
                        {registrationLoading ? "Registrando..." : "Confirmar inscripción"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowRegistrationForm(false);
                          setRegistrationForm({ name: "", isGoalkeeper: false });
                          setRegistrationMessage(null);
                        }}
                        className="flex-1 rounded bg-slate-700 py-2 px-4 text-white transition hover:bg-slate-800"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {activeTab === "players" && (
              <div id="panel-players" role="tabpanel" aria-labelledby="tab-players">
                <h2 className="mb-3 text-xl font-bold text-white">Jugadores inscritos ({registrations.length})</h2>
                <div className="max-h-[68vh] space-y-2 overflow-y-auto pr-1">
                  {titulares.length > 0 && (
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-400">Titulares ({titulares.length}/{matchData.max_players})</p>
                  )}
                  {titulares.map((registration, index) => (
                    <div key={registration.id} className="flex items-center justify-between rounded border border-slate-700 bg-[hsl(220,16%,14%)] p-2.5 transition hover:bg-[hsl(220,16%,18%)]">
                      <div className="flex-1">
                        <span className="mr-2 text-xs text-slate-500">#{index + 1}</span>
                        <span className="font-medium text-white">{registration.name}</span>
                        <span className="mt-0.5 block text-xs text-slate-400">{registration.is_goalkeeper ? "🥅 Portero" : "⚽ Jugador de campo"}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleUnregisterClick(registration)}
                        className="ml-3 rounded p-1.5 text-red-400 transition hover:bg-red-900/30 hover:text-red-300"
                        title="Darse de baja"
                        aria-label={`Dar de baja a ${registration.name}`}
                      >
                        <Trash2 size={16} aria-hidden />
                      </button>
                    </div>
                  ))}

                  {suplentes.length > 0 && (
                    <>
                      <p className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-amber-400">Suplentes ({suplentes.length}/{MAX_SUBSTITUTE_SLOTS})</p>
                      {suplentes.map((registration, index) => (
                        <div key={registration.id} className="flex items-center justify-between rounded border border-amber-800/40 bg-[hsl(220,16%,14%)] p-2.5 transition hover:bg-[hsl(220,16%,18%)]">
                          <div className="flex-1">
                            <span className="mr-2 inline-flex items-center rounded bg-amber-900/50 px-1.5 py-0.5 text-xs text-amber-300">S{index + 1}</span>
                            <span className="font-medium text-white">{registration.name}</span>
                            <span className="mt-0.5 block text-xs text-slate-400">{registration.is_goalkeeper ? "🥅 Portero" : "⚽ Jugador de campo"}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUnregisterClick(registration)}
                            className="ml-3 rounded p-1.5 text-red-400 transition hover:bg-red-900/30 hover:text-red-300"
                            title="Darse de baja"
                            aria-label={`Dar de baja a ${registration.name}`}
                          >
                            <Trash2 size={16} aria-hidden />
                          </button>
                        </div>
                      ))}
                    </>
                  )}

                  {registrations.length === 0 && (
                    <p className="py-4 text-center text-slate-400">Aún no hay jugadores inscritos</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "teams" && isCreator && (
              <div id="panel-teams" role="tabpanel" aria-labelledby="tab-teams">
              <div id="team-builder">
                {!showTeamBuilder ? (
                  <div className="rounded border border-slate-700 bg-[hsl(220,16%,14%)] p-4">
                    <p className="text-sm text-slate-300">Inicializa el armado para distribuir titulares con drag and drop.</p>
                    <button
                      type="button"
                      onClick={() => {
                        initTeamBuilder(titulares);
                        setShowTeamBuilder(true);
                      }}
                      className="mt-3 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500"
                    >
                      Iniciar equipos
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                      <h2 className="text-xl font-bold text-white">Armar equipos</h2>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={randomizeTeams}
                          className="rounded border border-indigo-500/70 bg-indigo-600/80 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
                        >
                          Distribuir aleatoriamente
                        </button>
                        <button
                          type="button"
                          onClick={saveTeams}
                          className={`rounded border px-3 py-1.5 text-sm font-semibold transition ${teamSaved ? "border-green-600 bg-green-700 text-green-100" : "border-blue-600 bg-blue-600 text-white hover:bg-blue-500"}`}
                        >
                          {teamSaved ? "✓ Guardado" : "Guardar equipos"}
                        </button>
                        <button
                          type="button"
                          onClick={resetTeamBuilder}
                          className="rounded border border-slate-600 bg-slate-700 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-600"
                        >
                          Reiniciar
                        </button>
                      </div>
                    </div>

                    {teamBuilderMessage && (
                      <p
                        role="status"
                        aria-live="polite"
                        className={`mb-3 text-sm ${teamBuilderMessage.includes("correctamente") ? "text-green-400" : "text-amber-400"}`}
                      >
                        {teamBuilderMessage}
                      </p>
                    )}

                    <div className="grid gap-3 lg:grid-cols-3">
                      <div
                        onDragOver={(e) => { e.preventDefault(); setDragOverZone("pool"); }}
                        onDrop={() => handleDropOnZone("pool")}
                        className={`rounded-lg border-2 border-dashed p-3 ${dragOverZone === "pool" ? "border-slate-400 bg-slate-700/40" : "border-slate-700 bg-[hsl(220,16%,14%)]"}`}
                      >
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Sin equipo ({unassigned.length})</p>
                        <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
                          {unassigned.map((player) => (
                            <div key={player.id} className="space-y-1">
                              <div
                                draggable
                                onDragStart={(event) => handlePlayerDragStart(event, player.id)}
                                onDragEnd={handlePlayerDragEnd}
                                className={`flex cursor-grab select-none items-center gap-1.5 rounded border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-white transition active:cursor-grabbing ${draggingId === player.id ? "opacity-40" : "hover:border-slate-400"}`}
                              >
                                <span aria-hidden>{player.is_goalkeeper ? "🥅" : "⚽"}</span>
                                <span>{player.name}</span>
                              </div>
                              <div className="flex flex-wrap justify-end gap-1">
                                <button
                                  type="button"
                                  className="rounded border border-blue-600/60 bg-blue-900/30 px-2 py-0.5 text-xs font-medium text-blue-200 hover:bg-blue-800/40"
                                  onClick={() => assignPlayerToZone(player.id, "A")}
                                  aria-label={`Asignar ${player.name} al equipo A`}
                                >
                                  → A
                                </button>
                                <button
                                  type="button"
                                  className="rounded border border-red-600/60 bg-red-900/30 px-2 py-0.5 text-xs font-medium text-red-200 hover:bg-red-800/40"
                                  onClick={() => assignPlayerToZone(player.id, "B")}
                                  aria-label={`Asignar ${player.name} al equipo B`}
                                >
                                  → B
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {(["A", "B"] as const).map((team) => {
                        const list = team === "A" ? teamA : teamB;
                        const isOver = dragOverZone === team;
                        const accentColor = team === "A" ? "text-blue-400" : "text-red-400";
                        const isTeamFull = list.length >= playersPerTeamLimit;
                        const canDropHere = canDropInZone(team);
                        return (
                          <div
                            key={team}
                            onDragOver={(e) => {
                              const activeDraggingId = getActiveDraggingId();
                              if (!activeDraggingId) return;
                              if (canDropHere) {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = "move";
                                setDragOverZone(team);
                                return;
                              }
                              e.dataTransfer.dropEffect = "none";
                              setDragOverZone(null);
                            }}
                            onDrop={() => handleDropOnZone(team)}
                            className={`rounded-lg border-2 border-dashed p-3 ${
                              isOver && !isTeamFull
                                ? "border-green-400 bg-green-900/20"
                                : isTeamFull
                                  ? "border-red-700/60 bg-red-900/15"
                                  : "border-slate-700 bg-[hsl(220,16%,14%)]"
                            } ${draggingId && !canDropHere ? "cursor-not-allowed" : ""}`}
                          >
                            <p className={`mb-2 text-sm font-bold uppercase tracking-wide ${accentColor}`}>Equipo {team} ({list.length}/{playersPerTeamLimit})</p>
                            <div className="max-h-[62vh] space-y-2 overflow-y-auto pr-1">
                              {list.map((player) => (
                                <div
                                  key={player.id}
                                  draggable
                                  onDragStart={(event) => handlePlayerDragStart(event, player.id)}
                                  onDragEnd={handlePlayerDragEnd}
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
                                      handleDropOnPlayer(team, player.id);
                                    }
                                  }}
                                  className={`flex cursor-grab select-none items-center gap-2 rounded border px-3 py-2 text-sm text-white transition active:cursor-grabbing ${
                                    player.is_goalkeeper
                                      ? "border-yellow-700/60 bg-yellow-900/20 hover:border-yellow-600/60"
                                      : "border-slate-700 bg-slate-800 hover:border-slate-500"
                                  } ${draggingId === player.id ? "opacity-40" : ""}`}
                                >
                                  <span>{player.is_goalkeeper ? "🥅" : "⚽"}</span>
                                  <span className="font-medium">{player.name}</span>
                                </div>
                              ))}
                              {list.length === 0 && (
                                <p className="py-6 text-center text-xs text-slate-500">Arrastra jugadores aquí</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
              </div>
            )}
          </div>
        </section>

        {/* Unregister Modal */}
        {showUnregisterModal && unregisterTarget && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overscroll-contain"
            role="presentation"
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="unregister-dialog-title"
              className="max-h-[90dvh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-lg border border-slate-700 bg-[hsl(220,18%,10%)] p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="rounded-full bg-red-900/30 p-2">
                  <Trash2 className="text-red-400" size={24} aria-hidden />
                </div>
                <h3 id="unregister-dialog-title" className="text-xl font-bold text-white">
                  Confirmar baja
                </h3>
              </div>
              <p className="text-slate-300 mb-6">
                ¿Estás seguro de que deseas darte de baja de este partido?
                <br />
                <span className="font-semibold text-white mt-2 block">{unregisterTarget.name}</span>
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUnregisterModal(false);
                    setUnregisterTarget(null);
                  }}
                  className="flex-1 rounded bg-slate-700 py-2 px-4 text-white transition hover:bg-slate-800"
                  disabled={unregisterLoading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleUnregister}
                  className="flex flex-1 items-center justify-center gap-2 whitespace-nowrap rounded bg-green-500 py-3 px-4 text-base font-semibold text-white transition hover:bg-green-600"
                  disabled={unregisterLoading}
                >
                  {unregisterLoading ? (
                    <>
                      <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-b-2 border-white" />
                      <span>Dando de baja…</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} className="shrink-0" aria-hidden />
                      <span>Confirmar baja</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

