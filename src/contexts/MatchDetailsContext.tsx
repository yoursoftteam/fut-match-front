"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { useMatches } from "@/hooks/useMatches";
import { useMatchRegistrationsRealtime } from "@/hooks/useMatchRegistrationsRealtime";
import { useAuth } from "@/hooks/useAuth";

export interface MatchData {
  id: string;
  title: string;
  location: string;
  date: string;
  max_players: number;
  created_by: string;
  created_at: string;
  time?: string;
}

export interface PlayerRegistration {
  id: string;
  name: string;
  is_goalkeeper: boolean;
  registered_at: string;
}

export interface StoredMatchPricing {
  id: string;
  fieldCost: number;
  costPerPlayer: number;
  playersPerTeam: number;
  hasRentedGoalkeepers?: boolean;
  rentedGoalkeepersCount?: number;
  rentalCost?: number;
}

interface MatchDetailsContextValue {
  matchId: string;
  matchData: MatchData | null;
  loading: boolean;
  error: string | null;
  registrations: PlayerRegistration[];
  registrationsLoading: boolean;
  storedMatchPricing: StoredMatchPricing | null;
  user: ReturnType<typeof useAuth>["user"];
  isCreator: boolean;
  setMatchData: (data: MatchData) => void;
  setStoredMatchPricing: (data: StoredMatchPricing | null) => void;
  refreshMatchData: () => Promise<void>;
}

const MatchDetailsContext = createContext<MatchDetailsContextValue | null>(null);

export function useMatchDetailsContext() {
  const ctx = useContext(MatchDetailsContext);
  if (!ctx) {
    throw new Error("useMatchDetailsContext must be used within MatchDetailsProvider");
  }
  return ctx;
}

interface MatchDetailsProviderProps {
  matchId: string;
  children: ReactNode;
}

export function MatchDetailsProvider({ matchId, children }: MatchDetailsProviderProps) {
  const [matchData, setMatchData] = useState<MatchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [storedMatchPricing, setStoredMatchPricing] = useState<StoredMatchPricing | null>(null);

  const { getMatchById } = useMatches();
  const { registrations = [], loading: registrationsLoading } = useMatchRegistrationsRealtime(matchId);
  const { user } = useAuth();

  const isCreator = Boolean(user && matchData && user.id === matchData.created_by);

  const refreshMatchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getMatchById(matchId);
      if (result.error) {
        setError("Error al cargar el partido");
      } else if (result.data) {
        setMatchData(result.data);
      } else {
        setError("Partido no encontrado");
      }
    } catch {
      setError("Error al cargar los datos del partido");
    } finally {
      setLoading(false);
    }
  }, [getMatchById, matchId]);

  useEffect(() => {
    refreshMatchData();
  }, [refreshMatchData]);

  useEffect(() => {
    try {
      const storedMatches = sessionStorage.getItem("matches");
      if (!storedMatches) {
        setStoredMatchPricing(null);
        return;
      }
      const parsed = JSON.parse(storedMatches) as Array<Partial<StoredMatchPricing>>;
      const stored = parsed.find((m) => m.id === matchId);
      if (stored && typeof stored.fieldCost === "number" && typeof stored.costPerPlayer === "number" && typeof stored.playersPerTeam === "number") {
        setStoredMatchPricing({
          id: matchId,
          fieldCost: stored.fieldCost,
          costPerPlayer: stored.costPerPlayer,
          playersPerTeam: stored.playersPerTeam,
          hasRentedGoalkeepers: stored.hasRentedGoalkeepers,
          rentedGoalkeepersCount: stored.rentedGoalkeepersCount,
          rentalCost: stored.rentalCost,
        });
      } else {
        setStoredMatchPricing(null);
      }
    } catch {
      setStoredMatchPricing(null);
    }
  }, [matchId]);

  return (
    <MatchDetailsContext value={{
      matchId,
      matchData,
      loading,
      error,
      registrations,
      registrationsLoading,
      storedMatchPricing,
      user,
      isCreator,
      setMatchData,
      setStoredMatchPricing,
      refreshMatchData,
    }}>
      {children}
    </MatchDetailsContext>
  );
}