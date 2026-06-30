import { POSITIONS } from "@/lib/positions";
import { formatCurrency } from "@/lib/currency";
import { formatLocalTime } from "@/lib/date-utils";
import { getPayingPlayersCount, getTotalCost } from "@/lib/match-pricing";
import type { MatchData, PlayerRegistration } from "@/contexts/MatchDetailsContext";

const POSITION_LABEL_MAP = new Map<string, string>(POSITIONS.map((p) => [p.value, p.label]));

function capitalize(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatMatchSummaryDate(dateValue: string): string {
  const date = new Date(dateValue);
  const dateText = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
  return capitalize(dateText);
}

function getRoleLabel(registration: PlayerRegistration): string {
  if (registration.is_goalkeeper) return "Portero";
  if (registration.position) {
    return POSITION_LABEL_MAP.get(registration.position) ?? registration.position;
  }
  return "Jugador de campo";
}

function getRoleIcon(registration: PlayerRegistration): string {
  return registration.is_goalkeeper ? "🧤" : "⚽";
}

function formatPlayerLine(index: number, registration: PlayerRegistration): string {
  const roleLabel = getRoleLabel(registration);
  const roleIcon = getRoleIcon(registration);
  return `${index + 1}. ${registration.name} (${roleLabel})${roleIcon}`;
}

export function buildConvocatoriaSummary(
  matchData: MatchData,
  registrations: PlayerRegistration[],
  registrationLink: string,
): string {
  const titulares = registrations.slice(0, matchData.max_players);
  const suplentes = registrations.slice(matchData.max_players);
  const totalCost = getTotalCost(
    matchData.field_cost,
    matchData.rental_cost,
    matchData.has_rented_goalkeepers,
  );
  const payingPlayers = getPayingPlayersCount(
    matchData.max_players,
    matchData.has_rented_goalkeepers,
    matchData.rented_goalkeepers_count,
  );
  const costPerPlayer = payingPlayers > 0 ? Math.ceil(totalCost / payingPlayers) : 0;

  const lines = [
    `📍 Lugar: ${matchData.location || "Por definir"}`,
    `🗓️ Fecha: ${formatMatchSummaryDate(matchData.date)}`,
    `⏰ Hora: ${formatLocalTime(matchData.date)}`,
    `💸 Costo por jugador: ${formatCurrency(costPerPlayer)}`,
    "",
  ];

  lines.push(`👥 Inscritos (${registrations.length}/${matchData.max_players})`);

  if (titulares.length > 0) {
    lines.push("Titulares");
    lines.push(
      ...titulares.map((registration, index) => formatPlayerLine(index, registration)),
      "",
    );
  } else {
    lines.push("Todavía no hay jugadores inscritos.");
    lines.push("");
  }

  if (suplentes.length > 0) {
    lines.push("Suplentes");
    lines.push(
      ...suplentes.map((registration, index) => formatPlayerLine(index, registration)),
    );
  }

  lines.push("");
  lines.push("Si deseas inscribirte o bajarte del partido, ingresa al siguiente link:");
  lines.push(registrationLink);

  return lines.join("\n").trim();
}

export function buildMatchShareSummary(matchData: MatchData, registrationLink: string): string {
  const lines = [
    "⚽ ¡Tenemos partido!",
    `📍 Lugar: ${matchData.location || "Por definir"}`,
    `🗓️ Fecha: ${formatMatchSummaryDate(matchData.date)}`,
    `⏰ Hora: ${formatLocalTime(matchData.date)}`,
    "",
    `🔗 Inscríbete aquí: ${registrationLink}`,
  ];
  return lines.join("\n").trim();
}
