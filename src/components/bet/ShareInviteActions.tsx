"use client";

import { ShareActions } from "@/components/ShareLink";

interface ShareInviteActionsProps {
  poolName: string;
  inviteUrl: string;
  competitionLabel?: string;
}

export function ShareInviteActions({
  poolName,
  inviteUrl,
  competitionLabel = "polla",
}: ShareInviteActionsProps) {
  const title = competitionLabel === "competencia" ? "competencia de predicciones" : "polla";
  const defaultMessage = [
    `Ey, arme la ${title} "${poolName}" en parti2.app.`,
    "Entra, mete tus marcadores y ven a pelear la tabla:",
    inviteUrl,
    "",
    "Menos chat, mas juego.",
  ].join("\n");

  return (
    <ShareActions
      title={`Compartir ${competitionLabel}`}
      copyText={inviteUrl}
      copiedStatusText={`Enlace de la ${competitionLabel} copiado al portapapeles`}
      whatsappText={`Ey, arme la ${title} "${poolName}" en parti2.app. Entra, mete tus marcadores y ven a pelear la tabla: ${inviteUrl}`}
      emailSubject={`${competitionLabel === "competencia" ? "Competencia" : "Polla"} Parti2 Bet - ${poolName}`}
      emailBody={defaultMessage}
      nativeShare={{
        title: `${competitionLabel === "competencia" ? "Competencia" : "Polla"} Parti2 Bet - ${poolName}`,
        text: `Ey, arme la ${title} "${poolName}" en parti2.app. Entra y mete tus marcadores.`,
        url: inviteUrl,
      }}
    />
  );
}
