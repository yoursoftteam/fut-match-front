import { z } from "zod"

export const tournamentTypeSchema = z.enum(["league", "groups"])
export const tournamentStatusSchema = z.enum(["draft", "open", "in_progress", "finished"])
export const tournamentTeamPaymentStatusSchema = z.enum(["pending", "paid"])
export const tournamentMatchStatusSchema = z.enum(["pending", "played", "live"])
export const tournamentPaymentStatusSchema = z.enum(["pending", "processing", "paid", "failed"])
export const leagueModeSchema = z.enum(["single_leg", "home_away"])
export const knockoutPhaseSchema = z.enum(["round_of_16", "quarterfinals", "semifinals", "final"])
export const weekDaySchema = z.number().int().min(0).max(6)
export const timeSlotSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Hora inválida")

export type TournamentType = z.infer<typeof tournamentTypeSchema>
export type TournamentStatus = z.infer<typeof tournamentStatusSchema>
export type TournamentTeamPaymentStatus = z.infer<typeof tournamentTeamPaymentStatusSchema>
export type TournamentMatchStatus = z.infer<typeof tournamentMatchStatusSchema>
export type TournamentPaymentStatus = z.infer<typeof tournamentPaymentStatusSchema>
export type LeagueMode = z.infer<typeof leagueModeSchema>
export type KnockoutPhase = z.infer<typeof knockoutPhaseSchema>
export type WeekDay = z.infer<typeof weekDaySchema>

export interface TournamentScheduleDay {
  day_of_week: WeekDay
  times: string[]
}

export interface Tournament {
  id: string
  owner_id: string
  name: string
  logo_url: string | null
  description: string | null
  registration_fee: number
  tournament_type: TournamentType
  status: TournamentStatus
  max_teams: number
  min_players_per_team: number
  starts_at: string | null
  rules_text: string | null
  rules_pdf_url: string | null
  league_mode: LeagueMode | null
  groups_count: number | null
  qualifiers_per_group: number | null
  has_knockout: boolean | null
  knockout_phase: KnockoutPhase | null
  scheduled_days: TournamentScheduleDay[] | null
  created_at: string
  updated_at: string
}

export interface TournamentTeam {
  id: string
  tournament_id: string
  name: string
  logo_url: string | null
  captain_name: string
  captain_phone: string | null
  captain_email: string | null
  kit_colors: string | null
  payment_status: TournamentTeamPaymentStatus
  created_at: string
}

export interface TournamentMatch {
  id: string
  tournament_id: string
  home_team_id: string | null
  away_team_id: string | null
  home_goals: number | null
  away_goals: number | null
  starts_at: string | null
  match_status: TournamentMatchStatus
  phase_label: string | null
  round_number: number | null
  group_label: string | null
  created_at: string
}

export interface TournamentPayment {
  id: string
  tournament_id: string
  team_id: string
  amount: number
  status: TournamentPaymentStatus
  provider_ref: string | null
  created_at: string
  updated_at: string
}

export const createTournamentInputSchema = z
  .object({
  name: z.string().trim().min(3, "El nombre debe tener al menos 3 caracteres").max(120),
  logo_url: z.string().trim().url("URL de logo inválida").optional().or(z.literal("")),
  description: z.string().trim().max(1200).optional().or(z.literal("")),
  registration_fee: z.number().min(0, "La inscripción no puede ser negativa"),
  tournament_type: tournamentTypeSchema,
  status: tournamentStatusSchema.default("draft"),
  max_teams: z.number().int().min(2, "Debe permitir mínimo 2 equipos").max(128),
  min_players_per_team: z.number().int().min(5, "Mínimo 5 jugadores por equipo").max(30),
  starts_at: z.string().datetime().optional().or(z.literal("")),
  rules_text: z.string().trim().max(4000).optional().or(z.literal("")),
  rules_pdf_url: z.string().trim().url("URL de reglas inválida").optional().or(z.literal("")),
  league_mode: leagueModeSchema.optional(),
  groups_count: z.number().int().min(2).max(32).optional(),
  qualifiers_per_group: z.number().int().min(1).max(16).optional(),
  has_knockout: z.boolean().optional(),
  knockout_phase: knockoutPhaseSchema.optional(),
  scheduled_days: z
    .array(
      z.object({
        day_of_week: weekDaySchema,
        times: z.array(timeSlotSchema).max(16),
      })
    )
    .max(7)
    .optional(),
  })
  .superRefine((data, ctx) => {
    if (data.scheduled_days) {
      for (const [index, day] of data.scheduled_days.entries()) {
        if (day.times.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["scheduled_days", index, "times"],
            message: "Agrega al menos un horario para este día",
          })
        }
      }
    }

    if (data.tournament_type === "league") {
      if (!data.league_mode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["league_mode"],
          message: "Define si la liga es ida o ida-vuelta",
        })
      }
      return
    }

    if (!data.groups_count) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["groups_count"],
        message: "Define el número de grupos",
      })
    }

    if (!data.qualifiers_per_group) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["qualifiers_per_group"],
        message: "Define cuántos clasifican por grupo",
      })
    }

    if (typeof data.has_knockout !== "boolean") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["has_knockout"],
        message: "Define si tendrá fase knockout",
      })
    }

    if (data.has_knockout && !data.knockout_phase) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["knockout_phase"],
        message: "Selecciona la fase inicial del knockout",
      })
    }
  })

export type CreateTournamentInput = z.infer<typeof createTournamentInputSchema>

export const registerTournamentTeamInputSchema = z.object({
  tournament_id: z.string().uuid("ID de torneo inválido"),
  name: z.string().trim().min(2, "Nombre de equipo inválido").max(120),
  logo_url: z.string().trim().url("URL de logo inválida").optional().or(z.literal("")),
  captain_name: z.string().trim().min(2, "Nombre del capitán inválido").max(120),
  captain_phone: z.string().trim().min(7, "Teléfono inválido").max(30).optional().or(z.literal("")),
  captain_email: z.string().trim().email("Correo inválido").optional().or(z.literal("")),
  kit_colors: z.string().trim().max(120).optional().or(z.literal("")),
})

export type RegisterTournamentTeamInput = z.infer<typeof registerTournamentTeamInputSchema>

export function normalizeOptionalText(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function isPublicTournamentStatus(status: TournamentStatus): boolean {
  return status === "open" || status === "in_progress" || status === "finished"
}

export function buildSimulatedPaymentRef(): string {
  return `SIM-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`
}
