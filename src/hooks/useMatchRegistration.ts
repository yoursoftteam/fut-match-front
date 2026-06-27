"use client";

import { useState, useCallback, useEffect } from "react";
import { useMatchDetailsContext, type PlayerRegistration } from "@/contexts/MatchDetailsContext";
import { useMatches } from "@/hooks/useMatches";

const SELF_UNREGISTER_STORAGE_PREFIX = "parti2:self-unregister:";
const SELF_UNREGISTER_CHANGED_EVENT = "self-unregister:changed";
const LEGACY_SELF_UNREGISTER_TOKEN = "__legacy_delete__";

function isLegacySelfUnregisterToken(token: string): boolean {
  return token === LEGACY_SELF_UNREGISTER_TOKEN;
}

interface SelfUnregisterRecord {
  registrationId: string;
  token: string;
  name: string;
}

function getStorageKey(matchId: string): string {
  return `${SELF_UNREGISTER_STORAGE_PREFIX}${matchId}`;
}

function readSelfUnregisterRecords(matchId: string): SelfUnregisterRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(getStorageKey(matchId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is SelfUnregisterRecord => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Partial<SelfUnregisterRecord>;
      return (
        typeof candidate.registrationId === "string" &&
        typeof candidate.token === "string" &&
        typeof candidate.name === "string"
      );
    });
  } catch {
    return [];
  }
}

function writeSelfUnregisterRecords(matchId: string, records: SelfUnregisterRecord[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(getStorageKey(matchId), JSON.stringify(records));
  window.dispatchEvent(
    new CustomEvent(SELF_UNREGISTER_CHANGED_EVENT, { detail: { matchId } }),
  );
}

export function saveSelfUnregisterRecord(
  matchId: string,
  registrationId: string,
  token: string,
  name: string,
) {
  const current = readSelfUnregisterRecords(matchId).filter(
    (record) => record.registrationId !== registrationId,
  );

  current.push({ registrationId, token, name });
  writeSelfUnregisterRecords(matchId, current);
}

export function removeSelfUnregisterRecord(matchId: string, registrationId: string) {
  const next = readSelfUnregisterRecords(matchId).filter(
    (record) => record.registrationId !== registrationId,
  );

  writeSelfUnregisterRecords(matchId, next);
}

function getSelfUnregisterToken(matchId: string, registrationId: string): string | null {
  const normalizedRegistrationId = registrationId.trim().toLowerCase();
  const record = readSelfUnregisterRecords(matchId).find(
    (item) => item.registrationId.trim().toLowerCase() === normalizedRegistrationId,
  );

  return record?.token ?? null;
}

interface RegistrationEntry {
  id: string;
  name: string;
  isGoalkeeper: boolean;
  position: string;
}

interface UseMatchRegistrationReturn {
  entries: RegistrationEntry[];
  loading: boolean;
  message: string | null;
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  addEntry: (afterEntryId?: string) => void;
  removeEntry: (entryId: string) => void;
  updateEntryName: (entryId: string, value: string) => void;
  updateEntryGoalkeeper: (entryId: string, isGoalkeeper: boolean) => void;
  updateEntryPosition: (entryId: string, value: string) => void;
  handleSubmit: (e: React.FormEvent) => Promise<boolean>;
  handleEntryKeyDown: (e: React.KeyboardEvent<HTMLInputElement>, entryId: string) => void;
  resetForm: () => void;
}

function createRegistrationEntry(): RegistrationEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    name: "",
    isGoalkeeper: false,
    position: "",
  };
}

export function useMatchRegistration(): UseMatchRegistrationReturn {
  const { matchId, refreshRegistrations } = useMatchDetailsContext();
  const { registerForMatch } = useMatches();

  const [entries, setEntries] = useState<RegistrationEntry[]>([createRegistrationEntry()]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => {
      setMessage(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message]);

  const addEntry = useCallback((afterEntryId?: string) => {
    setEntries((prev) => {
      const nextEntry = createRegistrationEntry();

      if (!afterEntryId) {
        return [...prev, nextEntry];
      }

      const idx = prev.findIndex((entry) => entry.id === afterEntryId);
      if (idx === -1) {
        return [...prev, nextEntry];
      }

      return [...prev.slice(0, idx + 1), nextEntry, ...prev.slice(idx + 1)];
    });
  }, []);

  const removeEntry = useCallback((entryId: string) => {
    setEntries((prev) => {
      if (prev.length === 1) {
        return [createRegistrationEntry()];
      }

      return prev.filter((entry) => entry.id !== entryId);
    });
  }, []);

  const updateEntryName = useCallback((entryId: string, value: string) => {
    setEntries((prev) => prev.map((entry) => (
      entry.id === entryId ? { ...entry, name: value } : entry
    )));
  }, []);

  const updateEntryGoalkeeper = useCallback((entryId: string, isGoalkeeper: boolean) => {
    setEntries((prev) => prev.map((entry) => (
      entry.id === entryId ? { ...entry, isGoalkeeper } : entry
    )));
  }, []);

  const updateEntryPosition = useCallback((entryId: string, value: string) => {
    setEntries((prev) => prev.map((entry) => (
      entry.id === entryId ? { ...entry, position: value } : entry
    )));
  }, []);

  const handleEntryKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, entryId: string) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    addEntry(entryId);
  }, [addEntry]);

  const normalizeEntries = useCallback(() => (
    entries
      .map((entry) => ({ ...entry, name: entry.name.trim() }))
      .filter((entry) => entry.name.length > 0)
  ), [entries]);

  const validateEntries = useCallback((items: RegistrationEntry[]): string | null => {
    if (items.length === 0) {
      return "Ingresa al menos un nombre para continuar.";
    }

    const invalidMin = items.find((entry) => entry.name.length < 2);
    if (invalidMin) {
      return "Cada nombre debe tener al menos 2 caracteres.";
    }

    const invalidMax = items.find((entry) => entry.name.length > 100);
    if (invalidMax) {
      return "Ningún nombre puede superar los 100 caracteres.";
    }

    return null;
  }, []);

  const resetForm = useCallback(() => {
    setEntries([createRegistrationEntry()]);
    setMessage(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    // Sync first to avoid using stale capacity state in the UI.
    await refreshRegistrations();

    const normalizedEntries = normalizeEntries();
    const validationError = validateEntries(normalizedEntries);
    if (validationError) {
      setMessage(validationError);
      return false;
    }

    setLoading(true);
    setMessage(null);

    try {
      let successCount = 0;
      const failed: Array<{ name: string; isGoalkeeper: boolean; reason: string }> = [];

      for (const entry of normalizedEntries) {
        const { data, error, selfUnregisterToken, selfUnregisterAvailable } = await registerForMatch(
          matchId,
          entry.name,
          entry.isGoalkeeper,
          entry.position ? { position: entry.position } : undefined,
        );

        if (error || !data) {
          const reason =
            error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : "Error al registrar.";
          failed.push({
            name: entry.name,
            isGoalkeeper: entry.isGoalkeeper,
            reason,
          });
          continue;
        }

        if (selfUnregisterAvailable && selfUnregisterToken) {
          saveSelfUnregisterRecord(matchId, data.id, selfUnregisterToken, data.name);
        } else {
          saveSelfUnregisterRecord(matchId, data.id, LEGACY_SELF_UNREGISTER_TOKEN, data.name);
        }

        successCount += 1;
      }

      if (failed.length === 0) {
        setMessage(successCount === 1 ? "¡Jugador inscrito exitosamente!" : `¡${successCount} jugadores inscritos exitosamente!`);
        resetForm();
        setShowForm(false);
        return true;
      }

      const failedNames = failed.map((item) => item.name).join(", ");
      const firstFailureReason = failed[0]?.reason;
      const fullCapacityFailure = failed.find((item) =>
        /no hay cupos disponibles|cupos.*complet|suplente/i.test(item.reason),
      );

      if (successCount > 0) {
        setMessage(
          `${successCount} inscritos. Fallaron ${failed.length}: ${failedNames}. ${firstFailureReason ?? ""}`.trim(),
        );
      } else {
        setMessage(
          fullCapacityFailure?.reason
            ? `No se pudo registrar: ${fullCapacityFailure.reason}`
            : `No se pudo registrar: ${failedNames}. ${firstFailureReason ?? ""}`.trim(),
        );
      }

      setEntries(failed.map((item) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        name: item.name,
        isGoalkeeper: item.isGoalkeeper,
        position: '',
      })));
      return successCount > 0;
    } catch {
      setMessage("Error al registrarte. Inténtalo de nuevo.");
      return false;
    } finally {
      await refreshRegistrations();
      setLoading(false);
    }
  }, [matchId, normalizeEntries, refreshRegistrations, registerForMatch, resetForm, validateEntries]);

  return {
    entries,
    loading,
    message,
    showForm,
    setShowForm,
    addEntry,
    removeEntry,
    updateEntryName,
    updateEntryGoalkeeper,
    updateEntryPosition,
    handleSubmit,
    handleEntryKeyDown,
    resetForm,
  };
}

interface UseMatchUnregisterReturn {
  showModal: boolean;
  target: PlayerRegistration | null;
  loading: boolean;
  message: string | null;
  openModal: (registration: PlayerRegistration) => void;
  closeModal: () => void;
  handleUnregister: () => Promise<void>;
}

export function useMatchUnregister(): UseMatchUnregisterReturn {
  const { refreshRegistrations } = useMatchDetailsContext();
  const { unregisterFromMatch } = useMatches();

  const [showModal, setShowModal] = useState(false);
  const [target, setTarget] = useState<PlayerRegistration | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;

    const timeoutId = window.setTimeout(() => {
      setMessage(null);
    }, 3000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [message]);

  const openModal = useCallback((registration: PlayerRegistration) => {
    setTarget(registration);
    setShowModal(true);
    setMessage(null);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setTarget(null);
  }, []);

  const handleUnregister = useCallback(async () => {
    if (!target) return;

    setLoading(true);
    try {
      const { error } = await unregisterFromMatch(target.id);
      if (!error) {
        await refreshRegistrations();
        closeModal();
        setMessage("Jugador eliminado correctamente.");
      } else {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "No se pudo eliminar al jugador. Inténtalo de nuevo.";
        setMessage(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  }, [target, unregisterFromMatch, refreshRegistrations, closeModal]);

  return {
    showModal,
    target,
    loading,
    message,
    openModal,
    closeModal,
    handleUnregister,
  };
}

interface UseSelfMatchUnregisterReturn {
  showModal: boolean;
  target: PlayerRegistration | null;
  loading: boolean;
  message: string | null;
  canSelfUnregister: (registrationId: string) => boolean;
  openModal: (registration: PlayerRegistration) => void;
  closeModal: () => void;
  handleUnregister: () => Promise<void>;
}

export function useSelfMatchUnregister(): UseSelfMatchUnregisterReturn {
  const { matchId } = useMatchDetailsContext();
  const { unregisterSelfFromMatch, unregisterFromMatch } = useMatches();

  const [showModal, setShowModal] = useState(false);
  const [target, setTarget] = useState<PlayerRegistration | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [records, setRecords] = useState<SelfUnregisterRecord[]>([]);

  useEffect(() => {
    const syncRecords = () => {
      setRecords(readSelfUnregisterRecords(matchId));
    };

    syncRecords();

    const onLocalChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ matchId?: string }>;
      if (!customEvent.detail?.matchId || customEvent.detail.matchId === matchId) {
        syncRecords();
      }
    };

    window.addEventListener(SELF_UNREGISTER_CHANGED_EVENT, onLocalChange as EventListener);
    window.addEventListener("storage", syncRecords);

    return () => {
      window.removeEventListener(SELF_UNREGISTER_CHANGED_EVENT, onLocalChange as EventListener);
      window.removeEventListener("storage", syncRecords);
    };
  }, [matchId]);

  const canSelfUnregister = useCallback(
    (registrationId: string) => {
      const normalizedRegistrationId = registrationId.trim().toLowerCase();
      return records.some(
        (item) => item.registrationId.trim().toLowerCase() === normalizedRegistrationId,
      );
    },
    [records],
  );

  const openModal = useCallback((registration: PlayerRegistration) => {
    if (!canSelfUnregister(registration.id)) return;
    setTarget(registration);
    setShowModal(true);
    setMessage(null);
  }, [canSelfUnregister]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setTarget(null);
  }, []);

  const handleUnregister = useCallback(async () => {
    if (!target) return;

    const normalizedRegistrationId = target.id.trim().toLowerCase();
    const token =
      records.find((item) => item.registrationId.trim().toLowerCase() === normalizedRegistrationId)?.token ??
      getSelfUnregisterToken(matchId, target.id);

    if (!token) {
      setMessage("No pudimos validar tu auto-baja desde este dispositivo.");
      closeModal();
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { error } = isLegacySelfUnregisterToken(token)
        ? await unregisterFromMatch(target.id)
        : await unregisterSelfFromMatch(target.id, token);

      if (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "No se pudo completar la auto-baja. Inténtalo de nuevo.";
        setMessage(errorMessage);
        return;
      }

      removeSelfUnregisterRecord(matchId, target.id);
      closeModal();
      setMessage("Te diste de baja correctamente.");
    } finally {
      setLoading(false);
    }
  }, [closeModal, matchId, records, target, unregisterFromMatch, unregisterSelfFromMatch]);

  return {
    showModal,
    target,
    loading,
    message,
    canSelfUnregister,
    openModal,
    closeModal,
    handleUnregister,
  };
}