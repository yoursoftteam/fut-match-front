const PENDING_LOCATION_VALUE = "por definir";
const PENDING_LOCATION_TITLE = "Ubicación pendiente por definir";

export function isPendingLocation(location: string): boolean {
  return location.trim().toLowerCase() === PENDING_LOCATION_VALUE;
}

export function getMatchTitleFromLocation(location: string): string {
  if (isPendingLocation(location)) {
    return PENDING_LOCATION_TITLE;
  }

  return `Partido en ${location}`;
}
