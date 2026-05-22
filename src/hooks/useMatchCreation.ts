"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getMatchTitleFromLocation } from "@/lib/match-title";
import { type MatchFormSubmitData } from "@/components/MatchFormSteps";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";
import type { Match } from "@/hooks/useMatches";

interface UseMatchCreationReturn {
  loading: boolean;
  error: string | null;
  createMatch: (data: MatchFormSubmitData, participantsToRegister?: { name: string; is_goalkeeper: boolean }[], templateId?: string | null) => Promise<string | null>;
}

export function useMatchCreation(): UseMatchCreationReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();
  const { createMatch: apiCreateMatch, registerRentedGoalkeepers } = useMatches();
  const router = useRouter();

  const createMatch = useCallback(async (
    data: MatchFormSubmitData,
    participantsToRegister?: { name: string; is_goalkeeper: boolean }[],
    templateId?: string | null,
  ): Promise<string | null> => {
    if (!user) {
      setError("Debes iniciar sesión para crear un partido");
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const matchData: Omit<Match, "id"> = {
        title: getMatchTitleFromLocation(data.location),
        location: data.location,
        date: `${data.date}T${data.time}:00`,
        max_players: data.totalPlayers,
        created_by: user.id,
        field_cost: data.fieldCost,
        rental_cost: data.rentalCost,
        has_rented_goalkeepers: data.hasRentedGoalkeepers,
        rented_goalkeepers_count: data.rentedGoalkeepersCount,
        players_per_team: data.playersPerTeam,
        source_template_id: templateId || null,
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

      if (participantsToRegister && participantsToRegister.length > 0) {
        for (const p of participantsToRegister) {
          await supabase.from("match_registrations").insert({
            match_id: newMatch.id,
            name: p.name,
            is_goalkeeper: p.is_goalkeeper,
          });
        }
      }

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
