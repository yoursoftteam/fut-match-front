"use client";

import { ShareActions } from "@/components/ShareLink";
import type { MatchData, PlayerRegistration } from "@/contexts/MatchDetailsContext";
import { formatCurrency } from "@/lib/currency";
import { formatLocalTime } from "@/lib/date-utils";
import { getPayingPlayersCount, getTotalCost } from "@/lib/match-pricing";

interface MatchShareSectionProps {
  matchData: MatchData | null;
}

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
      ...titulares.map((registration, index) => {
        const roleIcon = registration.is_goalkeeper ? "🧤" : "⚽";
        return `${index + 1}. ${registration.name} ${roleIcon}`;
      }),
      ""
    );
  } else {
    lines.push("Todavía no hay jugadores inscritos.");
    lines.push("");
  }

  if (suplentes.length > 0) {
    lines.push("Suplentes");
    lines.push(
      ...suplentes.map((registration, index) => {
        const roleIcon = registration.is_goalkeeper ? "🧤" : "⚽";
        return `${index + 1}. ${registration.name} ${roleIcon}`;
      })
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

export function MatchShareSection({ matchData }: MatchShareSectionProps) {
  if (!matchData) return null;

  const shareableLink =
    typeof window !== "undefined" ? `${window.location.origin}/match/${matchData.id}` : `/match/${matchData.id}`;
  const shareSummary = buildMatchShareSummary(matchData, shareableLink);

  return (
    <div id="share-partido-section" className="space-y-4">
      <ShareActions
        title="Compartir partido"
        copyText={shareSummary}
        copiedStatusText="Información del partido copiada al portapapeles"
        whatsappText={shareSummary}
        emailSubject={`Partido de fútbol - ${matchData.location || "Por definir"}`}
        emailBody={shareSummary}
        nativeShare={{
          title: `Partido en ${matchData.location || "Por definir"}`,
          text: shareSummary,
          url: shareableLink,
        }}
      />
    </div>
  );
}

export default MatchShareSection;