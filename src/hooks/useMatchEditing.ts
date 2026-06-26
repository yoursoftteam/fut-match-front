"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useMatchDetailsContext } from "@/contexts/MatchDetailsContext";
import { useMatches } from "@/hooks/useMatches";
import { formatCurrency } from "@/lib/currency";
import { getMatchTitleFromLocation } from "@/lib/match-title";
import { combineLocalDateAndTime, getLocalDateInputValue, getLocalTimeInputValue } from "@/lib/date-utils";

export interface MatchEditFormData {
  location: string;
  date: string;
  time: string;
  playersPerTeam: number;
  fieldCost: number;
  hasRentedGoalkeepers: boolean;
  rentedGoalkeepersCount: number;
  rentalCost: number;
  rules: string;
}

export interface UseMatchEditingReturn {
  showForm: boolean;
  loading: boolean;
  message: string | null;
  form: MatchEditFormData;
  fieldCostInput: string;
  rentalCostInput: string;
  openForm: () => void;
  closeForm: () => void;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  setFieldValue: (name: string, value: string | boolean | number) => void;
}

const PLAYER_OPTIONS = [6, 7, 8, 9, 10, 11] as const;
const MAX_SUBSTITUTE_SLOTS = 10;

function clampPlayersPerTeam(value: number): number {
  if (value < PLAYER_OPTIONS[0]) return PLAYER_OPTIONS[0];
  if (value > PLAYER_OPTIONS[PLAYER_OPTIONS.length - 1]) return PLAYER_OPTIONS[PLAYER_OPTIONS.length - 1];
  return value;
}

function formatCurrencyInput(value: string, ref: React.RefObject<HTMLInputElement | null>): { formatted: string; numeric: number } {
  const selectionStart = ref.current?.selectionStart ?? value.length;
  const digitsBeforeCursor = value.slice(0, selectionStart).replace(/\D/g, "").length;
  const numericValue = value.replace(/\D/g, "");
  const formattedValue = numericValue === "" ? "" : formatCurrency(Number(numericValue));

  requestAnimationFrame(() => {
    if (!ref.current) return;
    let digitsSeen = 0;
    let nextPos = formattedValue.length;
    for (let i = 0; i < formattedValue.length; i += 1) {
      if (/\d/.test(formattedValue[i])) digitsSeen += 1;
      if (digitsSeen >= Math.min(digitsBeforeCursor, numericValue.length)) { nextPos = i + 1; break; }
    }
    ref.current.setSelectionRange(nextPos, nextPos);
  });

  return { formatted: formattedValue, numeric: numericValue === "" ? 0 : Number(numericValue) };
}

export function useMatchEditing(): UseMatchEditingReturn {
  const { matchId, matchData, registrations, isCreator, setMatchData } = useMatchDetailsContext();
  const { updateMatch, registerRentedGoalkeepers } = useMatches();

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState<MatchEditFormData>({
    location: "",
    date: "",
    time: "",
    playersPerTeam: PLAYER_OPTIONS[0],
    fieldCost: 0,
    hasRentedGoalkeepers: false,
    rentedGoalkeepersCount: 1,
    rentalCost: 0,
    rules: "",
  });
  const [fieldCostInput, setFieldCostInput] = useState("");
  const [rentalCostInput, setRentalCostInput] = useState("");
  const fieldCostRef = useRef<HTMLInputElement>(null);
  const rentalCostRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!matchData) return;

    setForm({
      location: matchData.location,
      date: getLocalDateInputValue(matchData.date),
      time: getLocalTimeInputValue(matchData.date),
      playersPerTeam: clampPlayersPerTeam(Math.round(matchData.max_players / 2)),
      fieldCost: matchData.field_cost,
      hasRentedGoalkeepers: matchData.has_rented_goalkeepers,
      rentedGoalkeepersCount: matchData.rented_goalkeepers_count || 1,
      rentalCost: matchData.rental_cost,
      rules: matchData.rules || "",
    });
    setFieldCostInput(matchData.field_cost > 0 ? formatCurrency(matchData.field_cost) : "");
    setRentalCostInput(matchData.rental_cost > 0 ? formatCurrency(matchData.rental_cost) : "");
  }, [matchData]);

  const openForm = useCallback(() => {
    setShowForm(true);
    setMessage(null);
    setLoading(false);
  }, []);

  const closeForm = useCallback(() => {
    setShowForm(false);
    setMessage(null);
  }, []);

  const setFieldValue = useCallback((name: string, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === "fieldCost") {
      const { formatted, numeric } = formatCurrencyInput(value, fieldCostRef);
      setFieldCostInput(formatted);
      setForm((prev) => ({ ...prev, fieldCost: numeric }));
      return;
    }

    if (name === "rentalCost") {
      const { formatted, numeric } = formatCurrencyInput(value, rentalCostRef);
      setRentalCostInput(formatted);
      setForm((prev) => ({ ...prev, rentalCost: numeric }));
      return;
    }

    if (name === "hasRentedGoalkeepers") {
      setForm((prev) => ({ ...prev, [name]: e.target instanceof HTMLInputElement && e.target.checked }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]: name === "playersPerTeam" || name === "rentedGoalkeepersCount" ? Number(value) : value,
    }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!matchData || !isCreator) {
      setMessage("Solo el creador del partido puede editar esta información.");
      return;
    }

    if (!form.location.trim() || !form.date || !form.time) {
      setMessage("Completa todos los campos para guardar los cambios.");
      return;
    }

    const selectedPlayersPerTeam = clampPlayersPerTeam(form.playersPerTeam);
    const nextMaxPlayers = selectedPlayersPerTeam * 2;
    const nextTotalCapacity = nextMaxPlayers + MAX_SUBSTITUTE_SLOTS;

    if (registrations.length > nextTotalCapacity) {
      setMessage(`No puedes reducir el formato a ${selectedPlayersPerTeam} vs ${selectedPlayersPerTeam} porque hay ${registrations.length} inscritos y el nuevo límite total sería ${nextTotalCapacity} (incluyendo suplentes).`);
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const nextLocation = form.location.trim();
      const nextDate = combineLocalDateAndTime(form.date, form.time);

      const { data, error } = await updateMatch(matchId, {
        title: getMatchTitleFromLocation(nextLocation),
        location: nextLocation,
        date: nextDate,
        max_players: nextMaxPlayers,
        field_cost: form.fieldCost,
        rental_cost: form.hasRentedGoalkeepers ? form.rentalCost : 0,
        has_rented_goalkeepers: form.hasRentedGoalkeepers,
        rented_goalkeepers_count: form.rentedGoalkeepersCount,
        players_per_team: selectedPlayersPerTeam,
        rules: form.rules || null,
      });

      if (error || !data) {
        throw error || new Error("No se pudieron guardar los cambios");
      }

      setMatchData(data as typeof matchData);

      if (form.hasRentedGoalkeepers && form.rentedGoalkeepersCount > 0) {
        await registerRentedGoalkeepers(matchId, form.rentedGoalkeepersCount);
      } else {
        await registerRentedGoalkeepers(matchId, 0);
      }

      setMessage("✓ ¡Partido actualizado correctamente!");
      setTimeout(() => { setShowForm(false); setMessage(null); }, 1500);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "No se pudo actualizar el partido. Intenta nuevamente.";
      setMessage(`❌ ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [form, matchData, isCreator, registrations.length, matchId, updateMatch, registerRentedGoalkeepers, setMatchData]);

  return { showForm, loading, message, form, fieldCostInput, rentalCostInput, openForm, closeForm, handleInputChange, handleSubmit, setFieldValue };
}
