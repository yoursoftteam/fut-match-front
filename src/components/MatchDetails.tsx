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
}

interface MatchEditFormData {
  location: string;
  date: string;
  time: string;
  playersPerTeam: number;
  fieldCost: number;
}

const PLAYER_OPTIONS = [6, 7, 8, 9, 10, 11] as const;

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
  });
  const [editFieldCostInput, setEditFieldCostInput] = useState("");
  const editFieldCostRef = useRef<HTMLInputElement>(null);

  const { getMatchById, updateMatch, registerForMatch, unregisterFromMatch } = useMatches();
  const { registrations = [] } = useMatchRegistrationsRealtime(matchId);
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

    setEditForm({
      location: matchData.location,
      date: datePart,
      time: timePartRaw.slice(0, 5),
      playersPerTeam: clampPlayersPerTeam(Math.round(matchData.max_players / 2)),
      fieldCost: initialFieldCost,
    });

    setEditFieldCostInput(
      initialFieldCost > 0 ? formatCurrency(initialFieldCost) : "",
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

    setEditForm(prev => ({
      ...prev,
      [name]: name === "playersPerTeam" ? Number(value) : value,
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

    if (nextMaxPlayers < registrations.length) {
      setEditMessage(`No puedes reducir los cupos por debajo de los ${registrations.length} jugadores ya inscritos.`);
      return;
    }

    setEditLoading(true);
    setEditMessage(null);

    try {
      const nextLocation = editForm.location.trim();
      const nextDate = `${editForm.date}T${editForm.time}:00`;

      const { data, error } = await updateMatch(matchId, {
        title: `Partido en ${nextLocation}`,
        location: nextLocation,
        date: nextDate,
        max_players: nextMaxPlayers,
      });

      if (error || !data) {
        throw error || new Error("No se pudieron guardar los cambios");
      }

      setMatchData(data as MatchData);
      setShowEditForm(false);
      setEditMessage("Partido actualizado correctamente.");

      setStoredMatchPricing((currentPricing) => {
        if (!currentPricing) {
          return currentPricing;
        }

        const nextFieldCost = editForm.fieldCost > 0 ? editForm.fieldCost : currentPricing.fieldCost;

        const updatedPricing: StoredMatchPricing = {
          ...currentPricing,
          fieldCost: nextFieldCost,
          playersPerTeam: selectedPlayersPerTeam,
          costPerPlayer: Math.round(nextFieldCost / nextMaxPlayers),
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
              };
            });
            localStorage.setItem("matches", JSON.stringify(nextMatches));
          }
        } catch (err) {
          console.error("Error updating match pricing in localStorage", err);
        }

        return updatedPricing;
      });
    } catch (err) {
      console.error("Error updating match:", err);
      setEditMessage("No se pudo actualizar el partido. Intenta nuevamente.");
    } finally {
      setEditLoading(false);
    }
  };

  const handleUnregisterClick = (registration: PlayerRegistration) => {
    setUnregisterTarget(registration);
    setShowUnregisterModal(true);
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

  const playersRemaining = Math.max(0, matchData.max_players - registrations.length);
  const registeredPercent = matchData.max_players > 0 ? Math.round((registrations.length / matchData.max_players) * 100) : 0;
  const maxGoalkeepers = Math.min(2, matchData.max_players);
  const maxFieldPlayers = Math.max(0, matchData.max_players - maxGoalkeepers);
  const goalkeepersCount = registrations.filter((registration) => registration.is_goalkeeper).length;
  const fieldPlayersCount = registrations.length - goalkeepersCount;
  const goalkeepersRemaining = Math.max(0, maxGoalkeepers - goalkeepersCount);
  const fieldPlayersRemaining = Math.max(0, maxFieldPlayers - fieldPlayersCount);
  const isCreator = Boolean(user && user.id === matchData.created_by);

  return (
    <div className="min-h-screen py-10 px-4 text-white">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-[hsl(220,18%,10%)] rounded-lg p-6 shadow border border-slate-800">
          <h1 className="text-3xl font-bold text-white">{matchData.title}</h1>
          <p className="mt-2 text-slate-300">Fecha: {formattedDate} - Hora: {formattedTime}</p>
          <p className="mt-2 text-slate-300">Ubicación: {matchData.location}</p>
          <p className="mt-2 text-slate-300">Jugadores: {registrations.length}/{matchData.max_players} ({registeredPercent}% completo)</p>
          {storedMatchPricing && (
            <div className="mt-4 grid gap-3 rounded border border-slate-700 bg-[hsl(220,16%,14%)] p-4 text-sm text-slate-200 sm:grid-cols-3">
              <div>
                <p className="text-slate-400">Valor de la cancha</p>
                <p className="mt-1 font-semibold text-white">{formatCurrency(storedMatchPricing.fieldCost)}</p>
              </div>
              <div>
                <p className="text-slate-400">Aporte por jugador</p>
                <p className="mt-1 font-semibold text-white">{formatCurrency(storedMatchPricing.costPerPlayer)}</p>
              </div>
              <div>
                <p className="text-slate-400">Formato</p>
                <p className="mt-1 font-semibold text-white">{storedMatchPricing.playersPerTeam} vs {storedMatchPricing.playersPerTeam}</p>
              </div>
            </div>
          )}
          {playersRemaining > 0 ? (
            <p className="mt-2 text-green-400">{playersRemaining} cupos libres</p>
          ) : (
            <p className="mt-2 text-red-400">Partido completo</p>
          )}
          {isCreator && !showEditForm && (
            <button
              type="button"
              onClick={() => {
                setShowEditForm(true);
                setEditMessage(null);
              }}
              className="mt-4 rounded border border-green-500/40 bg-green-500/20 px-4 py-2 font-semibold text-green-300 transition hover:bg-green-500/30"
            >
              Editar información del partido
            </button>
          )}
          {isCreator && !showEditForm && editMessage && (
            <p className={`mt-3 text-sm ${editMessage.includes("correctamente") ? "text-green-400" : "text-red-400"}`}>
              {editMessage}
            </p>
          )}
        </div>

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
                  <label htmlFor="edit-date" className="mb-2 block text-sm font-medium text-slate-200">
                    Fecha
                  </label>
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
                  <label htmlFor="edit-time" className="mb-2 block text-sm font-medium text-slate-200">
                    Hora
                  </label>
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
                <label htmlFor="edit-playersPerTeam" className="mb-2 block text-sm font-medium text-slate-200">
                  Jugadores por equipo
                </label>
                <select
                  id="edit-playersPerTeam"
                  name="playersPerTeam"
                  value={editForm.playersPerTeam}
                  onChange={handleEditInputChange}
                  className="w-full rounded border border-slate-700 bg-[hsl(220,16%,14%)] px-4 py-3 text-white"
                >
                  {PLAYER_OPTIONS.map((num) => (
                    <option key={num} value={num}>
                      {num} vs {num}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="edit-fieldCost" className="mb-2 block text-sm font-medium text-slate-200">
                  Valor de la Cancha ($)
                </label>
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
                {editForm.fieldCost > 0 && (
                  <p className="mt-1 text-xs text-slate-400">
                    Aporte por jugador:{" "}
                    <span className="font-semibold text-white">
                      {formatCurrency(Math.round(editForm.fieldCost / (editForm.playersPerTeam * 2)))}
                    </span>
                  </p>
                )}
              </div>

              {editMessage && (
                <p className={`text-sm ${editMessage.includes("correctamente") ? "text-green-400" : "text-red-400"}`}>
                  {editMessage}
                </p>
              )}

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded bg-green-500 px-4 py-2 font-semibold text-white transition hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={editLoading}
                >
                  {editLoading ? "Guardando..." : "Guardar cambios"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(false);
                    setEditMessage(null);
                  }}
                  className="flex-1 rounded bg-slate-700 px-4 py-2 text-white transition hover:bg-slate-800"
                  disabled={editLoading}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Registration Section */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="bg-[hsl(220,18%,10%)] rounded-lg p-6 shadow border border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-4">Inscribirme al partido</h2>
            <p className="text-slate-300 mb-4">Deja tu nombre y elige si vienes como portero.</p>
            <div className="mb-4 rounded border border-slate-700 bg-[hsl(220,16%,14%)] p-3 text-sm text-slate-300">
              <p>Jugadores de campo: {fieldPlayersCount}/{maxFieldPlayers}</p>
              <p>Arqueros: {goalkeepersCount}/{maxGoalkeepers}</p>
              <p className="mt-1 text-green-400">Cupos disponibles para arqueros: {goalkeepersRemaining}</p>
            </div>

            {registrationMessage && (
              <div className={`mb-4 p-3 rounded text-sm ${
                registrationMessage.includes("exitosamente")
                  ? "bg-green-900 text-green-200"
                  : "bg-red-900 text-red-200"
              }`}>
                {registrationMessage}
              </div>
            )}

            {!showRegistrationForm ? (
              <button
                onClick={() => setShowRegistrationForm(true)}
                className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition"
                disabled={registrations.length >= matchData.max_players}
              >
                {registrations.length >= matchData.max_players ? "Partido completo" : "Inscribirme"}
              </button>
            ) : (
              <form onSubmit={handleRegistrationSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">Nombre completo</label>
                  <input
                    type="text"
                    name="name"
                    value={registrationForm.name}
                    onChange={handleInputChange}
                    className="w-full rounded border border-slate-700 bg-[hsl(220,16%,14%)] px-4 py-3 text-white"
                    placeholder="Ingresa tu nombre"
                    required
                  />
                </div>

                <div className="flex items-center gap-3 rounded border border-slate-700 bg-[hsl(220,16%,14%)] p-4">
                  <input
                    type="checkbox"
                    name="isGoalkeeper"
                    checked={registrationForm.isGoalkeeper}
                    onChange={handleCheckboxChange}
                    className="h-5 w-5"
                    disabled={goalkeepersRemaining <= 0}
                  />
                  <label className="text-sm text-slate-200">Me registro como portero</label>
                </div>
                {goalkeepersRemaining <= 0 && (
                  <p className="text-xs text-amber-400">Ya se completaron los 2 cupos de arqueros.</p>
                )}
                {!registrationForm.isGoalkeeper && fieldPlayersRemaining <= 0 && goalkeepersRemaining > 0 && (
                  <p className="text-xs text-amber-400">
                    Los cupos de jugadores de campo están completos. Solo quedan cupos para arqueros.
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600 transition font-semibold"
                    disabled={
                      registrationLoading ||
                      registrations.length >= matchData.max_players ||
                      (registrationForm.isGoalkeeper && goalkeepersRemaining <= 0) ||
                      (!registrationForm.isGoalkeeper && fieldPlayersRemaining <= 0)
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
                    className="flex-1 bg-slate-700 text-white py-2 px-4 rounded hover:bg-slate-800 transition"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="bg-[hsl(220,18%,10%)] rounded-lg p-6 shadow border border-slate-800">
            <h2 className="text-2xl font-bold text-white mb-4">Jugadores inscritos ({registrations.length})</h2>
            <div className="space-y-2">
              {registrations.map((registration) => (
                <div key={registration.id} className="flex justify-between items-center p-3 bg-[hsl(220,16%,14%)] rounded hover:bg-[hsl(220,16%,18%)] transition border border-slate-700">
                  <div className="flex-1">
                    <span className="font-medium text-white block">{registration.name}</span>
                    <span className="text-sm text-slate-400">
                      {registration.is_goalkeeper ? "🥅 Portero" : "⚽ Jugador de campo"}
                    </span>
                  </div>
                  <button
                    onClick={() => handleUnregisterClick(registration)}
                    className="ml-4 p-2 text-red-400 hover:text-red-300 hover:bg-red-900/30 rounded transition"
                    title="Darse de baja"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
              {registrations.length === 0 && (
                <p className="text-slate-400 text-center py-4">Aún no hay jugadores inscritos</p>
              )}
            </div>
          </div>
        </div>

        {/* Unregister Modal */}
        {showUnregisterModal && unregisterTarget && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-[hsl(220,18%,10%)] rounded-lg p-6 max-w-sm w-full border border-slate-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-red-900/30 rounded-full">
                  <Trash2 className="text-red-400" size={24} />
                </div>
                <h3 className="text-xl font-bold text-white">Confirmar baja</h3>
              </div>
              <p className="text-slate-300 mb-6">
                ¿Estás seguro de que deseas darte de baja de este partido?
                <br />
                <span className="font-semibold text-white mt-2 block">{unregisterTarget.name}</span>
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowUnregisterModal(false);
                    setUnregisterTarget(null);
                  }}
                  className="flex-1 bg-slate-700 text-white py-2 px-4 rounded hover:bg-slate-800 transition"
                  disabled={unregisterLoading}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUnregister}
                  className="flex-1 bg-green-500 text-white py-3 px-4 rounded hover:bg-green-600 transition flex items-center justify-center gap-2 whitespace-nowrap text-base font-semibold"
                  disabled={unregisterLoading}
                >
                  {unregisterLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white flex-shrink-0"></div>
                      <span>Dando de baja...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={18} className="flex-shrink-0" />
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

