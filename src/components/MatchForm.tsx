"use client";

import { useRef, useState } from "react";
import { formatCurrency } from "@/lib/currency";

interface MatchFormData {
  location: string;
  date: string;
  time: string;
  fieldCost: number;
  playersPerTeam: number;
}

export interface MatchFormSubmitData extends MatchFormData {
  totalPlayers: number;
  costPerPlayer: number;
}

interface MatchFormProps {
  onMatchCreate: (data: MatchFormSubmitData) => void;
  disabled?: boolean;
  submitLabel?: string;
  submitButtonType?: "button" | "submit";
  onSubmitButtonClick?: () => void;
}

const CURRENCY_PREFIX = "$ ";

function getDigitCount(value: string): number {
  return value.replace(/\D/g, "").length;
}

function getCursorPositionFromDigitCount(formattedValue: string, digitsBeforeCursor: number): number {
  if (formattedValue === "") {
    return 0;
  }

  if (digitsBeforeCursor <= 0) {
    return CURRENCY_PREFIX.length;
  }

  let digitsSeen = 0;

  for (let index = 0; index < formattedValue.length; index += 1) {
    if (/\d/.test(formattedValue[index])) {
      digitsSeen += 1;
    }

    if (digitsSeen >= digitsBeforeCursor) {
      return index + 1;
    }
  }

  return formattedValue.length;
}

export default function MatchForm({
  onMatchCreate,
  disabled = false,
  submitLabel = "Crear Partido",
  submitButtonType = "submit",
  onSubmitButtonClick,
}: MatchFormProps) {
  const [formData, setFormData] = useState<MatchFormData>({
    location: "",
    date: "",
    time: "",
    fieldCost: 0,
    playersPerTeam: 6,
  });
  const [fieldCostInput, setFieldCostInput] = useState("");
  const fieldCostInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Calculate cost per player (total players = playersPerTeam * 2)
    const totalPlayers = formData.playersPerTeam * 2;
    const costPerPlayer = Math.round(formData.fieldCost / totalPlayers);
    
    onMatchCreate({
      ...formData,
      totalPlayers,
      costPerPlayer,
    });
  };

  const totalPlayers = formData.playersPerTeam * 2;
  const costPerPlayer = formData.fieldCost > 0 ? Math.round(formData.fieldCost / totalPlayers) : 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

    if (name === "fieldCost") {
      const selectionStart = e.target instanceof HTMLInputElement
        ? e.target.selectionStart ?? value.length
        : value.length;
      const digitsBeforeCursor = getDigitCount(value.slice(0, selectionStart));
      const numericValue = value.replace(/\D/g, "");
      const formattedValue = numericValue === "" ? "" : formatCurrency(Number(numericValue));

      setFieldCostInput(formattedValue);
      setFormData(prev => ({
        ...prev,
        fieldCost: numericValue === "" ? 0 : Number(numericValue),
      }));

      requestAnimationFrame(() => {
        const input = fieldCostInputRef.current;

        if (!input) {
          return;
        }

        const nextCursorPosition = getCursorPositionFromDigitCount(
          formattedValue,
          Math.min(digitsBeforeCursor, numericValue.length),
        );

        input.setSelectionRange(nextCursorPosition, nextCursorPosition);
      });

      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: name === "playersPerTeam" ? Number(value) : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="card p-6 w-full max-w-md slide-in-left">
      <h2 className="text-2xl font-bold mb-6 text-center text-text-primary">Crear Partido</h2>
      
      <div className="form-group">
        <label htmlFor="location" className="form-label">
          Lugar del Partido
        </label>
        <input
          type="text"
          id="location"
          name="location"
          value={formData.location}
          onChange={handleChange}
          className="form-input"
          placeholder="Ej: Cancha Central"
          required
        />
        <p className="form-help-text">Ingrese el nombre o dirección del lugar donde se jugará el partido</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="form-group">
          <label htmlFor="date" className="form-label">
            Fecha
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="time" className="form-label">
            Hora
          </label>
          <input
            type="time"
            id="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            className="form-input"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="fieldCost" className="form-label">
          Valor de la Cancha ($)
        </label>
        <input
          type="text"
          id="fieldCost"
          name="fieldCost"
          ref={fieldCostInputRef}
          value={fieldCostInput}
          onChange={handleChange}
          inputMode="numeric"
          autoComplete="off"
          className="form-input"
          placeholder="Ej: $ 200.000"
          required
        />
        <p className="form-help-text">Ingrese el costo total de alquiler de la cancha</p>
      </div>

      <div className="form-group">
        <label htmlFor="playersPerTeam" className="form-label">
          Jugadores por Equipo
        </label>
        <select
          id="playersPerTeam"
          name="playersPerTeam"
          value={formData.playersPerTeam}
          onChange={handleChange}
          className="form-input"
        >
          {[6, 7, 8, 9, 10, 11].map(num => (
            <option key={num} value={num}>
              {num} vs {num}
            </option>
          ))}
        </select>
        <p className="form-help-text">Seleccione la cantidad de jugadores por equipo</p>
      </div>

      {formData.fieldCost > 0 && (
        <div className="bg-muted/50 p-4 rounded-lg border border-border">
          <h3 className="font-semibold text-card-foreground mb-2">Resumen del Costo</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor de la cancha:</span>
              <span className="font-medium">{formatCurrency(formData.fieldCost)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Formato:</span>
              <span className="font-medium">{formData.playersPerTeam} vs {formData.playersPerTeam}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total de jugadores:</span>
              <span className="font-medium">{totalPlayers}</span>
            </div>
            <div className="flex justify-between border-t border-border pt-2 mt-2">
              <span className="text-card-foreground font-semibold">Aporte por jugador:</span>
              <span className="font-bold text-primary text-lg">{formatCurrency(costPerPlayer)}</span>
            </div>
          </div>
        </div>
      )}

      <button
        type={submitButtonType}
        className="btn btn-primary-fm neon-glow w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
        onClick={onSubmitButtonClick}
      >
        {submitLabel}
      </button>
    </form>
  );
}