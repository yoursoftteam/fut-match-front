"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import type { useTeamBuilder } from "@/hooks/useTeamBuilder";

type Player = ReturnType<typeof useTeamBuilder>["teamA"][number];

interface TeamFieldImageProps {
  teamA: Player[];
  teamB: Player[];
  matchTitle?: string;
}

function drawField(canvas: HTMLCanvasElement, teamA: Player[], teamB: Player[], matchTitle: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const W = canvas.width;
  const H = canvas.height;

  // Background
  ctx.fillStyle = "#1a2e1a";
  ctx.fillRect(0, 0, W, H);

  // Grass stripes
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 === 0 ? "#1e341e" : "#1a2e1a";
    ctx.fillRect(0, (H / 8) * i, W, H / 8);
  }

  // Field lines
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;

  // Outer border
  const pad = 24;
  ctx.strokeRect(pad, pad, W - pad * 2, H - pad * 2);

  // Center line
  ctx.beginPath();
  ctx.moveTo(W / 2, pad);
  ctx.lineTo(W / 2, H - pad);
  ctx.stroke();

  // Center circle
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 60, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(W / 2, H / 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fill();

  // Left penalty area
  const penW = 120, penH = 200;
  ctx.strokeRect(pad, H / 2 - penH / 2, penW, penH);
  // Left goal area
  ctx.strokeRect(pad, H / 2 - 70, 50, 140);
  // Left goal
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3;
  ctx.strokeRect(pad - 14, H / 2 - 40, 14, 80);

  // Right penalty area
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(W - pad - penW, H / 2 - penH / 2, penW, penH);
  ctx.strokeRect(W - pad - 50, H / 2 - 70, 50, 140);
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 3;
  ctx.strokeRect(W - pad, H / 2 - 40, 14, 80);

  // Title
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(W / 2 - 140, 4, 280, 18);
  ctx.font = "bold 12px 'Space Grotesk', sans-serif";
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.textAlign = "center";
  ctx.fillText(matchTitle, W / 2, 16);

  // Draw players
  const drawTeam = (players: Player[], side: "left" | "right") => {
    const gk = players.filter(p => p.is_goalkeeper);
    const field = players.filter(p => !p.is_goalkeeper);

    const isLeft = side === "left";
    const startX = isLeft ? pad + 30 : W / 2 + 30;
    const endX = isLeft ? W / 2 - 30 : W - pad - 30;
    const teamColor = isLeft ? "#60a5fa" : "#f87171"; // blue-400 / red-400
    const gkColor = "#facc15"; // yellow-400

    const drawPlayer = (name: string, x: number, y: number, isGk: boolean) => {
      const color = isGk ? gkColor : teamColor;
      // Circle
      ctx.beginPath();
      ctx.arc(x, y, 18, 0, Math.PI * 2);
      ctx.fillStyle = color + "33";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      // Icon
      ctx.font = "14px serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(isGk ? "🥅" : "⚽", x, y - 2);
      // Name
      const short = name.length > 10 ? name.substring(0, 9) + "…" : name;
      ctx.font = "bold 10px 'Space Grotesk', sans-serif";
      ctx.fillStyle = "#ffffff";
      ctx.textBaseline = "top";
      ctx.fillText(short, x, y + 20);
    };

    // GK position
    gk.forEach((p, i) => {
      const gkX = isLeft ? pad + 45 : W - pad - 45;
      const gkY = H / 2 + (i - (gk.length - 1) / 2) * 60;
      drawPlayer(p.name, gkX, gkY, true);
    });

    // Field players — distribute in a rough 2-column grid
    if (field.length === 0) return;
    const cols = field.length <= 4 ? 1 : 2;
    const rows = Math.ceil(field.length / cols);
    const colWidth = (endX - startX) / cols;
    const rowHeight = (H - pad * 2 - 60) / (rows + 1);

    field.forEach((p, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + colWidth * col + colWidth / 2;
      const y = pad + 40 + rowHeight * (row + 1);
      drawPlayer(p.name, x, y, false);
    });
  };

  drawTeam(teamA, "left");
  drawTeam(teamB, "right");

  // Team labels
  ctx.font = "bold 13px 'Space Grotesk', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#60a5fa";
  ctx.fillText("Equipo A", W / 4, H - 8);
  ctx.fillStyle = "#f87171";
  ctx.fillText("Equipo B", (W * 3) / 4, H - 8);
}

export function TeamFieldImage({ teamA, teamB, matchTitle = "Parti2" }: TeamFieldImageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [generated, setGenerated] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!show || !canvasRef.current) return;
    drawField(canvasRef.current, teamA, teamB, matchTitle);
    setGenerated(true);
  }, [show, teamA, teamB, matchTitle]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = "equipos-parti2.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const handleShare = async () => {
    if (!canvasRef.current) return;
    canvasRef.current.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "equipos-parti2.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: matchTitle });
        } catch (err) {
          if (err instanceof Error && err.name !== "AbortError") {
            handleDownload();
          }
        }
      } else {
        handleDownload();
      }
    });
  };

  if (!show) {
    return (
      <button
        type="button"
        onClick={() => setShow(true)}
        className="mt-3 w-full rounded border border-emerald-500/50 bg-emerald-600/15 px-4 py-2 text-sm font-semibold text-emerald-400 transition hover:bg-emerald-600/25"
      >
        🏟️ Generar imagen del campo
      </button>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <canvas
        ref={canvasRef}
        width={700}
        height={480}
        className="w-full rounded-xl border border-border shadow-lg"
      />
      {generated && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Download className="size-4" />
            Descargar
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
          >
            <Share2 className="size-4" />
            Compartir
          </button>
          <button
            type="button"
            onClick={() => { setShow(false); setGenerated(false); }}
            className="rounded border border-border bg-muted px-3 py-2 text-sm text-muted-foreground hover:bg-secondary"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
