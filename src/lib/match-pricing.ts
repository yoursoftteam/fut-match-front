export function getTotalCost(
  fieldCost: number,
  rentalCost: number,
  hasRentedGoalkeepers: boolean,
): number {
  return hasRentedGoalkeepers ? fieldCost + rentalCost : fieldCost;
}

export function getPayingPlayersCount(
  totalPlayers: number,
  hasRentedGoalkeepers: boolean,
  rentedGoalkeepersCount: number,
): number {
  const safeTotalPlayers = Math.max(0, totalPlayers);
  const excludedGoalkeepers = hasRentedGoalkeepers
    ? Math.max(0, rentedGoalkeepersCount)
    : 0;

  return Math.max(0, safeTotalPlayers - excludedGoalkeepers);
}