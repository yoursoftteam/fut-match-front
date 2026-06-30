"use client";

import { ShareActions } from "@/components/ShareLink";
import { Separator } from "@/components/ui/separator";
import { buildConvocatoriaSummary, buildMatchShareSummary } from "@/lib/convocatoria-format";
import type { MatchData, PlayerRegistration } from "@/contexts/MatchDetailsContext";

interface MatchShareSectionProps {
  matchData: MatchData | null;
  registrations?: PlayerRegistration[];
}

export function MatchShareSection({ matchData, registrations }: MatchShareSectionProps) {
  if (!matchData) return null;

  const shareableLink =
    typeof window !== "undefined" ? `${window.location.origin}/match/${matchData.id}` : `/match/${matchData.id}`;

  const hasPlayers = registrations && registrations.length > 0;
  const convocatoriaText = hasPlayers
    ? buildConvocatoriaSummary(matchData, registrations, shareableLink)
    : buildMatchShareSummary(matchData, shareableLink);
  const matchSummary = buildMatchShareSummary(matchData, shareableLink);

  return (
    <div id="share-partido-section" className="space-y-4">
      {hasPlayers && (
        <>
          <ShareActions
            title="Compartir jugadores inscritos"
            copyText={convocatoriaText}
            copiedStatusText="Lista de jugadores copiada al portapapeles"
            whatsappText={convocatoriaText}
            emailSubject={`Convocatoria - ${matchData.title || "Partido"}`}
            emailBody={convocatoriaText}
            nativeShare={{
              title: `Convocatoria - ${matchData.title || "Partido"}`,
              text: convocatoriaText,
              url: shareableLink,
            }}
          />
          <Separator />
        </>
      )}

      <ShareActions
        title={hasPlayers ? "Compartir enlace del partido" : "Compartir partido"}
        copyText={matchSummary}
        copiedStatusText="Información del partido copiada al portapapeles"
        whatsappText={matchSummary}
        emailSubject={`Partido de fútbol - ${matchData.location || "Por definir"}`}
        emailBody={matchSummary}
        nativeShare={{
          title: `Partido en ${matchData.location || "Por definir"}`,
          text: matchSummary,
          url: shareableLink,
        }}
      />
    </div>
  );
}

export default MatchShareSection;
