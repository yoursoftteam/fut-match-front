"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { type MatchFormSubmitData } from "@/components/MatchFormSteps";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";

const SUMMARY_KEY = "match_summary";

interface MatchSummary {
  matchId: string;
  location: string;
  date: string;
  time: string;
  playersPerTeam: number;
  totalPlayers: number;
  fieldCost: number;
  rentalCost: number;
  costPerPlayer: number;
  hasRentedGoalkeepers: boolean;
  rentedGoalkeepersCount: number;
}

interface UseMatchCreationReturn {
  loading: boolean;
  error: string | null;
  createMatch: (data: MatchFormSubmitData) => Promise<string | null>;
}

export function useMatchCreation(): UseMatchCreationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const { createMatch: apiCreateMatch, registerRentedGoalkeepers } = useMatches();
  const router = useRouter();

  const createMatch = useCallback(async (data: MatchFormSubmitData): Promise<string | null> => {
    if (!user) {
      setError("Debes iniciar sesión para crear un partido");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const matchData = {
        title: `Partido en ${data.location}`,
        location: data.location,
        date: `${data.date}T${data.time}:00`,
        max_players: data.totalPlayers,
        created_by: user.id,
      };

      const { data: newMatch, error: createError } = await apiCreateMatch(matchData);

      if (createError) {
        throw createError;
      }

      if (!newMatch) {
        throw new Error("No se pudo crear el partido");
      }

      if (data.hasRentedGoalkeepers && data.rentedGoalkeepersCount > 0) {
        await registerRentedGoalkeepers(newMatch.id, data.rentedGoalkeepersCount);
      }

      const summary: MatchSummary = {
        matchId: newMatch.id,
        location: data.location,
        date: data.date,
        time: data.time,
        playersPerTeam: data.playersPerTeam,
        totalPlayers: data.totalPlayers,
        fieldCost: data.fieldCost,
        rentalCost: data.rentalCost,
        costPerPlayer: data.costPerPlayer,
        hasRentedGoalkeepers: data.hasRentedGoalkeepers,
        rentedGoalkeepersCount: data.rentedGoalkeepersCount,
      };

      sessionStorage.setItem(SUMMARY_KEY, JSON.stringify(summary));
      router.push(`/match/${newMatch.id}/success`);
      return newMatch.id;

    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear el partido");
      return null;
    } finally {
      setLoading(false);
    }
  }, [user, apiCreateMatch, registerRentedGoalkeepers, router]);

  return {
    loading,
    error,
    createMatch,
  };
}

export function useMatchSummary(matchId: string): MatchSummary | null {
  const [cached, setCached] = useState<MatchSummary | null | undefined>(undefined);
  const [initialized, setInitialized] = useState(false);

  if (!initialized && cached === undefined) {
    if (typeof window !== "undefined") {
      try {
        const stored = sessionStorage.getItem(SUMMARY_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as MatchSummary;
          if (parsed.matchId === matchId) {
            setCached(parsed);
          }
          sessionStorage.removeItem(SUMMARY_KEY);
        }
      } catch { /* ignore */ }
    }
    setInitialized(true);
  }

  return cached ?? null;
}