"use client";

import { useState, useCallback } from "react";
import { useMatchDetailsContext, type PlayerRegistration } from "@/contexts/MatchDetailsContext";
import { useMatches } from "@/hooks/useMatches";

interface RegistrationForm {
  name: string;
  isGoalkeeper: boolean;
}

interface UseMatchRegistrationReturn {
  form: RegistrationForm;
  loading: boolean;
  message: string | null;
  showForm: boolean;
  setShowForm: (show: boolean) => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCheckboxChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  resetForm: () => void;
}

export function useMatchRegistration(): UseMatchRegistrationReturn {
  const { matchId } = useMatchDetailsContext();
  const { registerForMatch } = useMatches();

  const [form, setForm] = useState<RegistrationForm>({ name: "", isGoalkeeper: false });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleCheckboxChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: checked }));
  }, []);

  const resetForm = useCallback(() => {
    setForm({ name: "", isGoalkeeper: false });
    setMessage(null);
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = form.name.trim();

    if (!trimmedName) {
      setMessage("Ingresa tu nombre para continuar.");
      return;
    }
    if (trimmedName.length < 2) {
      setMessage("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    if (trimmedName.length > 100) {
      setMessage("El nombre no puede superar los 100 caracteres.");
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await registerForMatch(matchId, trimmedName, form.isGoalkeeper);

      if (error) {
        const errorMessage = error instanceof Error ? error.message : typeof error === "string" ? error : "Error al registrarte. Inténtalo de nuevo.";
        setMessage(errorMessage);
      } else if (data) {
        setMessage("¡Te has registrado exitosamente!");
        resetForm();
        setShowForm(false);
      }
    } catch {
      setMessage("Error al registrarte. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }, [form, matchId, registerForMatch, resetForm, setShowForm]);

  return {
    form,
    loading,
    message,
    showForm,
    setShowForm,
    handleInputChange,
    handleCheckboxChange,
    handleSubmit,
    resetForm,
  };
}

interface UseMatchUnregisterReturn {
  showModal: boolean;
  target: PlayerRegistration | null;
  loading: boolean;
  openModal: (registration: PlayerRegistration) => void;
  closeModal: () => void;
  handleUnregister: () => Promise<void>;
}

export function useMatchUnregister(): UseMatchUnregisterReturn {
  const _matchId = useMatchDetailsContext().matchId;
  const { unregisterFromMatch } = useMatches();

  const [showModal, setShowModal] = useState(false);
  const [target, setTarget] = useState<PlayerRegistration | null>(null);
  const [loading, setLoading] = useState(false);

  const openModal = useCallback((registration: PlayerRegistration) => {
    setTarget(registration);
    setShowModal(true);
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
        closeModal();
      }
    } finally {
      setLoading(false);
    }
  }, [target, unregisterFromMatch, closeModal]);

  return {
    showModal,
    target,
    loading,
    openModal,
    closeModal,
    handleUnregister,
  };
}