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
  field_cost: number;
  rental_cost: number;
  has_rented_goalkeepers: boolean;
  rented_goalkeepers_count: number;
  players_per_team: number;
  source_template_id?: string | null;
}

export interface PlayerRegistration {
  id: string;
  name: string;
  is_goalkeeper: boolean;
  registered_at: string;
  has_paid: boolean;
  paid_at: string | null;
  paid_by: string | null;
}

interface MatchDetailsContextValue {
  matchId: string;
  matchData: MatchData | null;
  loading: boolean;
  error: string | null;
  registrations: PlayerRegistration[];
  registrationsLoading: boolean;
  user: ReturnType<typeof useAuth>["user"];
  isCreator: boolean;
  setMatchData: React.Dispatch<React.SetStateAction<MatchData | null>>;
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

  const { getMatchById, getPublicMatchById } = useMatches();
  const { registrations = [], loading: registrationsLoading } = useMatchRegistrationsRealtime(matchId);
  const { user } = useAuth();

  const isCreator = Boolean(user && matchData && user.id === matchData.created_by);

  const refreshMatchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getMatchById(matchId);
      if (result.data) {
        setMatchData(result.data);
        return;
      }

      const publicResult = await getPublicMatchById(matchId);
      if (publicResult.error) {
        setError("Error al cargar el partido");
      } else if (publicResult.data) {
        setMatchData(publicResult.data as MatchData);
      } else {
        setError("Partido no encontrado");
      }
    } catch {
      setError("Error al cargar los datos del partido");
    } finally {
      setLoading(false);
    }
  }, [getMatchById, getPublicMatchById, matchId]);

  useEffect(() => {
    refreshMatchData();
  }, [refreshMatchData]);

  return (
    <MatchDetailsContext value={{
      matchId,
      matchData,
      loading,
      error,
      registrations,
      registrationsLoading,
      user,
      isCreator,
      setMatchData,
      refreshMatchData,
    }}>
      {children}
    </MatchDetailsContext>
  );
}
