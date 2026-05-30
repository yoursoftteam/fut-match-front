"use client";

import { useMemo } from "react";
import { useMatchDetailsContext } from "@/contexts/MatchDetailsContext";

const MAX_SUBSTITUTE_SLOTS = 10;
const PLAYER_OPTIONS = [6, 7, 8, 9, 10, 11] as const;

interface RegistrationStats {
  playersPerTeamLimit: number;
  playersRemaining: number;
  substituteSlotsFree: number;
  registeredPercent: number;
  maxGoalkeepers: number;
  maxFieldPlayers: number;
  goalkeepersCount: number;
  fieldPlayersCount: number;
  goalkeepersRemaining: number;
  fieldPlayersRemaining: number;
  isTitularFull: boolean;
  isSubstituteFull: boolean;
  isGoalkeeperFull: boolean;
  isFieldPlayerFull: boolean;
  titulares: ReturnType<typeof useMatchDetailsContext>["registrations"];
  suplentes: ReturnType<typeof useMatchDetailsContext>["registrations"];
}

interface MatchFormatting {
  formattedDate: string;
  formattedTime: string;
}

interface MatchStatus {
  tituloStatus: string;
  colorStatus: string;
}

type MatchPricingData = RegistrationStats & MatchFormatting & MatchStatus;

export function useMatchPricing(): MatchPricingData {
  const { matchData, registrations } = useMatchDetailsContext();

  return useMemo(() => {
    const empty: MatchPricingData & MatchFormatting & MatchStatus = {
      formattedDate: "",
      formattedTime: "",
      playersPerTeamLimit: 0,
      playersRemaining: 0,
      substituteSlotsFree: 0,
      registeredPercent: 0,
      maxGoalkeepers: 0,
      maxFieldPlayers: 0,
      goalkeepersCount: 0,
      fieldPlayersCount: 0,
      goalkeepersRemaining: 0,
      fieldPlayersRemaining: 0,
      isTitularFull: false,
      isSubstituteFull: false,
      isGoalkeeperFull: false,
      isFieldPlayerFull: false,
      tituloStatus: "",
      colorStatus: "",
      titulares: [],
      suplentes: [],
    };

    if (!matchData) return empty;

    const formatting: MatchFormatting = {
      formattedDate: new Date(matchData.date).toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
      formattedTime: matchData.time || new Date(matchData.date).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    };

    const titulares = registrations.slice(0, matchData.max_players);
    const suplentes = registrations.slice(matchData.max_players);
    const playersPerTeamLimit = Math.ceil(matchData.max_players / 2);

    const playersRemaining = Math.max(0, matchData.max_players - titulares.length);
    const substituteSlotsFree = Math.max(0, MAX_SUBSTITUTE_SLOTS - suplentes.length);
    const registeredPercent = matchData.max_players > 0 ? Math.round((titulares.length / matchData.max_players) * 100) : 0;

    const maxGoalkeepers = Math.min(2, matchData.max_players);
    const maxFieldPlayers = Math.max(0, matchData.max_players - maxGoalkeepers);
    const goalkeepersCount = titulares.filter((r) => r.is_goalkeeper).length;
    const fieldPlayersCount = titulares.length - goalkeepersCount;

    const stats: RegistrationStats = {
      playersPerTeamLimit,
      playersRemaining,
      substituteSlotsFree,
      registeredPercent,
      maxGoalkeepers,
      maxFieldPlayers,
      goalkeepersCount,
      fieldPlayersCount,
      goalkeepersRemaining: Math.max(0, maxGoalkeepers - goalkeepersCount),
      fieldPlayersRemaining: Math.max(0, maxFieldPlayers - fieldPlayersCount),
      isTitularFull: titulares.length >= matchData.max_players,
      isSubstituteFull: suplentes.length >= MAX_SUBSTITUTE_SLOTS,
      isGoalkeeperFull: goalkeepersCount >= maxGoalkeepers,
      isFieldPlayerFull: fieldPlayersCount >= maxFieldPlayers,
      titulares,
      suplentes,
    };

    const status: MatchStatus = playersRemaining > 0
      ? { tituloStatus: `${playersRemaining} cupos titulares libres`, colorStatus: "text-green-400" }
      : substituteSlotsFree > 0
        ? { tituloStatus: `Titulares completos · ${substituteSlotsFree} cupo${substituteSlotsFree !== 1 ? "s" : ""} de suplente`, colorStatus: "text-amber-400" }
        : { tituloStatus: "Partido y lista de suplentes completos", colorStatus: "text-red-400" };

    return { ...formatting, ...stats, ...status };
  }, [matchData, registrations]);
}

export { MAX_SUBSTITUTE_SLOTS, PLAYER_OPTIONS };