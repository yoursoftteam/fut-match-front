"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MatchForm from "@/components/MatchForm";
import ShareLink from "@/components/ShareLink";
import { useAuth } from "@/hooks/useAuth";
import { useMatches } from "@/hooks/useMatches";

export default function CreateMatch() {
  const [createdMatch, setCreatedMatch] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { createMatch } = useMatches();
  const router = useRouter();

  const handleMatchCreate = async (data: any) => {
    if (!user) {
      setError("Debes iniciar sesión para crear un partido");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Map the form data to the database schema
      const matchData = {
        title: `Partido en ${data.location}`,
        location: data.location,
        date: `${data.date}T${data.time}:00`,
        max_players: data.totalPlayers,
        created_by: user.id,
      };

      const { data: newMatch, error: createError } = await createMatch(matchData);

      if (createError) {
        throw createError;
      }

      // Set the created match with the database response
      const fullMatchData = {
        ...data,
        id: newMatch.id,
        created_at: newMatch.created_at,
      };

      setCreatedMatch(fullMatchData);

      // Also store additional form data in localStorage for MatchDetails component
      try {
        const storedMatches = localStorage.getItem("matches");
        const matches = storedMatches ? JSON.parse(storedMatches) : [];
        // Add the new match with all form data
        matches.push({
          ...data,
          id: newMatch.id,
          created_at: newMatch.created_at,
        });
        localStorage.setItem("matches", JSON.stringify(matches));
      } catch (err) {
        console.error("Error saving match to localStorage", err);
      }

    } catch (err: any) {
      console.error("Error creating match:", err);
      setError(err.message || "Error al crear el partido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <header className="text-center mb-16 mt-8 fade-in-up">
          <h1 className="text-4xl md:text-5xl font-heading font-bold text-foreground mb-4 neon-text">FutMatch</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Crea partidos de fútbol y comparte con tus amigos
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="slide-in-left">
            <h2 className="section-title text-foreground">Crear Nuevo Partido</h2>
            
            {error && (
              <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                <p className="text-destructive text-sm">{error}</p>
              </div>
            )}
            
            {!user && (
              <div className="mb-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                <p className="text-yellow-600 text-sm">
                  Debes <a href="/auth?mode=signin" className="underline hover:text-yellow-700">iniciar sesión</a> para crear un partido.
                </p>
              </div>
            )}
            
            <MatchForm onMatchCreate={handleMatchCreate} disabled={!user || loading} />
          </div>

          <div className="slide-in-left">
            {createdMatch ? (
              <div className="card p-6 bg-card">
                <h2 className="text-2xl font-bold mb-6 text-center text-card-foreground">¡Partido Creado!</h2>
                <div className="space-y-4 mb-6">
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="font-medium text-muted-foreground">Lugar:</span>
                    <span className="text-card-foreground font-medium">{createdMatch.location}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="font-medium text-muted-foreground">Fecha:</span>
                    <span className="text-card-foreground font-medium">{createdMatch.date}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="font-medium text-muted-foreground">Hora:</span>
                    <span className="text-card-foreground font-medium">{createdMatch.time}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="font-medium text-muted-foreground">Formato:</span>
                    <span className="text-card-foreground font-medium">{createdMatch.playersPerTeam} vs {createdMatch.playersPerTeam}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3">
                    <span className="font-medium text-muted-foreground">Aporte por jugador:</span>
                    <span className="font-bold text-primary text-xl">
                      ${createdMatch.costPerPlayer.toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <button
                    onClick={() => router.push(`/match/${createdMatch.id}`)}
                    className="w-full btn btn-primary"
                  >
                    Ver Detalles del Partido
                  </button>
                  
                  <ShareLink matchId={createdMatch.id} />
                </div>
              </div>
            ) : (
              <div className="card p-8 text-center h-full flex flex-col justify-center bg-card">
                <h3 className="text-xl font-semibold text-card-foreground mb-6">
                  ¿Cómo funciona?
                </h3>
                <ul className="text-left space-y-4 text-muted-foreground">
                  <li className="flex items-start">
                    <span className="text-primary mr-3 mt-1">✓</span>
                    <span>Completa el formulario con los detalles del partido</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-3 mt-1">✓</span>
                    <span>Recibirás un enlace único para compartir</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-3 mt-1">✓</span>
                    <span>Tus amigos pueden registrarse con sus cuentas</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-primary mr-3 mt-1">✓</span>
                    <span>El sistema calcula automáticamente el costo por jugador</span>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}