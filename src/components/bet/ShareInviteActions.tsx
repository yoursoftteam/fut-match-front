"use client";

import { ShareActions } from "@/components/ShareLink";

interface ShareInviteActionsProps {
  poolName: string;
  inviteUrl: string;
}

export function ShareInviteActions({ poolName, inviteUrl }: ShareInviteActionsProps) {
  const defaultMessage = [
    `Ey, arme la polla "${poolName}" en parti2.app.`,
    "Entra, mete tus marcadores y ven a pelear la tabla:",
    inviteUrl,
    "",
    "Menos chat, mas juego.",
  ].join("\n");

  return (
    <ShareActions
      title="Compartir polla"
      copyText={inviteUrl}
      copiedStatusText="Enlace de la polla copiado al portapapeles"
      whatsappText={`Ey, arme la polla "${poolName}" en parti2.app. Entra, mete tus marcadores y ven a pelear la tabla: ${inviteUrl}`}
      emailSubject={`Polla Parti2 Bet - ${poolName}`}
      emailBody={defaultMessage}
      nativeShare={{
        title: `Polla Parti2 Bet - ${poolName}`,
        text: `Ey, arme la polla "${poolName}" en parti2.app. Entra y mete tus marcadores.`,
        url: inviteUrl,
      }}
    />
  );
}
