"use client";

import { useEffect, useState } from "react";
import { useMatches } from "@/hooks/useMatches";
import { useMatchRegistrationsRealtime } from "@/hooks/useMatchRegistrationsRealtime";
import { useAuth } from "@/hooks/useAuth";
import { X, Trash2 } from "lucide-react";

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
  
  const { getMatchById, registerForMatch, unregisterFromMatch } = useMatches();
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
  }, [matchId]);

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

  return (
    <div className="min-h-screen bg-black py-10 px-4 text-white">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-[hsl(220,18%,10%)] rounded-lg p-6 shadow border border-slate-800">
          <h1 className="text-3xl font-bold text-white">{matchData.title}</h1>
          <p className="mt-2 text-slate-300">Fecha: {formattedDate} - Hora: {formattedTime}</p>
          <p className="mt-2 text-slate-300">Ubicación: {matchData.location}</p>
          <p className="mt-2 text-slate-300">Jugadores: {registrations.length}/{matchData.max_players} ({registeredPercent}% completo)</p>
          {playersRemaining > 0 ? (
            <p className="mt-2 text-green-400">{playersRemaining} cupos libres</p>
          ) : (
            <p className="mt-2 text-red-400">Partido completo</p>
          )}
        </div>

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

