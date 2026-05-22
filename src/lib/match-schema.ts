import { z } from "zod";

export const matchFormSchema = z
  .object({
    location: z.string(),
    noLocationYet: z.boolean(),
    date: z.string().min(1, { message: "Selecciona una fecha" }),
    time: z.string().min(1, { message: "Selecciona una hora" }),
    fieldCost: z.number().min(1, { message: "Ingresa el valor de la cancha" }),
    playersPerTeam: z.number().min(6).max(11),
    hasRentedGoalkeepers: z.boolean(),
    rentedGoalkeepersCount: z.number(),
    rentalCost: z.number(),
  })
  .superRefine((data, ctx) => {
    if (!data.noLocationYet && data.location.trim().length < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["location"],
        message: "El lugar debe tener al menos 3 caracteres",
      });
    }
  });

export interface MatchFormValues {
  location: string;
  noLocationYet: boolean;
  date: string;
  time: string;
  fieldCost: number;
  playersPerTeam: number;
  hasRentedGoalkeepers: boolean;
  rentedGoalkeepersCount: number;
  rentalCost: number;
}

export type MatchFormSubmitData = Omit<MatchFormValues, "noLocationYet"> & {
  totalPlayers: number;
  costPerPlayer: number;
};

export const PLAYER_OPTIONS = [6, 7, 8, 9, 10, 11];

// --- Partidos Frecuentes ---

export interface MatchTemplate {
  id: string;
  user_id: string;
  name: string;
  location: string;
  time: string;
  players_per_team: number;
  has_rented_goalkeepers: boolean;
  rented_goalkeepers_count: number;
  field_cost: number;
  rental_cost: number;
  save_participants: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  match_id?: string | null;
}

export interface MatchTemplateParticipant {
  id: string;
  template_id: string;
  name: string;
  is_goalkeeper: boolean;
  sort_order: number;
}

export interface MatchTemplateWithParticipants extends MatchTemplate {
  participants: MatchTemplateParticipant[];
}

export interface CreateTemplateData {
  name: string;
  location: string;
  time: string;
  players_per_team: number;
  has_rented_goalkeepers: boolean;
  rented_goalkeepers_count: number;
  field_cost: number;
  rental_cost: number;
  save_participants: boolean;
  match_id?: string | null;
  participants?: { name: string; is_goalkeeper: boolean }[];
}
