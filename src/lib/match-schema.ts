import { z } from "zod";

export const matchFormSchema = z.object({
  location: z.string().min(3, { message: "El lugar debe tener al menos 3 caracteres" }),
  date: z.string().min(1, { message: "Selecciona una fecha" }),
  time: z.string().min(1, { message: "Selecciona una hora" }),
  fieldCost: z.number().min(1, { message: "Ingresa el valor de la cancha" }),
  playersPerTeam: z.number().min(6).max(11),
  hasRentedGoalkeepers: z.boolean(),
  rentedGoalkeepersCount: z.number(),
  rentalCost: z.number(),
});

export interface MatchFormValues {
  location: string;
  date: string;
  time: string;
  fieldCost: number;
  playersPerTeam: number;
  hasRentedGoalkeepers: boolean;
  rentedGoalkeepersCount: number;
  rentalCost: number;
}

export type MatchFormSubmitData = MatchFormValues & {
  totalPlayers: number;
  costPerPlayer: number;
};

export const PLAYER_OPTIONS = [6, 7, 8, 9, 10, 11];
