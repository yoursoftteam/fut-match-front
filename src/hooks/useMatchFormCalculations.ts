import { useMemo } from "react";
import { getPayingPlayersCount, getTotalCost } from "@/lib/match-pricing";

interface UseMatchFormCalculationsProps {
  playersPerTeam: number;
  hasRentedGoalkeepers: boolean;
  rentedGoalkeepersCount: number;
  fieldCost: number;
  rentalCost: number;
}

export function useMatchFormCalculations({
  playersPerTeam,
  hasRentedGoalkeepers,
  rentedGoalkeepersCount,
  fieldCost,
  rentalCost,
}: UseMatchFormCalculationsProps) {
  const totalPlayers = useMemo(() => playersPerTeam * 2, [playersPerTeam]);

  const totalCost = useMemo(
    () => getTotalCost(fieldCost, rentalCost, hasRentedGoalkeepers),
    [hasRentedGoalkeepers, fieldCost, rentalCost],
  );

  const payingPlayers = useMemo(
    () =>
      getPayingPlayersCount(
        totalPlayers,
        hasRentedGoalkeepers,
        rentedGoalkeepersCount,
      ),
    [totalPlayers, hasRentedGoalkeepers, rentedGoalkeepersCount],
  );

  const costPerPlayer = useMemo(
    () => (totalCost > 0 && payingPlayers > 0 ? Math.round(totalCost / payingPlayers) : 0),
    [totalCost, payingPlayers],
  );

  return { totalPlayers, payingPlayers, totalCost, costPerPlayer };
}
