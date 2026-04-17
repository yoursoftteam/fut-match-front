"use client";

import { useState } from "react";

export default function ShareLink({ matchId }: { matchId: string }) {
  const [copied, setCopied] = useState(false);
  
  // Generate the shareable link
  const shareableLink = `${window.location.origin}/match/${matchId}`;
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-6 p-5 card">
      <h3 className="font-bold text-text-primary mb-3">Compartir Partido</h3>
      <p className="text-text-secondary mb-4">
        Envía este enlace a tus amigos para que se registren en el partido:
      </p>
      
      <div className="flex">
        <input
          type="text"
          value={shareableLink}
          readOnly
          className="flex-grow px-4 py-3 border border-border rounded-l-lg bg-card-bg text-text-primary"
        />
        <button
          onClick={copyToClipboard}
          className={`px-5 py-3 rounded-r-lg text-white font-medium ${
            copied ? "bg-success" : "bg-primary hover:bg-primary-hover"
          } transition-colors duration-200`}
        >
          {copied ? "¡Copiado!" : "Copiar"}
        </button>
      </div>
      
      <div className="mt-4 text-sm text-text-secondary">
        <p>Los usuarios necesitan tener una cuenta en la plataforma para registrarse.</p>
      </div>
    </div>
  );
}