import { useMemo } from "react";

interface UseMatchFormCalculationsProps {
  playersPerTeam: number;
  hasRentedGoalkeepers: boolean;
  fieldCost: number;
  rentalCost: number;
}

export function useMatchFormCalculations({
  playersPerTeam,
  hasRentedGoalkeepers,
  fieldCost,
  rentalCost,
}: UseMatchFormCalculationsProps) {
  const totalPlayers = useMemo(() => playersPerTeam * 2, [playersPerTeam]);

  const totalCost = useMemo(
    () => (hasRentedGoalkeepers ? fieldCost + rentalCost : fieldCost),
    [hasRentedGoalkeepers, fieldCost, rentalCost],
  );

  const costPerPlayer = useMemo(
    () => (totalCost > 0 ? Math.round(totalCost / totalPlayers) : 0),
    [totalCost, totalPlayers],
  );

  return { totalPlayers, totalCost, costPerPlayer };
}
