"use client";

import { useEffect, useRef } from "react";
import { useMatchEditing } from "@/hooks/useMatchEditing";
import { useMatchPricing } from "@/hooks/useMatchPricing";
import type { UseMatchEditingReturn } from "@/hooks/useMatchEditing";

interface MatchEditFormProps {
  editing?: UseMatchEditingReturn;
}

export function MatchEditForm({ editing }: MatchEditFormProps) {
  const fallbackEditing = useMatchEditing();
  const {
    showForm,
    loading,
    message,
    form,
    fieldCostInput,
    rentalCostInput,
    closeForm,
    handleInputChange,
    handleSubmit,
  } = editing ?? fallbackEditing;
  const { goalkeepersCount } = useMatchPricing();
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showForm) return;

    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showForm]);

  if (!showForm) return null;

  return (
    <div ref={formRef} className="rounded-lg border border-green-700/50 bg-card p-6 shadow">
      <h2 className="mb-4 text-2xl font-bold text-foreground">Editar partido</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="edit-location" className="mb-2 block text-sm font-medium text-foreground">Ubicación</label>
          <input
            id="edit-location"
            name="location"
            value={form.location}
            onChange={handleInputChange}
            className="w-full rounded border border-border bg-muted px-4 py-3 text-foreground"
            placeholder="Ej: Cancha Central"
            required
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="edit-date" className="mb-2 block text-sm font-medium text-foreground">Fecha</label>
            <input type="date" id="edit-date" name="date" value={form.date} onChange={handleInputChange} className="w-full rounded border border-border bg-muted px-4 py-3 text-foreground" required />
          </div>
          <div>
            <label htmlFor="edit-time" className="mb-2 block text-sm font-medium text-foreground">Hora</label>
            <input type="time" id="edit-time" name="time" value={form.time} onChange={handleInputChange} className="w-full rounded border border-border bg-muted px-4 py-3 text-foreground" required />
          </div>
        </div>
        <div>
          <label htmlFor="edit-playersPerTeam" className="mb-2 block text-sm font-medium text-foreground">Jugadores por equipo</label>
          <select id="edit-playersPerTeam" name="playersPerTeam" value={form.playersPerTeam} onChange={handleInputChange} className="w-full rounded border border-border bg-muted px-4 py-3 text-foreground">
            {[6, 7, 8, 9, 10, 11].map((num) => (
              <option key={num} value={num}>{num} vs {num}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="edit-fieldCost" className="mb-2 block text-sm font-medium text-foreground">Valor de la Cancha ($)</label>
          <input
            id="edit-fieldCost"
            name="fieldCost"
            value={fieldCostInput}
            onChange={handleInputChange}
            inputMode="numeric"
            autoComplete="off"
            className="w-full rounded border border-border bg-muted px-4 py-3 text-foreground"
            placeholder="Ej: $ 200.000"
          />
        </div>

        <div className="rounded border border-border bg-muted p-4">
          <div className="mb-4 flex items-center gap-3">
            <input
              type="checkbox"
              id="edit-hasRentedGoalkeepers"
              name="hasRentedGoalkeepers"
              checked={form.hasRentedGoalkeepers}
              onChange={handleInputChange}
              className="h-5 w-5 cursor-pointer"
              disabled={goalkeepersCount >= 2}
            />
            <label htmlFor="edit-hasRentedGoalkeepers" className={`text-sm font-medium cursor-pointer ${goalkeepersCount >= 2 ? "text-muted-foreground" : "text-foreground"}`}>
              ¿Habrá arqueros alquilados?
            </label>
          </div>
          {goalkeepersCount >= 2 && (
            <p className="mb-3 text-xs text-amber-400">Ya hay 2 arqueros inscritos. No se puede configurar alquiler.</p>
          )}

          {form.hasRentedGoalkeepers && (
            <div className="space-y-4">
              <div>
                <label htmlFor="edit-rentedGoalkeepersCount" className="mb-2 block text-sm font-medium text-foreground">Cantidad de arqueros alquilados</label>
                <select id="edit-rentedGoalkeepersCount" name="rentedGoalkeepersCount" value={form.rentedGoalkeepersCount} onChange={handleInputChange} className="w-full rounded border border-border bg-muted px-4 py-3 text-foreground">
                  <option value={1}>1 arquero</option>
                  <option value={2}>2 arqueros</option>
                </select>
              </div>
              <div>
                <label htmlFor="edit-rentalCost" className="mb-2 block text-sm font-medium text-foreground">Valor del alquiler ({form.rentedGoalkeepersCount} arquero{form.rentedGoalkeepersCount > 1 ? "s" : ""}) ($)</label>
                <input
                  id="edit-rentalCost"
                  name="rentalCost"
                  value={rentalCostInput}
                  onChange={handleInputChange}
                  inputMode="numeric"
                  autoComplete="off"
                  className="w-full rounded border border-border bg-muted px-4 py-3 text-foreground"
                  placeholder="Ej: $ 50.000"
                />
              </div>
            </div>
          )}
        </div>

        {message && (
          <div role="status" aria-live="polite" className={`rounded px-4 py-3 text-sm font-medium ${message.includes("✓") ? "border border-green-500 bg-green-500/20 text-green-300" : "border border-red-500 bg-red-500/20 text-red-300"}`}>
            {message}
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            className={`flex-1 rounded px-4 py-2 font-semibold text-foreground transition ${loading || message?.includes("✓") ? "cursor-not-allowed bg-muted opacity-60" : "bg-green-500 hover:bg-green-600"}`}
            disabled={loading || message?.includes("✓")}
          >
            {loading ? "Guardando…" : message?.includes("✓") ? "✓ Guardado" : "Guardar cambios"}
          </button>
          <button
            type="button"
            onClick={closeForm}
            className="flex-1 rounded border border-border bg-muted px-4 py-2 font-medium text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}