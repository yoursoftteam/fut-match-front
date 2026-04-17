"use client";

import { useState } from "react";

interface MatchFormData {
  location: string;
  date: string;
  time: string;
  fieldCost: number;
  playersPerTeam: number;
}

export default function MatchForm({ onMatchCreate, disabled = false }: { onMatchCreate: (data: any) => void, disabled?: boolean }) {
  const [formData, setFormData] = useState<MatchFormData>({
    location: "",
    date: "",
    time: "",
    fieldCost: 0,
    playersPerTeam: 6,
  });

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
    setFormData(prev => ({
      ...prev,
      [name]: name === "fieldCost" || name === "playersPerTeam" ? Number(value) : value,
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
          type="number"
          id="fieldCost"
          name="fieldCost"
          value={formData.fieldCost}
          onChange={handleChange}
          min="0"
          step="1000"
          className="form-input"
          placeholder="Ej: 200000"
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
              <span className="font-medium">${formData.fieldCost.toLocaleString()}</span>
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
              <span className="font-bold text-primary text-lg">${costPerPlayer.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary w-full mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={disabled}
      >
        {disabled ? "Creando Partido..." : "Crear Partido"}
      </button>
    </form>
  );
}