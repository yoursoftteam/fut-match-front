"use client";

import { useEffect, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useMatchDetailsContext } from "@/contexts/MatchDetailsContext";
import { useMatchRegistration, useMatchUnregister } from "@/hooks/useMatchRegistration";
import { useMatchPricing, MAX_SUBSTITUTE_SLOTS } from "@/hooks/useMatchPricing";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PaymentStatus } from "./PaymentStatus";
import { PaymentSummary } from "./PaymentSummary";

type PanelTab = "register" | "players" | "teams";

interface MatchTabsProps {
  activeTab: PanelTab;
  onTabChange: (tab: PanelTab) => void;
  onOpenTeams?: () => void;
}

export function MatchTabs({ activeTab, onTabChange, onOpenTeams }: MatchTabsProps) {
  const { isCreator } = useMatchDetailsContext();
  useMatchPricing();

  return (
    <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Secciones del partido">
      <button
        type="button"
        role="tab"
        id="tab-register"
        aria-selected={activeTab === "register"}
        aria-controls="panel-register"
        tabIndex={activeTab === "register" ? 0 : -1}
        onClick={() => onTabChange("register")}
        className={`rounded px-3 py-1.5 text-sm font-semibold transition ${activeTab === "register" ? "bg-green-600 text-white" : "bg-muted text-foreground border border-border hover:bg-secondary"}`}
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
        onClick={() => onTabChange("players")}
        className={`rounded px-3 py-1.5 text-sm font-semibold transition ${activeTab === "players" ? "bg-green-600 text-white" : "bg-muted text-foreground border border-border hover:bg-secondary"}`}
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
          onClick={onOpenTeams}
          className={`rounded px-3 py-1.5 text-sm font-semibold transition ${activeTab === "teams" ? "bg-blue-600 text-white" : "bg-muted text-foreground border border-border hover:bg-secondary"}`}
        >
          Equipos
        </button>
      )}
    </div>
  );
}

export function RegistrationPanel() {
  const { registrations, isCreator } = useMatchDetailsContext();
  const {
    entries,
    loading,
    message,
    showForm,
    setShowForm,
    addEntry,
    removeEntry,
    updateEntryName,
    updateEntryGoalkeeper,
    handleSubmit,
    handleEntryKeyDown,
    resetForm,
  } = useMatchRegistration();
  const { isTitularFull, isSubstituteFull, goalkeepersRemaining, maxGoalkeepers, maxFieldPlayers, goalkeepersCount, fieldPlayersCount } = useMatchPricing();
  const previousEntryIdsRef = useRef<string[]>([]);
  const totalGoalkeepersRegistered = registrations.filter((registration) => registration.is_goalkeeper).length;
  const selectedGoalkeepersInForm = entries.filter((entry) => entry.isGoalkeeper).length;
  const isGoalkeeperCheckboxDisabled = totalGoalkeepersRegistered >= maxGoalkeepers;
  const goalkeeperSelectionLimitReached = totalGoalkeepersRegistered + selectedGoalkeepersInForm >= maxGoalkeepers;

  useEffect(() => {
    if (!isGoalkeeperCheckboxDisabled) return;

    entries.forEach((entry) => {
      if (entry.isGoalkeeper) {
        updateEntryGoalkeeper(entry.id, false);
      }
    });
  }, [entries, isGoalkeeperCheckboxDisabled, updateEntryGoalkeeper]);

  useEffect(() => {
    const currentIds = entries.map((entry) => entry.id);
    const addedId = currentIds.find((id) => !previousEntryIdsRef.current.includes(id));

    if (addedId) {
      requestAnimationFrame(() => {
        const input = document.getElementById(`register-fullname-${addedId}`) as HTMLInputElement | null;
        input?.focus();
      });
    }

    previousEntryIdsRef.current = currentIds;
  }, [entries]);

  return (
    <div id="panel-register" role="tabpanel" aria-labelledby="tab-register">
      <h2 className="mb-2 text-xl font-bold text-foreground">Inscribirme al partido</h2>
      <p className="mb-4 text-sm text-muted-foreground">Puedes inscribir varios jugadores. Presiona Enter para crear otra fila.</p>
      {isCreator && (
        <div
          className={`mb-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${isGoalkeeperCheckboxDisabled ? "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40" : "bg-muted text-muted-foreground ring-1 ring-border"}`}
        >
          {isGoalkeeperCheckboxDisabled
            ? "Cupos de portero completos"
            : `Cupos de portero disponibles: ${Math.max(0, maxGoalkeepers - totalGoalkeepersRegistered)}`}
        </div>
      )}
      <div className="mb-4 rounded border border-border bg-muted p-3 text-sm text-muted-foreground">
        <p>Jugadores de campo: {fieldPlayersCount}/{maxFieldPlayers}</p>
        <p>Arqueros: {goalkeepersCount}/{maxGoalkeepers}</p>
        <p className="mt-1 text-green-400">Cupos disponibles para arqueros: {goalkeepersRemaining}</p>
        {isGoalkeeperCheckboxDisabled && (
          <p className="mt-1 text-amber-400">Ya se completaron los cupos de portero. El check está deshabilitado.</p>
        )}
      </div>

      {isTitularFull && !isSubstituteFull && (
        <div className="mb-4 rounded border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-300">
          Los cupos titulares ya están completos. Si te inscribes ahora, entrarás como suplente.
        </div>
      )}

      {isTitularFull && isSubstituteFull && (
        <div className="mb-4 rounded border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          Ya no hay cupos disponibles en este partido (ni titulares ni suplentes).
        </div>
      )}

      {message && (
        <div role="status" aria-live="polite" className={`mb-4 rounded p-3 text-sm ${message.includes("exitosamente") ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"}`}>
          {message}
        </div>
      )}

      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className={`w-full rounded py-2 px-4 font-semibold transition ${isTitularFull && !isSubstituteFull ? "bg-amber-500 text-foreground hover:bg-amber-600" : isTitularFull && isSubstituteFull ? "cursor-not-allowed bg-muted text-muted-foreground" : "bg-green-500 text-white hover:bg-green-600"}`}
          disabled={isTitularFull && isSubstituteFull}
        >
          {isTitularFull && isSubstituteFull ? "Sin cupos disponibles" : isTitularFull ? "Inscribirme como suplente" : "Inscribirme"}
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div key={entry.id} className="rounded border border-border bg-muted p-3">
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor={`register-fullname-${entry.id}`} className="text-sm font-medium text-foreground">
                    Jugador {index + 1}
                  </label>
                  <button
                    type="button"
                    onClick={() => removeEntry(entry.id)}
                    className="rounded p-1 text-red-400 transition hover:bg-red-900/30 hover:text-red-300"
                    aria-label={`Quitar jugador ${index + 1}`}
                    disabled={entries.length === 1}
                  >
                    <Trash2 size={14} aria-hidden />
                  </button>
                </div>

                <input
                  id={`register-fullname-${entry.id}`}
                  type="text"
                  autoComplete="name"
                  value={entry.name}
                  onChange={(e) => updateEntryName(entry.id, e.target.value)}
                  onKeyDown={(e) => handleEntryKeyDown(e, entry.id)}
                  className="w-full rounded border border-border bg-background px-4 py-3 text-foreground"
                  placeholder="Ingresa el nombre..."
                />

                <div className="mt-3 flex items-center gap-3">
                  <input
                    id={`register-gk-${entry.id}`}
                    type="checkbox"
                    checked={entry.isGoalkeeper}
                    onChange={(e) => updateEntryGoalkeeper(entry.id, e.target.checked)}
                    className="h-5 w-5"
                    disabled={isGoalkeeperCheckboxDisabled || (!entry.isGoalkeeper && goalkeeperSelectionLimitReached)}
                  />
                  <label htmlFor={`register-gk-${entry.id}`} className="text-sm text-foreground">
                    {isGoalkeeperCheckboxDisabled || (!entry.isGoalkeeper && goalkeeperSelectionLimitReached)
                      ? "Portero (ya se encuentran inscritos los porteros)"
                      : "Portero"}
                  </label>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={() => addEntry()}
              className="inline-flex items-center gap-2 rounded border border-dashed border-border bg-muted px-3 py-2 text-sm font-medium text-foreground transition hover:bg-secondary"
            >
              <Plus size={14} aria-hidden />
              Agregar jugador
            </button>
          </div>
          <div className="flex gap-3">
            <button
              type="submit"
              className={`flex-1 rounded py-2 px-4 font-semibold text-white transition ${isTitularFull && isSubstituteFull ? "cursor-not-allowed bg-muted text-muted-foreground" : "bg-green-500 hover:bg-green-600"}`}
              disabled={loading || (isTitularFull && isSubstituteFull)}
            >
              {loading ? "Registrando..." : "Confirmar inscripciones"}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm(); }}
              className="flex-1 rounded border border-border bg-muted py-2 px-4 font-medium text-foreground transition hover:bg-secondary"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export function PlayersPanel() {
  const { matchData, registrations, registrationsLoading, isCreator } = useMatchDetailsContext();
  const { showModal, target, loading, openModal, closeModal, handleUnregister, message } = useMatchUnregister();
  const { titulares, suplentes } = useMatchPricing();

  return (
    <>
    <div id="panel-players" role="tabpanel" aria-labelledby="tab-players">
      <h2 className="mb-3 text-xl font-bold text-foreground">Jugadores inscritos ({registrations.length})</h2>
      {message && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-3 rounded p-3 text-sm ${message.includes("correctamente") ? "bg-green-900 text-green-200" : "bg-red-900 text-red-200"}`}
        >
          {message}
        </div>
      )}
      <div className="max-h-[68vh] space-y-2 overflow-y-auto pr-1">
        {registrationsLoading && (
          <p className="py-4 text-center text-muted-foreground">Cargando inscritos…</p>
        )}
        {titulares.length > 0 && (
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-green-400">Titulares ({titulares.length}/{matchData?.max_players})</p>
        )}
        {titulares.map((registration, index) => (
          <div key={registration.id} className="flex items-center justify-between rounded border border-border bg-muted p-2.5 transition hover:bg-muted">
            <div className="flex-1">
              <span className="mr-2 text-xs text-muted-foreground">#{index + 1}</span>
              <span className="font-medium text-foreground">{registration.name}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{registration.is_goalkeeper ? "🥅 Portero" : "⚽ Jugador de campo"}</span>
            </div>
            <div className="ml-3 flex items-center gap-2">
              {isCreator && (
                <PaymentStatus 
                  registrationId={registration.id}
                  hasPaid={registration.has_paid}
                  name={registration.name}
                />
              )}
              <button
                type="button"
                onClick={() => openModal(registration)}
                className="rounded p-1.5 text-red-400 transition hover:bg-red-900/30 hover:text-red-300"
                title="Eliminar jugador"
                aria-label={`Eliminar a ${registration.name}`}
              >
                <Trash2 size={16} aria-hidden />
              </button>
            </div>
          </div>
        ))}

        {suplentes.length > 0 && (
          <>
            <p className="mt-4 mb-1 text-xs font-semibold uppercase tracking-wide text-amber-400">Suplentes ({suplentes.length}/{MAX_SUBSTITUTE_SLOTS})</p>
            {suplentes.map((registration, index) => (
              <div key={registration.id} className="flex items-center justify-between rounded border border-amber-800/40 bg-muted p-2.5 transition hover:bg-muted">
                <div className="flex-1">
                  <span className="mr-2 inline-flex items-center rounded bg-amber-900/50 px-1.5 py-0.5 text-xs text-amber-300">S{index + 1}</span>
                  <span className="font-medium text-foreground">{registration.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{registration.is_goalkeeper ? "🥅 Portero" : "⚽ Jugador de campo"}</span>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  {isCreator && (
                    <PaymentStatus 
                      registrationId={registration.id}
                      hasPaid={registration.has_paid}
                      name={registration.name}
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => openModal(registration)}
                    className="rounded p-1.5 text-red-400 transition hover:bg-red-900/30 hover:text-red-300"
                    title="Eliminar jugador"
                    aria-label={`Eliminar a ${registration.name}`}
                  >
                    <Trash2 size={16} aria-hidden />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}

        {!registrationsLoading && registrations.length === 0 && (
          <p className="py-4 text-center text-muted-foreground">Aún no hay jugadores inscritos</p>
        )}
      </div>
      
      {isCreator && (
        <div className="mt-4">
          <PaymentSummary />
        </div>
      )}
    </div>

    <ConfirmDialog
      open={showModal}
      title="Eliminar jugador"
      description={
        target ? (
          <>¿Eliminar a <strong className="text-foreground">{target.name}</strong> del partido? Esta acción no se puede deshacer.</>
        ) : null
      }
      confirmLabel="Sí, eliminar"
      cancelLabel="Cancelar"
      destructive
      loading={loading}
      onConfirm={handleUnregister}
      onCancel={closeModal}
    />
    </>
  );
}