"use client";

import { useState } from "react";
import { MatchDetailsProvider, useMatchDetailsContext } from "@/contexts/MatchDetailsContext";
import { MatchInfoSidebar, MatchEditForm, MatchTabs, RegistrationPanel, PlayersPanel, UnregisterModal, TeamBuilder } from "@/components/match-details";
import { useMatchPricing } from "@/hooks/useMatchPricing";
import { useMatchEditing } from "@/hooks/useMatchEditing";

type PanelTab = "register" | "players" | "teams";

interface MatchDetailsInnerProps {
  matchId: string;
  openedFromFrecuentes?: boolean;
}

function MatchDetailsInner({ openedFromFrecuentes = false }: MatchDetailsInnerProps) {
  const { loading, error, matchData, isCreator } = useMatchDetailsContext();
  useMatchPricing();
  const editing = useMatchEditing();

  const [activeTab, setActiveTab] = useState<PanelTab>("register");
  const [showTeamBuilder, setShowTeamBuilder] = useState(false);

  if (loading) {
    return <div className="text-center py-8">Cargando detalles del partido…</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">{error}</div>;
  }

  if (!matchData) {
    return <div className="text-center py-8">No se encontró información del partido</div>;
  }

  if (!isCreator) {
    return (
      <div className="min-h-screen py-10 px-4 text-foreground">
        <div className="mx-auto w-full max-w-2xl">
          <div className="card match-card rounded-2xl border border-border/80 bg-card p-5 shadow-lg sm:p-6">
            <RegistrationPanel />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 text-foreground">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[320px_1fr]">
        <MatchInfoSidebar
          editing={editing}
          openedFromFrecuentes={openedFromFrecuentes}
          onOpenTeamBuilder={() => { setShowTeamBuilder(true); setActiveTab("teams"); }}
        />

        <section className="space-y-6">
          <MatchEditForm editing={editing} />

          <div className="card match-card rounded-2xl border border-border/80 bg-card p-5 shadow-lg sm:p-6">
            <MatchTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onOpenTeams={() => { setShowTeamBuilder(true); setActiveTab("teams"); }}
            />

            {activeTab === "register" && <RegistrationPanel />}
            {activeTab === "players" && <PlayersPanel />}
            {activeTab === "teams" && isCreator && (
              <TeamBuilder
                show={showTeamBuilder}
                onOpen={() => setShowTeamBuilder(true)}
              />
            )}
          </div>
        </section>

        <UnregisterModal />
      </div>
    </div>
  );
}

export default function MatchDetails({ matchId, openedFromFrecuentes = false }: { matchId: string; openedFromFrecuentes?: boolean }) {
  return (
    <MatchDetailsProvider matchId={matchId}>
      <MatchDetailsInner matchId={matchId} openedFromFrecuentes={openedFromFrecuentes} />
    </MatchDetailsProvider>
  );
}